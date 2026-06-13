# Local Dev Quickstart (Windows + Neon)

Use this when running SURNA locally without Docker/Replit.

## 1) Set environment

Create `.env` in project root and set at minimum:

- `DATABASE_URL` (Neon Postgres URL)
- `LOCAL_AUTH_BYPASS=1`
- `REPLIT_DOMAINS=localhost`
- `NODE_ENV=development`
- `SESSION_SECRET=<any long random string>`
- `STRIPE_SECRET_KEY=<test placeholder is fine for local>`

## 2) Install deps

```powershell
npm install
```

## 3) Prepare DB schema

```powershell
npm run db:setup:local
```

This command:
- generates migrations,
- applies migrations,
- adds compatibility tables/columns needed by current runtime queries.

## 4) Start app

```powershell
npm run dev
```

Open:
- App: `http://localhost:5000`
- Vite frontend (if needed): `http://localhost:5173`

## Notes

- Login aliases are wired (`/login`, `/signin`, `/auth/login`).
- If auth hangs, query client has request timeouts and should fail fast.
- Redis is optional in local mode.

## Phone / installed app

**Add to Home Screen (PWA) from a tunnel link** — that shortcut only works while that link is live. When the tunnel stops (PC off, Cursor closed, terminal closed), the icon opens a dead page. Run `npm run phone:go` again and open the **new** URL, or reinstall from the fresh link.

**Native Capacitor app (Android/iOS)** — the installed APK does not include your backend. For local testing, start the server, run `npm run phone:go`, copy the `trycloudflare.com` URL, then:

```powershell
$env:CAPACITOR_SERVER_URL="https://YOUR-URL.trycloudflare.com"
npm run cap:sync
```

Rebuild/install the app in Android Studio. For a app that works without your PC, deploy SURNA to a host (Railway, Render, etc.) and set `CAPACITOR_SERVER_URL` to that production URL.

**Cursor can be closed** — you only need a terminal running `npm run dev` or `npm run phone:go` on your PC. The PC must stay on and online for phone testing; closing Cursor alone is fine if the server keeps running.
