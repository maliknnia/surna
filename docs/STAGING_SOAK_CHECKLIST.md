# Staging soak checklist — up to 100k concurrent VUs

Use this when validating SURNA on **Autoscale staging** before claiming production capacity. Local `npm run test:load:stress` proves the app does not crash on one machine; this checklist proves **multi-instance + Redis + Neon** behavior.

## Before you run

### 1. Staging deploy

- [ ] Deploy to Replit **Autoscale** (not static).
- [ ] **Max instances ≥ 2** (required to verify Socket.IO Redis fan-out).
- [ ] `NODE_ENV=production`, `LOCAL_AUTH_BYPASS=0`, `PRO_ENTITLEMENT_OPEN=0`.
- [ ] **`REDIS_URL`** set (Socket.IO adapter + rate-limit store + BullMQ).
- [ ] **`JWT_SECRET`** and **`SESSION_SECRET`** match what you pass to the load runner.
- [ ] **`DB_POOL_MAX`** sized per [SCALING.md](./SCALING.md) (e.g. 25–60 for 4 instances on Neon Scale).
- [ ] Use Neon **pooled** connection string if `DB_POOL_MAX × instances` nears plan limit.

### 2. Install k6 on the load generator

- [k6 installation](https://k6.io/docs/get-started/installation/)
- Windows: `choco install k6`
- macOS: `brew install k6`

Verify: `k6 version`

### 3. Record baseline

Open `docs/SCALING.md` → **Measured results** and prepare a new row before the run starts.

---

## Run ladder (do not skip to 100k)

| Step | Command | VUs | Purpose |
|------|---------|-----|---------|
| 1 | `SOAK_PRESET=smoke …` | 500 | Wiring + JWT + public reads |
| 2 | `SOAK_PRESET=target …` | 1,500 | Current product tier target |
| 3 | `SOAK_PRESET=scale …` | 10,000 | Find first infra bottleneck |
| 4 | `SOAK_PRESET=apex SKIP_WS=1 …` | 100,000 | HTTP-only apex (distributed) |
| 5 | `SOAK_PRESET=apex …` | 100,000 | Full HTTP + WebSocket fan-out |

### One-liner (Windows / macOS / Linux)

```bash
BASE_URL=https://your-staging.replit.app \
JWT_SECRET=<same-as-staging> \
npm run test:load:staging
```

Default preset is **target** (1.5k VUs).

### Presets

```bash
# Sanity
SOAK_PRESET=smoke BASE_URL=... JWT_SECRET=... npm run test:load:staging

# Product tier (default)
SOAK_PRESET=target BASE_URL=... JWT_SECRET=... npm run test:load:staging

# 10k
SOAK_PRESET=scale BASE_URL=... JWT_SECRET=... npm run test:load:staging

# 100k HTTP-only (recommended first apex pass)
SOAK_PRESET=apex SKIP_WS=1 BASE_URL=... JWT_SECRET=... npm run test:load:staging:100k

# 100k full (HTTP + WS)
SOAK_PRESET=apex BASE_URL=... JWT_SECRET=... npm run test:load:staging:100k
```

---

## 100k VUs — distributed execution

A single laptop **cannot** reliably run 100k open VUs. Use one of:

### Option A — Grafana k6 Cloud (recommended)

```bash
k6 cloud login
K6_CLOUD=1 SOAK_PRESET=apex SKIP_WS=1 \
  BASE_URL=https://your-staging.replit.app \
  JWT_SECRET=... \
  npm run test:load:staging:100k
```

### Option B — Multiple self-hosted generators

Run **10 machines** in parallel, each at `SOAK_PRESET=scale` (10k VUs), stagger start by 30s, same `BASE_URL`. Aggregate p95/error rates manually.

### Option C — k6 operator / Kubernetes

For teams on k8s, shard `scripts/loadtest.k6.soak.js` with `--execution-segment` — out of scope for this repo; see k6 docs.

---

## Pass / fail criteria

| Metric | Pass |
|--------|------|
| `http_req_failed` | < 1% |
| `http_req_duration` p95 | < 800 ms (reads); tighten to 400 ms at target tier |
| `ws_fanout_recv` | > 95% (when WS enabled) |
| `/health/ready` after soak | 200 |
| Autoscale | No OOM kills; instances drain cleanly on deploy |

After the run:

1. Copy k6 summary → `docs/SCALING.md` **Measured results** table.
2. Note `soak-results/latest.txt` one-line snapshot (auto-written when k6 finishes).
3. Log first bottleneck (DB pool, Redis, CPU, 5xx spike) and tuning change.

---

## What to watch during the run

- **Replit / hosting metrics** — CPU, memory, instance count.
- **Neon dashboard** — connection count vs limit.
- **Redis** — memory, connected clients.
- **Staging logs** — `[db] idle pool client error`, unhandled rejections, 503 bursts.

---

## Local comparison (already done)

| Tool | Scope |
|------|--------|
| `npm run test:load:stress` | 300 conn × 8 endpoints, one machine — **PASS** after cache/pool fixes |
| `npm run test:load:staging` | k6 ramping VUs against real staging |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| All WS failures | Missing / wrong `JWT_SECRET` | Re-mint token; check staging secret |
| `ws_fanout_recv` low | Single instance or no Redis | Enable Redis adapter; max instances ≥ 2 |
| 429 storm | Rate limit | Expected at extreme VUs; tune `RATE_LIMIT_MAX` or use Redis store |
| 503 / timeouts | DB pool exhausted | Lower `DB_POOL_MAX` per instance or add Neon pooler / plan |
| k6 OOM at apex | Too many VUs on one host | Use k6 Cloud or distributed generators |
