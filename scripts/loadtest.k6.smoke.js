// k6 HTTP-only smoke — local dev or staging quick check.
// Does not require WS_TOKEN (no Socket.IO fan-out scenario).
//
//   k6 run scripts/loadtest.k6.smoke.js
//   BASE_URL=http://localhost:5000 VUS=5 DURATION=30s k6 run scripts/loadtest.k6.smoke.js
//
// Install k6: https://k6.io/docs/get-started/installation/

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const VUS = parseInt(__ENV.VUS || '5', 10);
const DURATION = __ENV.DURATION || '30s';

const httpErrors = new Rate('http_errors');
const apiLatency = new Trend('api_latency_ms');

const READ_ENDPOINTS = [
  '/healthz',
  '/api/teams?limit=20',
  '/api/places?limit=20',
  '/api/posts/recent?limit=20',
];

export const options = {
  scenarios: {
    http_reads: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      exec: 'httpReads',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
    http_errors: ['rate<0.05'],
  },
};

export function setup() {
  // eslint-disable-next-line no-console
  console.log(`[k6-smoke] BASE_URL=${BASE_URL} VUS=${VUS} DURATION=${DURATION}`);
}

export function httpReads() {
  group('public reads', () => {
    const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)];
    const res = http.get(`${BASE_URL}${path}`, { tags: { endpoint: path } });
    apiLatency.add(res.timings.duration);
    const ok = check(res, {
      'status ok or rate-limited': (r) =>
        (r.status >= 200 && r.status < 400) || r.status === 429,
    });
    httpErrors.add(!ok);
  });
  sleep(Math.random() * 1 + 0.25);
}
