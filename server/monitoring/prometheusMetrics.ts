import type { Request, Response } from 'express';
import { pool } from '../db';
import PerformanceMonitor, { type RouteStat, type WindowStats } from '../performance/monitoring';
import { getCacheCounters, getCacheCountersBySurface } from '../infrastructure/cache';
import { getBullMqMetrics } from '../worker/metrics';

let getConnectedSocketCount: () => number = () => 0;

export function registerSocketIOMetricsSource(getCount: () => number): void {
  getConnectedSocketCount = getCount;
}

interface PoolMetrics {
  total: number;
  idle: number;
  active: number;
  waiting: number;
  max: number;
  utilizationPercent: number;
}

interface PoolInternals {
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
  options?: { max?: number };
}

function readPoolMetrics(): PoolMetrics {
  const internals = pool as unknown as PoolInternals;
  const total = internals.totalCount ?? 0;
  const idle = internals.idleCount ?? 0;
  const waiting = internals.waitingCount ?? 0;
  const max = internals.options?.max ?? Number(process.env.DB_POOL_MAX || 10);
  const active = Math.max(0, total - idle);
  const utilizationPercent = max > 0 ? (active / max) * 100 : 0;
  return { total, idle, active, waiting, max, utilizationPercent };
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ROUTE_LIMIT = 25;

export interface HealthSnapshot {
  uptimeSeconds: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRatePercent: number;
  serverErrorRatePercent: number;
  requestsInWindow5m: number;
  dbPool: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
    max: number;
    utilizationPercent: number;
  };
  socketsConnected: number;
  slo: {
    p95LatencyMaxMs: number;
    errorRateMaxPercent: number;
    dbPoolMaxUtilizationPercent: number;
  };
  degraded: boolean;
  breaches: string[];
  generatedAt: string;
}

const SLO_P95_LATENCY_MS = Number(process.env.SLO_P95_LATENCY_MS || 500);
const SLO_ERROR_RATE_PERCENT = Number(process.env.SLO_ERROR_RATE_PERCENT || 1);
const SLO_DB_POOL_UTIL_PERCENT = Number(process.env.SLO_DB_POOL_UTIL_PERCENT || 80);

export function getHealthSnapshot(): HealthSnapshot {
  const window5m: WindowStats = PerformanceMonitor.getWindowStats(FIVE_MINUTES_MS);
  const poolMetrics = readPoolMetrics();

  let socketsConnected = 0;
  try {
    socketsConnected = getConnectedSocketCount();
  } catch {
    socketsConnected = 0;
  }

  const breaches: string[] = [];
  if (window5m.p95ResponseTime > SLO_P95_LATENCY_MS) {
    breaches.push(`p95 latency ${window5m.p95ResponseTime.toFixed(0)}ms exceeds ${SLO_P95_LATENCY_MS}ms`);
  }
  if (window5m.errorRate > SLO_ERROR_RATE_PERCENT) {
    breaches.push(`error rate ${window5m.errorRate.toFixed(2)}% exceeds ${SLO_ERROR_RATE_PERCENT}%`);
  }
  if (poolMetrics.utilizationPercent > SLO_DB_POOL_UTIL_PERCENT) {
    breaches.push(`DB pool ${poolMetrics.utilizationPercent.toFixed(0)}% exceeds ${SLO_DB_POOL_UTIL_PERCENT}%`);
  }

  return {
    uptimeSeconds: process.uptime(),
    p95LatencyMs: window5m.p95ResponseTime,
    p99LatencyMs: window5m.p99ResponseTime,
    errorRatePercent: window5m.errorRate,
    serverErrorRatePercent: window5m.serverErrorRate,
    requestsInWindow5m: window5m.totalRequests,
    dbPool: {
      active: poolMetrics.active,
      idle: poolMetrics.idle,
      waiting: poolMetrics.waiting,
      total: poolMetrics.total,
      max: poolMetrics.max,
      utilizationPercent: poolMetrics.utilizationPercent,
    },
    socketsConnected,
    slo: {
      p95LatencyMaxMs: SLO_P95_LATENCY_MS,
      errorRateMaxPercent: SLO_ERROR_RATE_PERCENT,
      dbPoolMaxUtilizationPercent: SLO_DB_POOL_UTIL_PERCENT,
    },
    degraded: breaches.length > 0,
    breaches,
    generatedAt: new Date().toISOString(),
  };
}

export function prometheusMetricsHandler(_req: Request, res: Response): void {
  const counters = PerformanceMonitor.getCounters();
  const window5m: WindowStats = PerformanceMonitor.getWindowStats(FIVE_MINUTES_MS);
  const window1h: WindowStats = PerformanceMonitor.getWindowStats(ONE_HOUR_MS);
  const memory = process.memoryUsage();
  const poolMetrics = readPoolMetrics();

  let socketsConnected = 0;
  try {
    socketsConnected = getConnectedSocketCount();
  } catch {
    socketsConnected = 0;
  }

  const lines: string[] = [];

  // Process / runtime
  lines.push('# HELP process_uptime_seconds Process uptime in seconds.');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${process.uptime().toFixed(3)}`);

  lines.push('# HELP process_heap_used_mb V8 heap used in MB (process.memoryUsage().heapUsed).');
  lines.push('# TYPE process_heap_used_mb gauge');
  lines.push(`process_heap_used_mb ${(memory.heapUsed / 1024 / 1024).toFixed(2)}`);

  lines.push('# HELP process_rss_mb Resident set size in MB (process.memoryUsage().rss).');
  lines.push('# TYPE process_rss_mb gauge');
  lines.push(`process_rss_mb ${(memory.rss / 1024 / 1024).toFixed(2)}`);

  // Monotonic HTTP counters â€” safe for rate() in PromQL.
  lines.push('# HELP http_requests_total Cumulative HTTP requests since process start.');
  lines.push('# TYPE http_requests_total counter');
  lines.push(`http_requests_total ${counters.totalRequests}`);

  lines.push('# HELP http_request_errors_total Cumulative HTTP responses with status >= 400.');
  lines.push('# TYPE http_request_errors_total counter');
  lines.push(`http_request_errors_total{class="all"} ${counters.totalErrors}`);
  lines.push(`http_request_errors_total{class="server"} ${counters.totalServerErrors}`);

  lines.push('# HELP http_request_duration_ms_sum_total Cumulative sum of HTTP request durations (ms) since process start.');
  lines.push('# TYPE http_request_duration_ms_sum_total counter');
  lines.push(`http_request_duration_ms_sum_total ${counters.totalDurationMs.toFixed(3)}`);

  // Pre-aggregated 5-minute SLI gauges â€” alert rules read these directly so the
  // SLO window is exactly 5m regardless of buffer size or scrape interval.
  lines.push('# HELP http_request_duration_ms_p95_5m 95th percentile request duration over the trailing 5 minutes.');
  lines.push('# TYPE http_request_duration_ms_p95_5m gauge');
  lines.push(`http_request_duration_ms_p95_5m ${window5m.p95ResponseTime.toFixed(2)}`);

  lines.push('# HELP http_request_duration_ms_p99_5m 99th percentile request duration over the trailing 5 minutes.');
  lines.push('# TYPE http_request_duration_ms_p99_5m gauge');
  lines.push(`http_request_duration_ms_p99_5m ${window5m.p99ResponseTime.toFixed(2)}`);

  lines.push('# HELP http_error_rate_percent_5m Percentage of 4xx+5xx responses over the trailing 5 minutes.');
  lines.push('# TYPE http_error_rate_percent_5m gauge');
  lines.push(`http_error_rate_percent_5m ${window5m.errorRate.toFixed(3)}`);

  lines.push('# HELP http_server_error_rate_percent_5m Percentage of 5xx responses over the trailing 5 minutes.');
  lines.push('# TYPE http_server_error_rate_percent_5m gauge');
  lines.push(`http_server_error_rate_percent_5m ${window5m.serverErrorRate.toFixed(3)}`);

  lines.push('# HELP http_requests_in_window Total requests counted in the trailing 5-minute window (sample-buffer-bounded).');
  lines.push('# TYPE http_requests_in_window gauge');
  lines.push(`http_requests_in_window{window="5m"} ${window5m.totalRequests}`);
  lines.push(`http_requests_in_window{window="1h"} ${window1h.totalRequests}`);

  // DB pool
  lines.push('# HELP db_pool_connections Postgres pool connection counts by state.');
  lines.push('# TYPE db_pool_connections gauge');
  lines.push(`db_pool_connections{state="total"} ${poolMetrics.total}`);
  lines.push(`db_pool_connections{state="active"} ${poolMetrics.active}`);
  lines.push(`db_pool_connections{state="idle"} ${poolMetrics.idle}`);
  lines.push(`db_pool_connections{state="waiting"} ${poolMetrics.waiting}`);

  lines.push('# HELP db_pool_max Configured Postgres pool max size.');
  lines.push('# TYPE db_pool_max gauge');
  lines.push(`db_pool_max ${poolMetrics.max}`);

  lines.push('# HELP db_pool_utilization_percent Active / max as a percentage.');
  lines.push('# TYPE db_pool_utilization_percent gauge');
  lines.push(`db_pool_utilization_percent ${poolMetrics.utilizationPercent.toFixed(2)}`);

  // Cache hits/misses â€” lets PromQL compute hit ratio as
  //   rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
  const cache = getCacheCounters();
  lines.push('# HELP cache_hits_total Cumulative cacheGet() hits since process start.');
  lines.push('# TYPE cache_hits_total counter');
  lines.push(`cache_hits_total ${cache.hits}`);
  lines.push('# HELP cache_misses_total Cumulative cacheGet() misses since process start.');
  lines.push('# TYPE cache_misses_total counter');
  lines.push(`cache_misses_total ${cache.misses}`);
  lines.push('# HELP cache_sets_total Cumulative cacheSet() writes since process start.');
  lines.push('# TYPE cache_sets_total counter');
  lines.push(`cache_sets_total ${cache.sets}`);

  // Per-surface cache counters â€” surface = first colon-segment of the cache
  // key (map, profile, events, search, ...). Lets us compute hit ratio per
  // surface, e.g.
  //   rate(cache_surface_hits_total{surface="map"}[5m])
  //   / (rate(cache_surface_hits_total{surface="map"}[5m])
  //      + rate(cache_surface_misses_total{surface="map"}[5m]))
  const bySurface = getCacheCountersBySurface();
  const surfaces = Object.keys(bySurface).sort();
  if (surfaces.length > 0) {
    lines.push('# HELP cache_surface_hits_total cacheGet() hits, labeled by cache-key surface.');
    lines.push('# TYPE cache_surface_hits_total counter');
    for (const s of surfaces) lines.push(`cache_surface_hits_total{surface="${escapeLabel(s)}"} ${bySurface[s].hits}`);
    lines.push('# HELP cache_surface_misses_total cacheGet() misses, labeled by cache-key surface.');
    lines.push('# TYPE cache_surface_misses_total counter');
    for (const s of surfaces) lines.push(`cache_surface_misses_total{surface="${escapeLabel(s)}"} ${bySurface[s].misses}`);
    lines.push('# HELP cache_surface_sets_total cacheSet() writes, labeled by cache-key surface.');
    lines.push('# TYPE cache_surface_sets_total counter');
    for (const s of surfaces) lines.push(`cache_surface_sets_total{surface="${escapeLabel(s)}"} ${bySurface[s].sets}`);
  }

  // BullMQ â€” queue depth (waiting+active+delayed+prioritized) and cumulative
  // failures per queue. Polled in-process by server/worker/metrics.ts so the
  // /metrics handler stays synchronous. Heartbeat gauge is the unix timestamp
  // of the last worker tick; alert fires when (time() - gauge) > 180s.
  const bull = getBullMqMetrics();
  const queueNames = Object.keys(bull.queueDepth).sort();
  lines.push('# HELP bullmq_queue_depth Pending BullMQ jobs (waiting+active+delayed+prioritized) per queue.');
  lines.push('# TYPE bullmq_queue_depth gauge');
  for (const q of queueNames) {
    lines.push(`bullmq_queue_depth{queue="${escapeLabel(q)}"} ${bull.queueDepth[q]}`);
  }

  const failedQueueNames = Object.keys(bull.jobsFailedTotal).sort();
  lines.push('# HELP bullmq_jobs_failed_total Cumulative BullMQ job failures since worker start, per queue.');
  lines.push('# TYPE bullmq_jobs_failed_total counter');
  for (const q of failedQueueNames) {
    lines.push(`bullmq_jobs_failed_total{queue="${escapeLabel(q)}"} ${bull.jobsFailedTotal[q]}`);
  }

  lines.push('# HELP bullmq_worker_heartbeat_timestamp_seconds Unix timestamp of the last worker heartbeat tick (0 if the worker has never ticked).');
  lines.push('# TYPE bullmq_worker_heartbeat_timestamp_seconds gauge');
  lines.push(`bullmq_worker_heartbeat_timestamp_seconds ${bull.workerHeartbeatTimestampSeconds.toFixed(3)}`);

  // Socket.IO
  lines.push('# HELP socketio_connected_clients Currently connected Socket.IO clients on this instance.');
  lines.push('# TYPE socketio_connected_clients gauge');
  lines.push(`socketio_connected_clients ${socketsConnected}`);

  // Per-route averages â€” top N over the 5m window keeps cardinality bounded.
  const routeEntries: Array<[string, RouteStat]> = Object.entries(window5m.routeStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, ROUTE_LIMIT);

  if (routeEntries.length > 0) {
    lines.push('# HELP http_route_request_duration_ms_avg_5m Average duration per route+method over the trailing 5m.');
    lines.push('# TYPE http_route_request_duration_ms_avg_5m gauge');
    for (const [key, stat] of routeEntries) {
      const [method, ...routeParts] = key.split(' ');
      const route = routeParts.join(' ') || '/';
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}"`;
      lines.push(`http_route_request_duration_ms_avg_5m{${labels}} ${stat.averageTime.toFixed(2)}`);
    }

    lines.push('# HELP http_route_requests_in_window_5m Request count per route+method over the trailing 5m.');
    lines.push('# TYPE http_route_requests_in_window_5m gauge');
    for (const [key, stat] of routeEntries) {
      const [method, ...routeParts] = key.split(' ');
      const route = routeParts.join(' ') || '/';
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}"`;
      lines.push(`http_route_requests_in_window_5m{${labels}} ${stat.count}`);
    }
  }

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(lines.join('\n') + '\n');
}
