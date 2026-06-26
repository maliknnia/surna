# SURNA Scaling Operations Guide

This is the playbook for running SURNA at scale on Replit Autoscale. It
records what's been configured, the verified ceiling, and what to watch
when traffic grows past the current tier.

## Current target tier

| Metric | Target |
|---|---|
| Concurrent active users | 1,500 – 3,000 |
| Daily active users | 10,000 – 30,000 |
| p95 latency (reads) | < 400 ms |
| Error rate (5 min window) | < 1% |
| Autoscale instances | 1 – 4 |

## What's wired for multi-instance

- **Deployment**: `deploymentTarget = "autoscale"` in `.replit`. Build is `npm run build`, run is `npm run start` (`NODE_ENV=production node dist/index.js`).
- **Sessions**: Postgres-backed via `connect-pg-simple` in `server/replitAuth.ts`. Safe across instances.
- **Real-time (Socket.IO)**: Redis adapter wired in `server/realtime/io.ts`. Transport is **WebSocket-only** so no sticky sessions are required — load balancers can route any client to any instance, and the Redis pub/sub takes care of cross-instance event delivery.
- **Background jobs**: BullMQ workers run inside the same process. Each instance pulls jobs from the shared Redis queue, so adding instances scales worker throughput automatically.
- **Health probes**: `/healthz` (full check), `/health/ready` (DB ready), `/health/live` (process alive). Use `/health/ready` as the Autoscale readiness probe.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` handler in `server/app.ts` closes Socket.IO, the HTTP server, and drains the Postgres pool with a 15-second hard cap before exiting. Lets Autoscale rotate instances cleanly.
- **Static assets**: Built Vite assets served from `/assets` with `immutable, max-age=365d`. User media (images, video) is served from `S3_PUBLIC_BASE_URL`, which points at a **CDN edge** in front of the public S3 bucket — see [Media CDN](#media-cdn) — so the app process never touches media bytes.
- **API cache headers**: Read-heavy endpoints (teams, places, events, coaches, posts, leaderboards) set `Cache-Control: private, max-age=…, stale-while-revalidate=…` so repeated reads hit the browser cache or the CDN edge instead of the app.

## Postgres pool sizing

The pool is configured in `server/db.ts` and tunable via env vars:

| Var | Default | Notes |
|---|---|---|
| `DB_POOL_MAX` | 10 | Per-instance max connections |
| `DB_POOL_IDLE_MS` | 30000 | Idle connection timeout |
| `DB_POOL_CONN_TIMEOUT_MS` | 10000 | Acquire timeout |

**Sizing rule**: `DB_POOL_MAX × max Autoscale instances ≤ Neon plan max connections × 0.8`.
Reserve 20% headroom for migrations, the workers, and the session store.

| Neon plan | Conn ceiling | Suggested `DB_POOL_MAX` (4 inst) |
|---|---|---|
| Free / Launch | ~100 | 15 |
| Scale | ~400 | 60 |
| Business+ | 1000+ | 100+ |

If you exceed the budget, switch the connection string to Neon's pooled endpoint (PgBouncer). Pool size is logged at startup: `🗄️  [db] Postgres pool: max=… idle=…ms connTimeout=…ms`.

## Load testing

**Full staging soak (500 → 100k VUs)** — see **[STAGING_SOAK_CHECKLIST.md](./STAGING_SOAK_CHECKLIST.md)** and `scripts/loadtest.k6.soak.js`:

```bash
BASE_URL=https://your-staging.replit.app JWT_SECRET=... npm run test:load:staging
SOAK_PRESET=apex SKIP_WS=1 BASE_URL=... JWT_SECRET=... npm run test:load:staging:100k
```

Presets: `smoke` (500) · `target` (1.5k) · `scale` (10k) · `apex` (100k, distributed k6 required).

The standard k6 script (`scripts/loadtest.k6.js`) runs **two scenarios in
parallel** so a single run validates both the HTTP and the realtime path:

- `http_reads` (80% of VUs) — mixed GETs against **public** endpoints
  only (`/healthz`, `/api/teams`, `/api/places`, `/api/places/search`,
  `/api/posts/recent`) so HTTP thresholds measure system capacity, not
  auth rejections.
- `ws_fanout` (20% of VUs) — each VU opens **two** Socket.IO connections
  to the same DM room and asserts the second receives a probe message
  sent from the first. With ≥2 Autoscale instances the load balancer
  spreads the two sockets across instances, so a high `ws_fanout_recv`
  rate (threshold > 0.95) is direct end-to-end proof that the Redis
  adapter is fanning events across instances and that the
  WebSocket-only config works without sticky sessions.

**Easy mode (cross-platform)** — `npm run test:load:staging` or `scripts/run-loadtest-staging.mjs` mints `WS_TOKEN` from `JWT_SECRET` and runs the soak script.

**Bash wrapper** — `scripts/run-loadtest.sh` runs the original `loadtest.k6.js`:

```bash
# Install k6 once: https://k6.io/docs/get-started/installation/
BASE_URL=https://your-staging.replit.app \
JWT_SECRET=<same value the staging server uses> \
VUS=1500 DURATION=5m \
bash scripts/run-loadtest.sh
```

**Manual mode** — if you'd rather mint the token yourself:

```bash
BASE_URL=https://your-staging.replit.app \
WS_URL=wss://your-staging.replit.app \
WS_TOKEN=<a-valid-jwt-from-the-staging-app> \
VUS=1500 DURATION=5m \
k6 run scripts/loadtest.k6.js
```

**How to use it:**
1. Deploy to a staging Autoscale environment with **at least 2 max instances** so the multi-instance path is actually exercised.
2. Run the script at `VUS=500`, then `1000`, then `1500+` until a threshold breaks.
3. Whatever breaks first is the next bottleneck — fix it and re-run.
4. Record the run in the **Measured results** section below.

## Measured results

> Run the load test against staging and fill in this section. Everything
> above this line is configuration; everything below is evidence.

| Run date | Autoscale machine | Max instances | VUs sustained | p95 read | p99 read | 5xx rate (5m) | ws_fanout_recv | DB conns peak | First bottleneck |
|---|---|---|---|---|---|---|---|---|---|
| _pending first staging run_ | — | — | — | — | — | — | — | — | — |

> **Why this row is empty**: producing measured numbers requires deploying
> to a multi-instance Autoscale staging environment with a real `REDIS_URL`
> and a valid `WS_TOKEN`. Everything required to fill the row in (config,
> script, drain handler, docs, and the `scripts/run-loadtest.sh` one-liner
> wrapper that mints the token for you) is in place; only the
> deploy-and-measure step remains, and it can only be done by an operator
> with staging-deploy access. When you do it, paste the k6 summary into a
> new row above and note the Autoscale machine size + max-instance count.

When recording a run, also note:
- The exact `BASE_URL` / `WS_URL` used.
- The `DB_POOL_MAX` value at the time of the run.
- Whether `REDIS_URL` was set (without it Socket.IO multi-instance is unverified).
- Any tuning change made *after* the run (e.g. "bumped DB_POOL_MAX from 10 → 25") so the next reader knows what changed.

## Production monitoring

Logs alone are not enough at scale — by the time a slow database, memory leak,
or Socket.IO disconnect storm shows up in `journalctl` the users have already
felt it. The app exposes everything a hosted monitoring service needs; this
section is the on-call wiring on top of it.

### What the app exposes

| Endpoint | Format | Purpose |
|---|---|---|
| `/health` | JSON | Liveness signal for synthetic uptime checks. Returns 200 only when the process is healthy. |
| `/healthz` | JSON | Full check (DB / Redis / storage). Returns 503 when DB is down. |
| `/health/ready` | JSON | Autoscale readiness probe. |
| `/health/live` | JSON | Autoscale liveness probe. |
| `/api/metrics` | JSON | Human-readable performance stats (totals, averages, slow routes). |
| `/metrics` | Prometheus exposition | Scrape target for the dashboard / alert engine. Served by `server/monitoring/prometheusMetrics.ts`. |

The `/metrics` exposition includes the series the dashboard renders:

| Metric | What it tells you |
|---|---|
| `process_uptime_seconds` | Per-instance uptime. |
| `http_requests_total` (counter) | Cumulative request count since process start. Use `rate()` in PromQL for throughput. |
| `http_request_errors_total{class="all\|server"}` (counter) | Cumulative 4xx+5xx and 5xx-only counts. The error-rate alert is `rate(errors)/rate(requests)`. |
| `http_request_duration_ms_sum_total` (counter) | Cumulative sum of durations — pair with `http_requests_total` for an average. |
| `http_request_duration_ms_p95_5m` / `_p99_5m` | Pre-aggregated tail latency over the trailing 5m. SLO is < 800ms p95. |
| `http_error_rate_percent_5m` / `http_server_error_rate_percent_5m` | Pre-aggregated error rate over the trailing 5m. SLO is < 1%. |
| `http_requests_in_window{window="5m\|1h"}` | Sample count backing the windowed gauges (visibility into how much data the percentiles are based on). |
| `db_pool_connections{state="active\|idle\|waiting\|total"}` | Postgres pool usage from `server/db.ts`. |
| `db_pool_utilization_percent` | Active / max — feeds the pool-exhaustion alert. |
| `socketio_connected_clients` | Live Socket.IO clients on this instance (sum across instances for the fleet total). |
| `bullmq_queue_depth{queue}` | Pending BullMQ jobs (waiting+active+delayed+prioritized) per queue. Feeds the backlog alert. |
| `bullmq_jobs_failed_total{queue}` (counter) | Cumulative job failures per queue since worker start. Use `rate()` for failure rate. |
| `bullmq_worker_heartbeat_timestamp_seconds` | Unix timestamp of the last worker heartbeat tick. Alert when `time() - gauge > 180`. |
| `http_route_request_duration_ms_avg_5m` / `_requests_in_window_5m` | Top-25 routes by traffic — drill-down for slow endpoints. |

### Hosted dashboard + alert routing

We use **Grafana Cloud** (free tier is enough for this traffic shape) with the
**Better Stack** uptime monitor as the second pair of eyes on `/health`.

- **Dashboard**: <https://surna.grafana.net/d/surna-prod/surna-production> — pinned panels: uptime, p95 latency, error rate, DB pool active vs. max, Socket.IO connected clients (sum by instance).
- **Uptime check**: <https://uptime.betterstack.com/team/surna/monitors> hits `https://app.surna.io/health` every 30s from 3 regions.
- **On-call routing**: Grafana Cloud → Notification policy `route=oncall` → PagerDuty service `surna-prod` → Slack `#surna-oncall` mirror + email to `oncall@surna.io`. Better Stack escalates to the same PagerDuty service after a 2-minute failed-probe grace window.

#### Connecting Grafana Cloud

1. Create a Grafana Cloud stack and grab the **Prometheus remote-write** endpoint + API key.
2. Run the Grafana Agent (or Alloy) next to the app, scraping `http://localhost:5000/metrics` every 15s and remote-writing to Grafana Cloud. Sample agent block:
   ```yaml
   metrics:
     configs:
       - name: surna
         scrape_configs:
           - job_name: surna-app
             metrics_path: /metrics
             static_configs:
               - targets: ['localhost:5000']
         remote_write:
           - url: ${GRAFANA_CLOUD_PROM_URL}
             basic_auth:
               username: ${GRAFANA_CLOUD_PROM_USER}
               password: ${GRAFANA_CLOUD_PROM_API_KEY}
   ```
3. Import the alert rules from `monitoring/alert_rules.yml` (the `surna.rules` group) into Grafana Cloud Alerting.
4. Bind the contact point above to label selector `route=oncall`.

#### Connecting Better Stack (uptime + heartbeat)

1. Create an HTTP monitor pointed at `https://app.surna.io/health`, expected status `200`, interval 30s, regions ≥ 3.
2. Set the escalation policy to PagerDuty service `surna-prod` after 2 consecutive failures.
3. Optional: wire `BETTER_STACK_HEARTBEAT_URL` and ping it from the BullMQ worker once per minute to detect a stuck queue process.

### Alerts that page the on-call

These are encoded in `monitoring/alert_rules.yml` and mirrored in Grafana Cloud:

| Alert | Condition | Severity |
|---|---|---|
| `HealthEndpointDown` | `/health` non-200 for 1m | critical |
| `HighErrorRate` | `rate(http_request_errors_total)/rate(http_requests_total)` > 1% for 5m | critical |
| `HighP95Latency` | `http_request_duration_ms_p95_5m` > 800ms for 5m | warning |
| `DbPoolNearExhaustion` | `db_pool_utilization_percent` > 80% for 5m | warning |
| `ApplicationDown` | Prometheus `up{job="surna-app"} == 0` for 1m | critical |
| `BullMqQueueBacklog` | `bullmq_queue_depth` > 1000 for 5m on any queue | critical |
| `BullMqWorkerHeartbeatMissed` | `time() - bullmq_worker_heartbeat_timestamp_seconds` > 180s | critical |

All page-worthy alerts (`HealthEndpointDown`, `HighErrorRate`,
`HighP95Latency`, `DbPoolNearExhaustion`, `ApplicationDown`,
`DatabaseDown`, `BullMqQueueBacklog`, `BullMqWorkerHeartbeatMissed`)
carry the label `route=oncall`, which is what the
Grafana notification policy matches on to page PagerDuty. Pure-warning
or info alerts (`HighCPUUsage`, `HighUserRegistrations`, etc.) are left
unlabeled and route to the default Slack channel only.

> **Prereq for `HealthEndpointDown`**: the `surna-health` job in
> `monitoring/prometheus.yml` requires a `blackbox-exporter` running at
> `blackbox-exporter:9115`. If you'd rather not run one, replace this
> alert with the equivalent Better Stack monitor (which already pings
> `/health` every 30s) and remove the `surna-health` scrape job.

### Worker monitoring

The BullMQ worker process is in-tree (`server/worker/`) so HTTP health doesn't
cover it — a wedged worker keeps `/health` green while notifications and media
processing silently pile up. Two signals close that gap:

- **Heartbeat**: `server/worker/index.ts` ticks once per minute. Each tick
  updates the `bullmq_worker_heartbeat_timestamp_seconds` gauge in `/metrics`
  and, when `BETTER_STACK_HEARTBEAT_URL` is set, pings that URL so Better
  Stack's "missed heartbeat" monitor escalates to PagerDuty independently of
  the Prometheus pipeline.
- **Queue depth + failures**: `server/worker/metrics.ts` polls each queue's
  job counts every 5 s and counts the worker's `failed` events. They surface
  as `bullmq_queue_depth{queue}` and `bullmq_jobs_failed_total{queue}` in
  `/metrics`.

The two paging alerts on top of these signals are
`BullMqQueueBacklog` (depth > 1000 for 5m) and
`BullMqWorkerHeartbeatMissed` (no tick for 3m), both routed to the same
on-call destination as the HTTP alerts.

### Env vars for the monitoring stack

| Var | Purpose |
|---|---|
| `GRAFANA_CLOUD_PROM_URL` | Remote-write target for the Grafana Agent. |
| `GRAFANA_CLOUD_PROM_USER` | Stack ID. |
| `GRAFANA_CLOUD_PROM_API_KEY` | Write-scoped API key. |
| `BETTER_STACK_HEARTBEAT_URL` | Optional worker heartbeat. |

## Million-user smoothness pass

Done in task #15 to keep the platform responsive as we grow toward ~1M
users (~30–50k concurrent peak). Each item below is wired and active in
the running app; turn on Redis + a Neon read replica + Cloudflare to get
the full benefit.

### 1. Cache the heavy reads

Heavy GETs that previously hit Postgres on every request now go through
`cacheAside()` (Redis when `REDIS_URL` is set, in-memory fallback
otherwise) using the TTLs in `server/infrastructure/cache.ts`:

| Endpoint / repo | Key prefix | TTL | Invalidation |
|---|---|---|---|
| `GET /api/map/viewport` | `map:viewport:<bbox>:<zoom>:<layers>` | 60s | TTL only (per-viewer story state layered on top **after** cache lookup, so the cache stays sharable) |
| `selectProfileByUsername()` | `profile:username:<u>` | 120s | `cacheDel()` on `updateMe()` |
| `events.repo.listPublic()` | `events:public:<…params>` | 60s | `cacheInvalidatePattern('events:public:*')` on insert/update/delete |
| `feed.service` (already wired) | `feed:*` | 30s | invalidated on post create |

Expected effect once Redis is wired: cache hit ratio ≥ 80% on these
endpoints, p95 read latency drops from ~120–250ms (DB roundtrip) to
~5–15ms (Redis roundtrip).

### 2. Read-replica path (`server/dbRead.ts`)

A second Drizzle client, `dbRead`, is exposed alongside the primary
`db`. If `DATABASE_REPLICA_URL` is set it points at a Neon read replica;
otherwise it transparently falls back to the primary pool. New
read-heavy queries can `import { dbRead } from "../dbRead"` to take
load off the primary without changing the call site when no replica is
provisioned. Pool size is governed by `DB_POOL_MAX_REPLICA` (defaults
to `DB_POOL_MAX`).

For queries that must succeed even when the replica is degraded, use
`readWithFallback(client => client.select()...)` from the same file.
It tries the replica first and **automatically retries on the primary**
on any error (replica down, lagging, transient network), so a sick
replica never takes the app down. With no replica configured the
helper collapses to a single primary call.

| Var | Purpose |
|---|---|
| `DATABASE_REPLICA_URL` | Neon read-replica connection string. Optional. |
| `DB_POOL_MAX_REPLICA` | Per-instance max connections to the replica. Defaults to `DB_POOL_MAX`. |

### 3. Edge CDN in front of the SPA + public GETs

Authed JSON already sets `Cache-Control: private` (see "API cache
headers" above) so per-user data is never cached at the edge. Public
GETs (`/api/teams`, `/api/places`, `/api/posts/recent`, etc.) and the
built SPA shell are safe to put behind Cloudflare with a
`max-age=60, stale-while-revalidate=300` rule. This eliminates the
Replit egress hop for repeat visitors and far-region users.

### 4. Frontend perceived perf

- `client/src/App.tsx` — the previously eager-loaded `Coaches`, `Teams`
  and `EventsPage` modules are now `React.lazy()`. Initial JS shipped
  with `MobileHome` drops accordingly (only the home route's chunks
  load up-front; navigation triggers the relevant chunk). `MobileHome`
  itself stays preserved per the user preference.
- `client/src/components/ui/lazy-image.tsx` — drop-in `<LazyImage>` with
  native `loading="lazy"`, `decoding="async"`, and an optional blurred
  LQIP placeholder. Adopt across feed cards, profile avatars and map
  preview cards to defer offscreen image bytes (tracked as a follow-up
  task to keep this pass scoped).
- React Query defaults already keep `staleTime: 30s` and disable
  `refetchOnWindowFocus`, so navigating between cached pages doesn't
  hammer the API.
- Optimistic UI for like / follow / team-join is captured as a separate
  follow-up — wiring `onMutate`/rollback across every mutation site is
  outside this pass's scope.

### Measure before/after

Use the existing `/metrics` endpoint and the k6 script
(`scripts/loadtest.k6.js`) to compare:

| Signal | Where to read it |
|---|---|
| Cache hit ratio | Redis `INFO stats` (`keyspace_hits` / `keyspace_misses`) |
| p95 cached read | k6 thresholds for `/api/map/viewport`, `/api/events`, `/api/profile/:username` |
| Initial JS bundle | `npm run build` output → look at chunk sizes; `MobileHome` chunk is what users hit first |
| Far-region TTFB | Cloudflare analytics (once enabled), per-PoP TTFB on `/` |

## Next bottlenecks to watch

When this tier is exhausted, address in this order:

1. **Postgres write throughput** — bump Neon plan; consider read replicas for analytics queries.
2. **Socket.IO concurrent sockets per instance** — Node typically handles ~10k sockets per instance; increase Autoscale max instances.
3. **CDN in front of the app** — put Cloudflare/CloudFront in front of the Replit deployment to cache HTML, API GETs with public Cache-Control, and offload TLS.
4. **Search** — move Postgres FTS to a dedicated index (Meilisearch/Typesense) once read latency on `/api/search` regresses.

## Quick reference: env vars that matter at scale

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string (use the **pooled** URL at high instance counts) |
| `DB_POOL_MAX` | See sizing table above |
| `REDIS_URL` | Required for Socket.IO multi-instance, BullMQ, and rate-limit store |
| `SESSION_SECRET` | Must be identical across instances |
| `JWT_SECRET` | Must be identical across instances |
| `S3_PUBLIC_BASE_URL` | CDN hostname in front of the public S3 bucket (see [Media CDN](#media-cdn)) |
| `MEDIA_CACHE_CONTROL` | Cache-Control header written on every uploaded media object. Default `public, max-age=31536000, immutable` |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Per-key request budget |

## Media CDN

User-uploaded images and short videos are the heaviest bytes the app
serves. Streaming them straight from the S3 bucket works, but it has
two real-world problems at scale:

1. **Latency** — a user in São Paulo fetching from `nyc3` adds ~150 ms
   per asset and a feed pulls dozens of images.
2. **Egress cost** — one viral post can move terabytes of identical
   bytes out of S3 within a day. Object-storage egress is billed; CDN
   egress (from the cache) is much cheaper or free.

A CDN in front of the bucket fixes both: the first request from a
region pulls the object from S3, every subsequent request in that
region is served from the edge.

### How it's wired

- `S3_PUBLIC_BASE_URL` points at the **CDN hostname**, never at the raw
  S3 endpoint. Every URL the app hands to clients
  (`server/features/media/s3.ts → createPresignedPut`,
  `server/worker/media.worker.ts → uploadBuffer`,
  `server/infrastructure/mediaService.ts → generateSignedUrl`) is built
  by concatenating that base, so flipping the env var is the only
  change needed to move providers.
- The CDN's origin is the S3 bucket's public endpoint. Cache key
  includes the path only — no query string, no cookies — so all users
  share the same cache entry per object.
- Both the worker (server-side resize uploads) and the presigned PUTs
  set `Cache-Control: public, max-age=31536000, immutable` on the
  object itself (`MEDIA_CACHE_CONTROL` env override). Object keys are
  content-addressed (`media/<id>_thumb.jpg`, `uploads/<user>/<ts>_…`)
  so they never change after upload — `immutable` is safe.
- The CSP `img-src` / `media-src` allow-list in
  `server/middleware/securityEnhancements.ts` includes
  `S3_PUBLIC_BASE_URL`, so swapping in a CDN hostname doesn't trip
  CSP.

### Picking a provider

| Provider | Setup | Best when |
|---|---|---|
| **Cloudflare** (recommended) | Add the bucket as a custom origin, create a CNAME `cdn.surna.io → <r2 or origin> `, enable "Cache Everything" page rule, set Edge Cache TTL to 1 year. | Default choice — global PoPs, free TLS, free egress within Cloudflare. |
| **AWS CloudFront** | Origin = the S3 website endpoint, behavior `Cache based on selected headers = none`, `Object caching = use origin headers`, alternate domain `cdn.surna.io`. | Already on AWS / using `us-east-1` bucket. |
| **Bunny.net** | Pull Zone → origin URL = bucket public URL, attach custom hostname `cdn.surna.io`, smart cache on. | Cheapest per-GB if Cloudflare's free tier ToS is a concern. |

Whichever you pick, the only app change is:

```bash
# .env (production)
S3_PUBLIC_BASE_URL=https://cdn.surna.io
```

No code change, no rebuild — restart the app and every new media URL
goes through the edge.

### Purging the edge on delete

Because objects are served with `immutable, max-age=31536000`, a
deleted/moderated image can keep being served from the edge for up to
a year if we don't actively invalidate it. `server/features/media/cdn.ts`
exposes `purgeMediaUrls()`, which is called from
`server/infrastructure/mediaService.ts → deleteMedia` whenever a media
row is removed. It posts the affected URLs to the configured CDN's
purge API so takedowns are honored within seconds.

Configure via env:

| Var | Notes |
|---|---|
| `CDN_PROVIDER` | `cloudflare` \| `cloudfront` \| `bunny` \| `none` (default `none` — purge is a no-op so dev/test work without credentials) |
| `CDN_PURGE_TOKEN` | API token (Cloudflare) / AccessKey (Bunny) / bearer for the CloudFront purge endpoint |
| `CDN_ZONE_ID` | Cloudflare zone id, Bunny pull-zone id, or CloudFront distribution id |
| `CDN_PURGE_ENDPOINT` | (CloudFront only) URL of a small lambda/api gateway in front of `CreateInvalidation`, since CloudFront requires SigV4 |

Purges are fire-and-forget — a CDN outage will never block the S3/DB
delete. Failures are logged with `[cdn] purge failed`.

### Verifying the edge cache

After flipping the env var, spot-check from two geographically distant
locations (the easiest way without provisioning machines is to use
Cloudflare's `https://speed.cloudflare.com/` or a free service like
WebPageTest with locations set to e.g. **Frankfurt** and **Sydney**):

1. Pick a real asset URL from the app, e.g.
   `https://cdn.surna.io/media/<id>_medium.jpg`.
2. From each location run:
   ```bash
   curl -sI https://cdn.surna.io/media/<id>_medium.jpg | grep -iE 'cache-control|age|cf-cache-status|x-cache'
   ```
3. Expected on the **first** hit from a region: `cf-cache-status: MISS`
   (or CloudFront `x-cache: Miss from cloudfront`) plus
   `cache-control: public, max-age=31536000, immutable`.
4. Expected on the **second** hit (same region): `cf-cache-status: HIT`
   / `x-cache: Hit from cloudfront`, and `age:` should grow toward
   `max-age` on subsequent calls.
5. Compare TTFB before/after — typical numbers from a cold S3 origin vs
   a warm edge:

   | Region pair | Origin TTFB | Edge TTFB (HIT) |
   |---|---|---|
   | Frankfurt → S3 `nyc3` | 110–160 ms | 8–25 ms |
   | Sydney → S3 `nyc3` | 230–320 ms | 10–35 ms |

Record the measured numbers below. If the second hit isn't `HIT`, the
cache rule is wrong (most often: cookies or query strings included in
the cache key, or the `Cache-Control` header not making it onto the
object).

### Measured edge results

> Fill in after you've pointed `S3_PUBLIC_BASE_URL` at the CDN and run
> the spot-check above.

| Date | Provider | Test region | Origin TTFB | Edge TTFB (HIT) | Cache header observed |
|---|---|---|---|---|---|
| _pending_ | — | — | — | — | — |
| _pending_ | — | — | — | — | — |
