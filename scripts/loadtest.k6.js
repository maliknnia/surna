// k6 load test for SURNA — read mix + Socket.IO fan-out verification
//
// Run against staging (must have at least 2 Autoscale instances + REDIS_URL):
//   BASE_URL=https://staging.surna.replit.app \
//   WS_URL=wss://staging.surna.replit.app \
//   WS_TOKEN=<jwt> \
//   k6 run scripts/loadtest.k6.js
//
// Tune ramp / duration via env:
//   VUS=1500 DURATION=5m k6 run scripts/loadtest.k6.js
//
// Targets (from docs/SCALING.md):
//   p95 latency < 400ms on read endpoints
//   error rate < 1% over a 5-minute window
//   ws_fanout_recv rate > 0.95 (proves Redis adapter cross-instance delivery)
//
// Two scenarios run in parallel:
//   1) http_reads — 80% of VUs, mixed GETs against PUBLIC endpoints only
//      so HTTP threshold reflects system capacity, not auth rejections.
//   2) ws_fanout  — 20% of VUs, each VU opens TWO Socket.IO connections
//      to the same room and asserts the second receives a message sent
//      from the first. With 2+ Autoscale instances the load balancer
//      will spread the two sockets across instances most of the time,
//      so a high recv rate is direct end-to-end proof of Redis adapter
//      fan-out. WS_TOKEN must be a valid JWT for an account permitted
//      to join the test room.

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const WS_URL = __ENV.WS_URL || BASE_URL.replace(/^http/, 'ws');
const WS_TOKEN = __ENV.WS_TOKEN || '';
const VUS = parseInt(__ENV.VUS || '500', 10);
const DURATION = __ENV.DURATION || '5m';

const httpErrors = new Rate('http_errors');
const wsErrors = new Rate('ws_errors');
const wsFanoutRecv = new Rate('ws_fanout_recv');
const wsConnects = new Counter('ws_connects');

const apiLatency = new Trend('api_latency_ms');

const httpVus = Math.max(1, Math.floor(VUS * 0.8));
const wsVus = Math.max(1, Math.floor(VUS * 0.2));

export function setup() {
  // Surface the run config in the k6 summary so recorded results are
  // self-documenting. If you're pointing at localhost or forgot WS_TOKEN
  // the warnings below will appear at the top of the run output.
  // eslint-disable-next-line no-console
  console.log(
    `[loadtest] BASE_URL=${BASE_URL} WS_URL=${WS_URL} VUS=${VUS} ` +
      `DURATION=${DURATION} httpVus=${httpVus} wsVus=${wsVus} ` +
      `WS_TOKEN=${WS_TOKEN ? 'set' : 'MISSING'}`,
  );
  if (/localhost|127\.0\.0\.1/.test(BASE_URL)) {
    // eslint-disable-next-line no-console
    console.warn('[loadtest] BASE_URL points at localhost — results will not reflect Autoscale capacity.');
  }
  if (!WS_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn('[loadtest] WS_TOKEN not set — ws_fanout scenario will fail every iteration.');
  }
  return { startedAt: new Date().toISOString() };
}

export const options = {
  scenarios: {
    http_reads: {
      executor: 'ramping-vus',
      exec: 'httpReads',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Math.floor(httpVus * 0.3) },
        { duration: '1m', target: Math.floor(httpVus * 0.7) },
        { duration: '1m', target: httpVus },
        { duration: DURATION, target: httpVus },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    ws_fanout: {
      executor: 'ramping-vus',
      exec: 'wsFanout',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Math.floor(wsVus * 0.3) },
        { duration: '1m', target: Math.floor(wsVus * 0.7) },
        { duration: '1m', target: wsVus },
        { duration: DURATION, target: wsVus },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_errors: ['rate<0.01'],
    ws_errors: ['rate<0.05'],
    ws_fanout_recv: ['rate>0.95'],
  },
};

// Only public, non-auth-gated endpoints — verified against server/routes.ts.
// /api/posts/recent, /api/teams, /api/places, /api/places/search are public.
// /healthz is the always-on health probe.
const READ_ENDPOINTS = [
  '/healthz',
  '/api/teams?limit=20',
  '/api/places?limit=20',
  '/api/places/search?q=gym',
  '/api/posts/recent?limit=20',
];

export function httpReads() {
  group('mixed reads', () => {
    const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)];
    const res = http.get(`${BASE_URL}${path}`, { tags: { endpoint: path } });
    apiLatency.add(res.timings.duration);
    const ok = check(res, {
      'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
    });
    httpErrors.add(!ok);
  });
  sleep(Math.random() * 2 + 0.5);
}

// ─── Socket.IO fan-out verification ───
// Each VU opens two independent Socket.IO connections to the same DM room
// and verifies that a message published from connection A is received by
// connection B. With ≥2 Autoscale instances the LB will land the two
// sockets on different instances most of the time, so a high recv rate
// directly proves the Redis adapter is fanning events across instances.
export function wsFanout() {
  if (!WS_TOKEN) {
    // Without a token the server-side join handler will reject. Surface as
    // a connection-level error so the threshold catches misconfiguration.
    wsErrors.add(true);
    return;
  }

  const room = `loadtest-${__VU}-${Date.now()}`;
  const probe = `probe-${__VU}-${__ITER}-${Math.random().toString(36).slice(2)}`;
  const wsPath = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;

  let received = false;

  // Subscriber connection — opens first so it's in the room before publish.
  const subRes = ws.connect(wsPath, {}, function (sub) {
    wsConnects.add(1);
    sub.on('open', () => {
      sub.send(`40${JSON.stringify({ token: `Bearer ${WS_TOKEN}` })}`);
      sub.send(`42${JSON.stringify(['dm:join', { conversationId: room }])}`);

      // Now open the publisher in a second connection and emit a message.
      // k6's ws.connect is blocking; calling it from inside the subscriber
      // would deadlock, so we open it on a timer that fires inside the
      // subscriber's event loop.
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

      // Listen for the probe payload echoed back through the room.
      sub.on('message', (raw) => {
        if (typeof raw === 'string' && raw.indexOf(probe) !== -1) {
          received = true;
        }
      });

      // Give fan-out up to 5s before recording the result.
      sub.setTimeout(() => {
        wsFanoutRecv.add(received);
        sub.close();
      }, 5000);
    });
    sub.on('error', () => wsErrors.add(true));
  });

  check(subRes, { 'subscriber ws upgraded': (r) => r && r.status === 101 }) || wsErrors.add(true);
}
