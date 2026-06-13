# Deploy SURNA on Railway (minimal)

Repo: **https://github.com/maliknnia/surna**

## You only need 3 things

1. **Postgres** — `+ New` → **Database** → **PostgreSQL**
2. **Link DB** — on the web service **Variables** → reference **`DATABASE_URL`** from Postgres
3. **Public URL** — web service **Settings** → **Networking** → **Generate Domain**

`NODE_ENV=production` and build vars are already in **`railway.toml`**.

**Auth secrets** (`SESSION_SECRET`, `JWT_*`) are **auto-generated on first boot** on Railway if you leave them empty. Replace them with your own random strings later — not required to get running.

## Order that works

1. Add Postgres
2. Link `DATABASE_URL` on the web service
3. **Generate Domain** (so `RAILWAY_PUBLIC_DOMAIN` exists)
4. Redeploy

## After first green deploy

In the Railway shell (once):

```bash
npm run db:migrate
```

Open `https://YOUR-APP.up.railway.app/api/ping` → should be `{"ok":true}`.

Register a normal account in the app (no dev login on production).

## Optional later

| Variable | Why |
|----------|-----|
| `SESSION_SECRET` / `JWT_SECRET` | Your own random secrets (32+ chars) |
| `VITE_MAPTILER_KEY` | Map tiles |
| `STRIPE_SECRET_KEY` | Real payments |

## Don't want to pay Railway?

Railway’s free trial runs out — that’s their billing, not something the app controls.

**Free options that still work:**

- **Phone testing (no deploy):** on your PC run `npm run phone:go` — free tunnel while the PC is on
- **Same Wi‑Fi:** `http://YOUR-PC-IP:5000` with `npm run dev`
- **Other hosts:** Render / Fly.io free tiers (same repo, different dashboard)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Crashes on `viteDev` | Set `NODE_ENV=production` in Variables |
| Missing secrets error | Redeploy latest code — bootstrap fills secrets on Railway |
| FRONTEND_ORIGIN error | Generate public domain first, then redeploy |
| 503 on `/api/ping` | Postgres not linked |
| Build fails on Stripe | `VITE_STRIPE_PUBLIC_KEY=pk_test_placeholder` (already in railway.toml) |
