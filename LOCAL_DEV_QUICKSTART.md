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
