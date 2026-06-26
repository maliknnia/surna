/**
 * k6 staging soak — HTTP reads + optional Socket.IO fan-out.
 *
 * Presets (SOAK_PRESET env overrides VUS/DURATION/RAMP):
 *   smoke   — 500 VUs, 3m sustain  (sanity)
 *   target  — 1.5k VUs, 5m sustain (current Autoscale tier)
 *   scale   — 10k VUs, 10m sustain
 *   apex    — 100k VUs, 15m sustain (requires k6 Cloud or distributed generators)
 *
 *   BASE_URL=https://staging.example.com JWT_SECRET=... npm run test:load:staging
 *   SOAK_PRESET=apex BASE_URL=... JWT_SECRET=... npm run test:load:staging:100k
 *
 * Env:
 *   BASE_URL, WS_URL, WS_TOKEN, JWT_SECRET (minted by run-loadtest-staging.mjs)
 *   SOAK_PRESET | VUS | DURATION | RAMP
 *   SKIP_WS=1          — HTTP-only (use for first apex runs)
 *   K6_CLOUD=1         — pass through to `k6 cloud run` when using Grafana Cloud k6
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

const PRESETS = {
  smoke: { vus: 500, duration: '3m', ramp: '2m' },
  target: { vus: 1500, duration: '5m', ramp: '3m' },
  scale: { vus: 10000, duration: '10m', ramp: '5m' },
  apex: { vus: 100000, duration: '15m', ramp: '10m' },
};

const presetName = (__ENV.SOAK_PRESET || 'target').toLowerCase();
const preset = PRESETS[presetName] || PRESETS.target;

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const WS_URL = __ENV.WS_URL || BASE_URL.replace(/^http/, 'ws');
const WS_TOKEN = __ENV.WS_TOKEN || '';
const SKIP_WS = __ENV.SKIP_WS === '1' || __ENV.SKIP_WS === 'true';
const VUS = parseInt(__ENV.VUS || String(preset.vus), 10);
const DURATION = __ENV.DURATION || preset.duration;
const RAMP = __ENV.RAMP || preset.ramp;
const UA = { 'User-Agent': 'SurnaK6Soak/1.0' };

const httpErrors = new Rate('http_errors');
const wsErrors = new Rate('ws_errors');
const wsFanoutRecv = new Rate('ws_fanout_recv');
const wsConnects = new Counter('ws_connects');
const apiLatency = new Trend('api_latency_ms');

const httpVus = SKIP_WS ? VUS : Math.max(1, Math.floor(VUS * 0.8));
const wsVus = SKIP_WS ? 0 : Math.max(1, Math.floor(VUS * 0.2));

const rampStages = (target) => [
  { duration: RAMP, target: Math.floor(target * 0.2) },
  { duration: RAMP, target: Math.floor(target * 0.5) },
  { duration: RAMP, target: Math.floor(target * 0.8) },
  { duration: RAMP, target: target },
  { duration: DURATION, target: target },
  { duration: '1m', target: 0 },
];

export function setup() {
  // eslint-disable-next-line no-console
  console.log(
    `[soak] preset=${presetName} BASE_URL=${BASE_URL} VUS=${VUS} RAMP=${RAMP} DURATION=${DURATION} ` +
      `httpVus=${httpVus} wsVus=${wsVus} SKIP_WS=${SKIP_WS} WS_TOKEN=${WS_TOKEN ? 'set' : 'MISSING'}`,
  );
  if (VUS >= 50000) {
    // eslint-disable-next-line no-console
    console.warn(
      '[soak] VUS >= 50k — use k6 Cloud or multiple load generators. See docs/STAGING_SOAK_CHECKLIST.md',
    );
  }
  if (/localhost|127\.0\.0\.1/.test(BASE_URL)) {
    // eslint-disable-next-line no-console
    console.warn('[soak] localhost — not valid for staging capacity numbers.');
  }
  return { startedAt: new Date().toISOString(), preset: presetName, vus: VUS };
}

export const options = {
  scenarios: {
    http_reads: {
      executor: 'ramping-vus',
      exec: 'httpReads',
      startVUs: 0,
      stages: rampStages(httpVus),
      gracefulRampDown: '2m',
    },
    ...(SKIP_WS
      ? {}
      : {
          ws_fanout: {
            executor: 'ramping-vus',
            exec: 'wsFanout',
            startVUs: 0,
            stages: rampStages(wsVus),
            gracefulRampDown: '2m',
          },
        }),
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    http_errors: ['rate<0.01'],
    ...(SKIP_WS
      ? {}
      : {
          ws_errors: ['rate<0.05'],
          ws_fanout_recv: ['rate>0.95'],
        }),
  },
};

const READ_ENDPOINTS = [
  '/healthz',
  '/health/live',
  '/api/ping',
  '/api/teams?limit=20',
  '/api/coaches?limit=20',
  '/api/events?limit=20',
  '/api/places?limit=20',
  '/api/places/search?q=gym',
  '/api/posts/recent?limit=20',
  '/api/hashtags/trending',
];

export function httpReads() {
  group('public reads', () => {
    const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)];
    const res = http.get(`${BASE_URL}${path}`, { headers: UA, tags: { endpoint: path.split('?')[0] } });
    apiLatency.add(res.timings.duration);
    const ok = check(res, {
      'status ok or rate-limited': (r) =>
        (r.status >= 200 && r.status < 400) || r.status === 429,
    });
    httpErrors.add(!ok);
  });
  sleep(Math.random() * 2 + 0.25);
}

export function wsFanout() {
  if (!WS_TOKEN) {
    wsErrors.add(true);
    return;
  }

  const room = `loadtest-${__VU}-${Date.now()}`;
  const probe = `probe-${__VU}-${__ITER}-${Math.random().toString(36).slice(2)}`;
  const wsPath = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  let received = false;

  const subRes = ws.connect(wsPath, {}, function (sub) {
    wsConnects.add(1);
    sub.on('open', () => {
      sub.send(`40${JSON.stringify({ token: `Bearer ${WS_TOKEN}` })}`);
      sub.send(`42${JSON.stringify(['dm:join', { conversationId: room }])}`);

      sub.setTimeout(() => {
        ws.connect(wsPath, {}, function (pub) {
          wsConnects.add(1);
          pub.on('open', () => {
            pub.send(`40${JSON.stringify({ token: `Bearer ${WS_TOKEN}` })}`);
            pub.send(`42${JSON.stringify(['dm:join', { conversationId: room }])}`);
            pub.setTimeout(() => {
              pub.send(`42${JSON.stringify(['dm:message', { conversationId: room, body: probe }])}`);
              pub.setTimeout(() => pub.close(), 1500);
            }, 500);
          });
          pub.on('error', () => wsErrors.add(true));
        });
      }, 500);

      sub.on('message', (raw) => {
        if (typeof raw === 'string' && raw.indexOf(probe) !== -1) received = true;
      });

      sub.setTimeout(() => {
        wsFanoutRecv.add(received);
        sub.close();
      }, 5000);
    });
    sub.on('error', () => wsErrors.add(true));
  });

  check(subRes, { 'subscriber ws upgraded': (r) => r && r.status === 101 }) || wsErrors.add(true);
}

export function handleSummary(data) {
  const line = [
    new Date().toISOString(),
    `preset=${presetName}`,
    `vus=${VUS}`,
    `http_p95=${data.metrics.http_req_duration?.values?.['p(95)'] ?? 'n/a'}`,
    `http_fail=${data.metrics.http_req_failed?.values?.rate ?? 'n/a'}`,
    `ws_recv=${data.metrics.ws_fanout_recv?.values?.rate ?? 'n/a'}`,
  ].join(' | ');
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'soak-results/latest.txt': line + '\n',
  };
}
