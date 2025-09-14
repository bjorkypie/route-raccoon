# Strava Webhook Integration

This API implements the Strava Webhook Events API so the app can:

* Detect athlete deauthorization (and purge stored tokens).
* Avoid polling for new activities (listen to `create` events).
* React to activity updates (`update` events) including privacy changes.
* Remove cached activity data on `delete` events.

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/strava/webhook` | Validation handshake (responds with `{ "hub.challenge": "..." }`). |
| POST | `/api/strava/webhook` | Receives webhook events. Always returns 200 quickly. |
| GET | `/api/strava/webhook/events` (non‑prod only) | Debug: shows last 100 received events. |

## Environment Variables

Add to `apps/api/.env` (never commit secrets):

```
STRAVA_CLIENT_ID=xxxxx
STRAVA_CLIENT_SECRET=xxxxx
STRAVA_REDIRECT_URI=https://your-domain/api/auth/callback
STRAVA_WEBHOOK_VERIFY_TOKEN=somelongrandomstring
FRONTEND_ORIGIN=https://your-frontend
```

`STRAVA_WEBHOOK_VERIFY_TOKEN` must match the `verify_token` sent when creating the subscription.

## Creating a Subscription

You only need one subscription per Strava application.

1. Ensure your deployed server is publicly reachable at `https://your-domain/api/strava/webhook`.
2. Send a create request (form-encoded) to Strava:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=$STRAVA_CLIENT_ID \
  -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=https://your-domain/api/strava/webhook \
  -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
```

3. Strava will immediately perform a GET to your callback with query params `hub.mode=subscribe`, `hub.challenge=...`, `hub.verify_token=...`.
4. Our endpoint validates the token and returns the JSON body echoing the challenge.
5. Strava returns the subscription id to the original POST request.

### View Existing Subscription
```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=$STRAVA_CLIENT_ID \
  -d client_secret=$STRAVA_CLIENT_SECRET
```

### Delete Subscription
```bash
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/<id>?client_id=$STRAVA_CLIENT_ID&client_secret=$STRAVA_CLIENT_SECRET"
```

## Event Handling Logic

* Athlete deauth: `object_type=athlete`, `updates.authorized = "false"` -> remove tokens.
* Activity create/update: enqueue a background fetch (`/activities/{id}`) to cache a summary (non-blocking).
* Activity delete: remove cached entry if present.
* Privacy change: update event with `updates.private` key logged.

All heavy work should be offloaded / queued; current implementation uses `setImmediate` for simplicity.

## Local Testing

Simulate validation:
```bash
curl "http://localhost:8787/api/strava/webhook?hub.mode=subscribe&hub.verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN&hub.challenge=test123"
```
Expect: `{ "hub.challenge": "test123" }`.

Simulate event:
```bash
curl -X POST http://localhost:8787/api/strava/webhook \
  -H 'Content-Type: application/json' \
  -d '{"object_type":"activity","object_id":123,"aspect_type":"create","owner_id":456,"subscription_id":1,"event_time":'$(date +%s)'}'
```

View debug buffer (dev only):
```bash
curl http://localhost:8787/api/strava/webhook/events
```

## Next Steps / Hardening

* Persist tokens and event processing state in a real database.
* Add a job/queue system (BullMQ, etc.) for fetches.
* Handle Strava rate limiting (inspect `x-ratelimit-usage`).
* Add signature validation if Strava adds it in the future (currently none).
* Implement retry / dead letter handling for transient failures.
* Expose metrics / health indicators for webhook throughput.

---
Refer to Strava docs for details: https://developers.strava.com/docs/webhooks/
