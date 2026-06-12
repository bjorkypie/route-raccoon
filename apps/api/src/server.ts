import * as path from 'path';
import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dayjs from 'dayjs';
import JSZip from 'jszip';
import crypto from 'crypto';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

dotenv.config()

// ---- types & simple stores (swap to DB later) ----
type TokenBundle = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  athlete: { id: number; username?: string };
  scope?: string;
};

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  workout_type?: number | null;
  distance: number;
  moving_time: number;
  start_date: string;
  commute?: boolean;
};

type ExportRequestBody = {
  athleteId: string;
  startDate: string;
  endDate: string;
  includeOnlyMileage?: boolean;
  commuteOnly?: boolean;
  activityTypes?: string[];
  includeTotalsRow?: boolean;
};

type ExportSummary = {
  activityCount: number;
  totalDistanceMiles: number;
  totalMovingTimeSeconds: number;
  totalsByType: Array<{
    type: string;
    activityCount: number;
    totalDistanceMiles: number;
    totalMovingTimeSeconds: number;
  }>;
};

const tokenStore = new Map<string, TokenBundle>();
const stateStore = new Set<string>(); // CSRF state for dev

// ---- config ----
const app = express();
app.use(express.json());
// Allow local dev and the configured frontend origin in production
const allowedOrigins = [
  'http://localhost:5173',
  (process.env.FRONTEND_ORIGIN || '').trim(),
].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: false }));

const STRAVA_AUTH = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN = 'https://www.strava.com/api/v3/oauth/token';
const API = 'https://www.strava.com/api/v3';

const CLIENT_ID = (process.env.STRAVA_CLIENT_ID || '').trim();
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI!;
const WEBHOOK_VERIFY_TOKEN = (process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || '').trim();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('Missing env. Expected STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI in apps/api/.env');
  process.exit(1);
}
if (!WEBHOOK_VERIFY_TOKEN) {
  console.warn('[warn] STRAVA_WEBHOOK_VERIFY_TOKEN not set. Webhook validation will fail until this is configured.');
}

const PORT = Number(process.env.PORT || 8787);

// ---- health ----
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ---- auth: status ----
// Lightweight check used by frontend to verify a locally stored athleteId is still valid.
// Returns { authenticated: boolean, expiresAt?: number }
app.get('/api/auth/status', (req, res) => {
  const athleteId = String(req.query.athleteId || '').trim();
  if (!athleteId) return res.json({ authenticated: false });
  const t = tokenStore.get(athleteId);
  if (!t) return res.json({ authenticated: false });
  const now = Math.floor(Date.now() / 1000);
  if (t.expires_at <= now) return res.json({ authenticated: false, expiresAt: t.expires_at });
  return res.json({ authenticated: true, expiresAt: t.expires_at });
});

// ---- auth: login ----
app.get('/api/auth/login', (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.add(state);
  const scope = ['read', 'activity:read', 'activity:read_all'].join(',');
  const url = new URL(STRAVA_AUTH);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

// ---- auth: callback ----
app.get('/api/auth/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code || !state || !stateStore.has(state)) {
    return res.status(400).send('Invalid OAuth state or missing code');
  }
  stateStore.delete(state);

  const form = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    })
  const { data } = await axios.post<TokenBundle>(
    STRAVA_TOKEN, 
    form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const key = String(data.athlete.id);
    const username = data.athlete.username || `athlete${data.athlete.id}`;
    console.log(`Auth success: ${username} (${key}), token expires at ${new Date(data.expires_at * 1000).toISOString()}`);
    tokenStore.set(key, data);


   res.redirect(`${FRONTEND_ORIGIN}/auth/success#athleteId=${encodeURIComponent(key)}&expiresAt=${data.expires_at}&username=${encodeURIComponent(username)}`);
});

// ---- token refresh helper ----
async function withFreshToken(athleteId: string): Promise<TokenBundle> {
  const t = tokenStore.get(athleteId);
  if (!t) throw new Error('Not authenticated');
  const now = Math.floor(Date.now() / 1000);
  if (t.expires_at - now > 60) return t; // still valid
  const form = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: t.refresh_token,
  })
  const { data } = await axios.post<Pick<TokenBundle, 'access_token' | 'refresh_token' | 'expires_at'>>(
    STRAVA_TOKEN, 
    form.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  const updated = { ...t, ...data };
  tokenStore.set(athleteId, updated);
  return updated;
}

const csvHeaders = [
  'Activity ID',
  'Comment',
  'Activity Type',
  'Strava Type',
  'Sport Type',
  'Workout Type',
  'Commute',
  'Activity Date',
  'Activity Time',
  'Distance in Miles',
] as const;

const milesFromMeters = (meters: number): number => Number((meters * 0.00062137).toFixed(2));

const mapActivityType = (t: string) => {
  if (t === 'Run' || t === 'VirtualRun') return 'Run';
  if (
    t === 'Ride' ||
    t === 'EBikeRide' ||
    t === 'VirtualRide' ||
    t === 'Velomobile' ||
    t === 'Wheelchair' ||
    t === 'InlineSkate' ||
    t === 'RollerSki' ||
    t === 'Handcycle'
  ) {
    return 'Roll';
  }
  return 'Walk';
};

const secondsFormatted = (secs: number): string => {
  const secondsInHour = 3600;
  const secondsInMinute = 60;
  const hours = Math.floor(secs / secondsInHour);
  const remainingSeconds = secs % secondsInHour;
  const minutes = Math.floor(remainingSeconds / secondsInMinute);
  const seconds = remainingSeconds % secondsInMinute;
  const formatter = (n: number) => n.toString().padStart(2, '0');

  return `${formatter(hours)}:${formatter(minutes)}:${formatter(seconds)}`;
};

const csvEscape = (value: string | number): string => {
  const stringValue = String(value ?? '');
  if (!/[",\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
};

async function fetchActivitiesForExport(
  athleteId: string,
  startDate: string,
  endDate: string,
  includeOnlyMileage = false,
  commuteOnly = false,
  activityTypes: string[] = []
): Promise<StravaActivity[]> {
  const token = await withFreshToken(athleteId);
  const after = dayjs.utc(startDate).startOf('day').unix();
  const before = dayjs.utc(endDate).endOf('day').unix();
  const selectedTypes = new Set(activityTypes.filter(Boolean));

  let page = 1;
  const activities: StravaActivity[] = [];
  while (true) {
    const { data, headers } = await axios.get(`${API}/athlete/activities`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      params: { after, before, per_page: 200, page },
    });
    if (!Array.isArray(data) || data.length === 0) break;

    const filtered = data.filter((activity: StravaActivity) => {
      if (includeOnlyMileage && activity.distance <= 0) return false;
      if (commuteOnly && !activity.commute) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(activity.type)) return false;
      return true;
    });

    activities.push(...filtered);
    page++;

    const used = headers['x-ratelimit-usage'] || headers['x-readratelimit-usage'];
    if (used) {
      const [shortUsed] = String(used).split(',').map(Number);
      if (shortUsed && shortUsed > 90) await new Promise(r => setTimeout(r, 1200));
    }
  }

  return activities;
}

function buildExportSummary(activities: StravaActivity[]): ExportSummary {
  const totals = new Map<string, ExportSummary['totalsByType'][number]>();

  for (const activity of activities) {
    const total = totals.get(activity.type) ?? {
      type: activity.type,
      activityCount: 0,
      totalDistanceMiles: 0,
      totalMovingTimeSeconds: 0,
    };
    total.activityCount += 1;
    total.totalDistanceMiles += milesFromMeters(activity.distance);
    total.totalMovingTimeSeconds += activity.moving_time;
    totals.set(activity.type, total);
  }

  const totalDistanceMiles = Number(
    activities.reduce((sum, activity) => sum + milesFromMeters(activity.distance), 0).toFixed(2)
  );
  const totalMovingTimeSeconds = activities.reduce((sum, activity) => sum + activity.moving_time, 0);

  return {
    activityCount: activities.length,
    totalDistanceMiles,
    totalMovingTimeSeconds,
    totalsByType: Array.from(totals.values())
      .map(total => ({
        ...total,
        totalDistanceMiles: Number(total.totalDistanceMiles.toFixed(2)),
      }))
      .sort((left, right) => right.totalDistanceMiles - left.totalDistanceMiles),
  };
}

function buildCsvRows(activities: StravaActivity[], includeTotalsRow = false) {
  const rows = activities.map(activity => ({
    'Activity ID': String(activity.id),
    Comment: activity.name,
    'Activity Type': mapActivityType(activity.type),
    'Strava Type': activity.type,
    'Sport Type': activity.sport_type ?? '',
    'Workout Type': activity.workout_type ?? '',
    Commute: activity.commute ? 'yes' : 'no',
    'Activity Date': dayjs(activity.start_date).format('YYYY-MM-DD'),
    'Activity Time': secondsFormatted(activity.moving_time),
    'Distance in Miles': milesFromMeters(activity.distance),
  }));

  if (includeTotalsRow) {
    const summary = buildExportSummary(activities);
    rows.push({
      'Activity ID': '',
      Comment: 'TOTAL',
      'Activity Type': `${summary.activityCount} activities`,
      'Strava Type': '',
      'Sport Type': '',
      'Workout Type': '',
      Commute: '',
      'Activity Date': '',
      'Activity Time': secondsFormatted(summary.totalMovingTimeSeconds),
      'Distance in Miles': summary.totalDistanceMiles,
    });
  }

  return rows;
}

function buildCsv(rows: ReturnType<typeof buildCsvRows>) {
  return [
    csvHeaders.join(','),
    ...rows.map(row => csvHeaders.map(header => csvEscape(row[header])).join(',')),
  ].join('\n');
}

app.post('/api/export/summary', async (req, res) => {
  try {
    const { athleteId, startDate, endDate, includeOnlyMileage, commuteOnly, activityTypes } = req.body as ExportRequestBody;
    if (!athleteId || !startDate || !endDate) {
      return res.status(400).json({ error: 'athleteId, startDate, endDate are required' });
    }

    const activities = await fetchActivitiesForExport(
      athleteId,
      startDate,
      endDate,
      includeOnlyMileage,
      commuteOnly,
      activityTypes
    );

    res.json({
      startDate,
      endDate,
      summary: buildExportSummary(activities),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'summary failed' });
  }
});

// ---- export: CSV summary (zip) ----
app.post('/api/export/csv', async (req, res) => {
  try {
    const { athleteId, startDate, endDate, includeOnlyMileage, commuteOnly, activityTypes, includeTotalsRow } = req.body as ExportRequestBody;
    if (!athleteId || !startDate || !endDate) {
      return res.status(400).json({ error: 'athleteId, startDate, endDate are required' });
    }

    const activities = await fetchActivitiesForExport(
      athleteId,
      startDate,
      endDate,
      includeOnlyMileage,
      commuteOnly,
      activityTypes
    );
    const csv = buildCsv(buildCsvRows(activities, includeTotalsRow));

    const zip = new JSZip();
    zip.file(`summary_${startDate}_${endDate}.csv`, csv);
    const content = await zip.generateAsync({ type: 'nodebuffer' });

    const fname = `strava_export_${startDate}_${endDate}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(content);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'export failed' });
  }
});

// ---- export: GPX (zip) ----
// download streams and convert to GPX

// ---- Strava Webhook Endpoint ----
// Validation (GET) + Event ingestion (POST)
// Docs: https://developers.strava.com/docs/webhooks/
// Subscription creation requires your server to answer the validation GET within 2s with JSON { "hub.challenge": "..." }

type StravaWebhookEvent = {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  updates?: Record<string, any>;
  owner_id: number;
  subscription_id: number;
  event_time: number; // epoch seconds
};

// simple ring buffer for recent events (debug / future processing)
const recentEvents: StravaWebhookEvent[] = [];
const pushEvent = (e: StravaWebhookEvent) => {
  recentEvents.push(e);
  while (recentEvents.length > 100) recentEvents.shift();
};

// simple activity cache (per athlete -> map of activity id -> summary)
const activityCache = new Map<string, Map<number, any>>();

async function fetchAndCacheActivity(athleteId: string, activityId: number) {
  try {
    const token = await withFreshToken(athleteId);
    const { data } = await axios.get(`${API}/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      params: { include_all_efforts: false },
    });
    let athleteMap = activityCache.get(athleteId);
    if (!athleteMap) { athleteMap = new Map(); activityCache.set(athleteId, athleteMap); }
    athleteMap.set(activityId, data);
    // keep only 50 recent cached per athlete
    if (athleteMap.size > 50) {
      const iter = athleteMap.keys().next();
      if (!iter.done) athleteMap.delete(iter.value);
    }
    console.log(`Cached activity ${activityId} for athlete ${athleteId} (type=${data?.type}, private=${data?.private})`);
  } catch (err: any) {
    // Common cases: activity deleted, privacy changed so we lost access, rate limit.
    console.warn(`Failed to fetch activity ${activityId} for athlete ${athleteId}: ${err?.response?.status || ''} ${err?.message}`);
  }
}

// GET validation
app.get('/api/strava/webhook', (req, res) => {
  const mode = String(req.query['hub.mode'] || '');
  const challenge = String(req.query['hub.challenge'] || '');
  const verify = String(req.query['hub.verify_token'] || '');
  if (mode !== 'subscribe') return res.status(400).json({ error: 'invalid_mode' });
  if (!WEBHOOK_VERIFY_TOKEN || verify !== WEBHOOK_VERIFY_TOKEN) {
    return res.status(403).json({ error: 'verify_token_mismatch' });
  }
  if (!challenge) return res.status(400).json({ error: 'missing_challenge' });
  return res.json({ 'hub.challenge': challenge });
});

// POST events
app.post('/api/strava/webhook', (req, res) => {
  const body = req.body as StravaWebhookEvent | undefined;
  if (!body || !body.object_type || !body.aspect_type) {
    // acknowledge anyway to stop retries; log for debugging
    console.warn('Received malformed webhook event', body);
    return res.status(200).json({ received: false });
  }
  try {
    pushEvent(body);
    // Handle deauthorization: athlete update with authorized=false
    if (body.object_type === 'athlete' && body.aspect_type === 'update' && body.updates && body.updates.authorized === 'false') {
      const key = String(body.object_id);
      if (tokenStore.has(key)) {
        tokenStore.delete(key);
        console.log(`Webhook: athlete ${key} deauthorized app -> tokens purged`);
      }
    }
    // For activity create/update/delete you might enqueue a fetch for details here.
    if (body.object_type === 'activity') {
      console.log(`Webhook activity event: ${body.aspect_type} id=${body.object_id} owner=${body.owner_id}`);
      const athleteId = String(body.owner_id);
      // privacy change signal (update with updates.private) when we have read_all scope
      if (body.aspect_type === 'update' && body.updates && Object.prototype.hasOwnProperty.call(body.updates, 'private')) {
        console.log(`Privacy change for activity ${body.object_id}: now private=${body.updates.private}`);
      }
      if (body.aspect_type === 'delete') {
        const athleteMap = activityCache.get(athleteId);
        if (athleteMap && athleteMap.has(body.object_id)) {
          athleteMap.delete(body.object_id);
          console.log(`Removed cached activity ${body.object_id} after delete event.`);
        }
      } else if (body.aspect_type === 'create' || body.aspect_type === 'update') {
        // fetch asynchronously (non-blocking)
        setImmediate(() => fetchAndCacheActivity(athleteId, body.object_id));
      }
    }
  } catch (err) {
    console.error('Error processing webhook event', err);
  }
  // Must respond within 2s regardless of processing outcome.
  return res.status(200).json({ received: true });
});

// (Optional) debug endpoint (disable or protect in production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/strava/webhook/events', (_req, res) => {
    res.json({ events: recentEvents });
  });
}

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
