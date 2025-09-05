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
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('Missing env. Expected STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI in apps/api/.env');
  process.exit(1);
}

const PORT = Number(process.env.PORT || 8787);

// ---- health ----
app.get('/healthz', (_req, res) => res.json({ ok: true }));

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

// ---- export: CSV summary (zip) ----
app.post('/api/export/csv', async (req, res) => {
  try {
    const { athleteId, startDate, endDate, includeOnlyMileage } = req.body as {
      athleteId: string;
      startDate: string; // "YYYY-MM-DD"
      endDate: string;   // "YYYY-MM-DD",
      includeOnlyMileage?: boolean;
    };
    if (!athleteId || !startDate || !endDate) {
      return res.status(400).json({ error: 'athleteId, startDate, endDate are required' });
    }

    const token = await withFreshToken(athleteId);
    const after = dayjs.utc(startDate).startOf('day').unix();
    const before = dayjs.utc(endDate).endOf('day').unix();

    let page = 1;
    const activities: any[] = [];
    while (true) {
      const { data, headers } = await axios.get(`${API}/athlete/activities`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
        params: { after, before, per_page: 200, page },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      if(includeOnlyMileage){
      //filter out activities with zero distance!
        const distanceData = data.filter(a => a.distance > 0)
        activities.push(...distanceData);
      }else{
        activities.push(...data)
      }
      
      page++;

      // gentle back-off if we're chewing the short window
      const used = headers['x-ratelimit-usage'] || headers['x-readratelimit-usage'];
      if (used) {
        const [shortUsed] = String(used).split(',').map(Number);
        if (shortUsed && shortUsed > 90) await new Promise(r => setTimeout(r, 1200));
      }
    }

    // CSV Options
    // map strava activity fields
    // map apple activity fields
    // map garmin activity fields
    // map generic fields
    // filter by type (run, ride, walk, etc)
    // filter by distance (non-zero, min, max, etc)
    // filter by time (moving time, elapsed time, etc)

    const mapType = (t: string) => {
        if (t === 'Run' || t === 'VirtualRun') return 'Run';
        if (t === 'Ride' || t === 'EBikeRide' || t === 'VirtualRide' 
            || t === 'Velomobile' || t === 'Wheelchair' || t === 'InlineSkate' 
            || t === 'RollerSki' || t === 'Hnadcycle') return 'Roll';
        return 'Walk';
    }
    
    const secondsFormatted = (secs: number):string => {
        const secondsInHour = 3600;
        const secondsInMinute = 60
        const hours = Math.floor(secs / secondsInHour);
        const remainingSeconds = secs % secondsInHour;
        const minutes = Math.floor(remainingSeconds / secondsInMinute);
        const seconds = remainingSeconds % secondsInMinute;
        const formatter = (n:number) => n.toString().padStart(2, '0');

        return `${formatter(hours)}:${formatter(minutes)}:${formatter(seconds)}`;
    }
    // CSV
    const rows = activities.map(a => ({
      Comment: a.name,
      'Activity Type': mapType(a.type),
      'Activity Date': dayjs(a.start_date).format('YYYY-MM-DD'),
      'Activity Time': secondsFormatted(a.moving_time), // seconds
      'Distance in Miles': a.distance*0.00062137, // meters

    }));
    const header = Object.keys(rows[0] ?? { id: '', name: '' });
    const csv = [
      header.join(','),
      ...rows.map(r => header.map(k => (r as any)[k]).join(',')),
    ].join('\n');

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

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
