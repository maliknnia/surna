# Deploy SURNA on Railway

Your code is on GitHub: **https://github.com/maliknnia/surna**

## 1. Create the project

1. Open [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → choose **maliknnia/surna**.
3. Railway reads `railway.toml` and runs `npm ci && npm run build`, then `npm start`.

## 2. Add PostgreSQL

1. In the project, click **+ New** → **Database** → **PostgreSQL**.
2. Open the Postgres service → **Variables** → copy `DATABASE_URL`.
3. Open the **Surna web service** → **Variables** → add reference:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (use Railway’s variable reference UI)

## 3. Required environment variables (web service)

Set these on the **Surna app service** (not Postgres):

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Reference from Postgres plugin |
| `SESSION_SECRET` | Random string, **32+ characters** |
| `JWT_SECRET` | Random string, **32+ characters** |
| `JWT_ACCESS_SECRET` | Same as JWT_SECRET or another 32+ char secret |
| `JWT_REFRESH_SECRET` | Another 32+ char secret |
| `LOCAL_AUTH_BYPASS` | `0` (or leave unset) |
| `USE_REPLIT_AUTH` | `0` |

**Optional but recommended**

| Variable | Notes |
|----------|--------|
| `VITE_STRIPE_PUBLIC_KEY` | Needed at **build** time for checkout UI |
| `STRIPE_SECRET_KEY` | Payments |
| `VITE_MAPTILER_KEY` | Map tiles |
| `REDIS_URL` | Sessions/cache (Railway Redis plugin) |

Railway sets `RAILWAY_PUBLIC_DOMAIN` automatically when you add a public URL — you do **not** need `FRONTEND_ORIGIN` if the domain is generated.

Generate secrets (PowerShell):

```powershell
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

Run twice for `SESSION_SECRET` and `JWT_SECRET`.

## 4. Public URL

1. Open the **web service** → **Settings** → **Networking** → **Generate Domain**.
2. You’ll get something like `https://surna-production.up.railway.app`.
3. Redeploy if the first deploy failed before the domain existed.

## 5. Database migrations (once after first deploy)

1. Web service → **Settings** → ensure deploy succeeded.
2. Open the **Railway shell** for the web service (or use Railway CLI).
3. Run:

```bash
npm run db:migrate
```

If migrations fail, try `npm run db:push` once (dev-style push; prefer migrate for production).

## 6. Use on your phone (no PC required)

**Browser / PWA**

- Open your Railway URL on the phone.
- **Add to Home Screen** — it keeps working because the server is always online.

**Installed Android app (Capacitor)**

```powershell
$env:CAPACITOR_SERVER_URL="https://YOUR-APP.up.railway.app"
npm run cap:sync
```

Rebuild the APK in Android Studio and install.

## 7. Auth on production

- Users **register / log in** via the app (`/api/auth/register`, `/api/auth/login`).
- Optional: configure **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- Do **not** use `/api/login?dev=1` in production.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check **Deploy logs**; set `VITE_*` vars before rebuild if Stripe/map errors appear at build time |
| 503 on `/api/ping` | Postgres not linked — fix `DATABASE_URL` |
| CORS / login loops | Regenerate domain; ensure `LOCAL_AUTH_BYPASS=0` |
| App sleeps on free tier | Upgrade plan or rely on built-in keep-alive ping |

## Cursor / PC

After Railway is live, **Cursor can be closed**. The app runs on Railway’s servers, not your PC.
