Deploying Route Raccoon

Overview
- Monorepo layout: `apps/api` (backend) + `apps/web` (frontend).
- Deploy API to Heroku. Deploy Web to Netlify. Keep in one repo.
- Secrets live in the platforms, not in `.env` committed to git.

Prerequisites
- Node 18+ and npm
- Heroku CLI: `brew tap heroku/brew && brew install heroku && heroku login`
- Netlify CLI (optional for local deploy): `npm i -g netlify-cli && netlify login`
- Strava App credentials (Client ID, Client Secret). Set the callback to your Heroku URL.

Repo Notes
- Root `Procfile` runs the API: `web: npm run -w apps/api start` (Procfile:1)
- API builds to `dist` and starts with `node dist/server.js` (apps/api/package.json)
- Root `heroku-postbuild` builds the API workspace (package.json)
- CORS allows `http://localhost:5173` and `FRONTEND_ORIGIN` (apps/api/src/server.ts)

Part 1 — Deploy the API to Heroku (from local)
1) Initialize git if needed
   - `git init`
   - `git add .`
   - `git commit -m "init"`

2) Create a Heroku app and set Node buildpack
   - `heroku create your-api-app`
   - `heroku buildpacks:set heroku/nodejs -a your-api-app`

3) Configure environment variables (replace placeholders)
   - `heroku config:set STRAVA_CLIENT_ID=your-id -a your-api-app`
   - `heroku config:set STRAVA_CLIENT_SECRET=your-secret -a your-api-app`
   - `heroku config:set STRAVA_REDIRECT_URI=https://your-api-app.herokuapp.com/api/auth/callback -a your-api-app`
   - For initial testing with local web: `heroku config:set FRONTEND_ORIGIN=http://localhost:5173 -a your-api-app`

4) Deploy
   - If your current branch isn’t named `main`: `git push heroku HEAD:main`
   - If it is `main`: `git push heroku main`
   - Start a dyno: `heroku ps:scale web=1 -a your-api-app`

5) Verify
   - `curl https://your-api-app.herokuapp.com/healthz` → should return `{ "ok": true }`
   - Watch logs if needed: `heroku logs -t -a your-api-app`

Part 2 — Deploy the Web to Netlify
Option A: From local using CLI
1) Initialize/link the site
   - From repo root: `netlify init` → Create & configure a new site
   - When prompted:
     - Build command: `npm run -w apps/web build`
     - Publish directory: `apps/web/dist`

2) Point the frontend at your API
   - `netlify env:set VITE_API_BASE https://your-api-app.herokuapp.com`

3) Deploy
   - `netlify deploy --build --prod`
   - Note the live URL (e.g., `https://your-site.netlify.app`)

Option B: From GitHub (after pushing your repo)
1) Push to GitHub
   - `git remote add origin https://github.com/you/route-raccoon.git`
   - `git push -u origin main`

2) Netlify UI → Add new site → Import from Git
   - Base directory: leave empty (root)
   - Build command: `npm run -w apps/web build`
   - Publish directory: `apps/web/dist`
   - Environment variable: `VITE_API_BASE=https://your-api-app.herokuapp.com`

Finish — Connect Both Ends
1) Update API CORS to your Netlify origin
   - `heroku config:set FRONTEND_ORIGIN=https://your-site.netlify.app -a your-api-app`

2) Update Strava App settings
   - Authorization Callback Domain: `your-api-app.herokuapp.com`
   - We pass the full path via `STRAVA_REDIRECT_URI` set above.

3) Test end-to-end
   - Open your Netlify site → Sign in with Strava → return to app
   - Export a date range; a ZIP should download.

Local Development
- Start both apps: `npm run dev` (root script runs API and Web)
- Web uses `VITE_API_BASE` if set; else defaults to `http://localhost:8787`.
- API listens on `PORT` (defaults to 8787) and allows `http://localhost:5173` CORS.

Troubleshooting
- CORS error in browser
  - Ensure `FRONTEND_ORIGIN` exactly matches your Netlify URL including `https://`.

- Strava redirect error
  - Check `STRAVA_REDIRECT_URI` in Heroku matches `https://your-api-app.herokuapp.com/api/auth/callback`.
  - Ensure Strava app has the correct callback domain.

- Heroku H10 / app crashed
  - Run `heroku logs -t -a your-api-app`.
  - Confirm env vars are set and build succeeded (heroku-postbuild builds `apps/api`).

- No activities or auth lost after restart
  - The API stores tokens in memory; dyno restarts clear them. Re-login is required.

Optional Netlify config (if you prefer a file)
You can add a `netlify.toml` at the repo root:

```toml
[build]
  command = "npm run -w apps/web build"
  publish = "apps/web/dist"
```

Then set `VITE_API_BASE` in Netlify UI/CLI and deploy.

