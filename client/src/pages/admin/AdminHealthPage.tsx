import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "./AdminLayout";
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Gauge,
  HeartPulse,
  Layers,
  Radio,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthSnapshot {
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

function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function HealthCard({
  icon: Icon,
  title,
  value,
  subtitle,
  breached,
  loading,
  testId,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle?: string;
  breached?: boolean;
  loading?: boolean;
  testId: string;
}) {
  if (loading) {
    return (
      <Card className="bg-[#2a0a2a] border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24 bg-muted/40" />
          <Skeleton className="h-8 w-8 rounded-full bg-muted/40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 bg-muted/40" />
          <Skeleton className="h-3 w-20 mt-2 bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-[#2a0a2a] border ${
        breached ? "border-red-500/60" : "border-border"
      }`}
      data-testid={testId}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[#f3efe8]/70">
          {title}
        </CardTitle>
        <Icon
          className={`h-8 w-8 ${
            breached ? "text-red-400" : "text-purple-400"
          }`}
        />
      </CardHeader>
      <CardContent>
        <div
          className={`text-3xl font-bold ${
            breached ? "text-red-300" : "text-[#f3efe8]"
          }`}
        >
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-[#f3efe8]/60 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface WorkerMetricsSnapshot {
  queueDepth: Record<string, number>;
  jobsFailedTotal: Record<string, number>;
  workerHeartbeatTimestampSeconds: number;
  heartbeatAgeSeconds: number | null;
  slo: {
    queueBacklogMax: number;
    heartbeatMaxAgeSec: number;
  };
  overloadedQueues: Array<{ name: string; depth: number }>;
  heartbeatStale: boolean;
  workerNeverSeen: boolean;
  generatedAt: string;
}

function formatHeartbeatAge(seconds: number | null): string {
  if (seconds === null) return "never";
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function AdminHealthPage() {
  const { data, isLoading, dataUpdatedAt, isError } = useQuery<HealthSnapshot>({
    queryKey: ["/api/admin/health-metrics"],
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  const {
    data: worker,
    isLoading: workerLoading,
    isError: workerError,
  } = useQuery<WorkerMetricsSnapshot>({
    queryKey: ["/api/admin/worker-metrics"],
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  const p95Breached =
    !!data && data.p95LatencyMs > data.slo.p95LatencyMaxMs;
  const errorBreached =
    !!data && data.errorRatePercent > data.slo.errorRateMaxPercent;
  const dbBreached =
    !!data &&
    data.dbPool.utilizationPercent > data.slo.dbPoolMaxUtilizationPercent;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-3xl font-bold text-[#f3efe8]"
              data-testid="health-title"
            >
              Production Health
            </h1>
            <p className="text-[#f3efe8]/60 mt-1">
              Live snapshot from /metrics. Auto-refreshes every 15s.
            </p>
          </div>
          {dataUpdatedAt > 0 && (
            <p
              className="text-xs text-[#f3efe8]/50"
              data-testid="health-last-updated"
            >
              Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {data?.degraded && (
          <div
            className="flex items-start gap-3 rounded-lg border border-red-500/60 bg-red-500/10 p-4"
            data-testid="health-degraded-banner"
          >
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-300">
                Service degraded — SLO breach detected
              </p>
              <ul className="mt-1 text-sm text-red-200/80 list-disc pl-5 space-y-0.5">
                {data.breaches.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {isError && !data && (
          <div
            className="rounded-lg border border-red-500/60 bg-red-500/10 p-4 text-red-300"
            data-testid="health-error"
          >
            Unable to load health metrics.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HealthCard
            icon={Clock}
            title="Uptime"
            value={data ? formatUptime(data.uptimeSeconds) : "—"}
            subtitle={
              data
                ? `${data.requestsInWindow5m} requests in last 5m`
                : undefined
            }
            loading={isLoading}
            testId="health-uptime"
          />
          <HealthCard
            icon={Gauge}
            title="p95 latency (5m)"
            value={data ? `${data.p95LatencyMs.toFixed(0)} ms` : "—"}
            subtitle={
              data
                ? `SLO ≤ ${data.slo.p95LatencyMaxMs} ms · p99 ${data.p99LatencyMs.toFixed(0)} ms`
                : undefined
            }
            breached={p95Breached}
            loading={isLoading}
            testId="health-p95"
          />
          <HealthCard
            icon={Activity}
            title="Error rate (5m)"
            value={data ? `${data.errorRatePercent.toFixed(2)}%` : "—"}
            subtitle={
              data
                ? `SLO ≤ ${data.slo.errorRateMaxPercent}% · 5xx ${data.serverErrorRatePercent.toFixed(2)}%`
                : undefined
            }
            breached={errorBreached}
            loading={isLoading}
            testId="health-error-rate"
          />
          <HealthCard
            icon={Database}
            title="DB pool"
            value={
              data
                ? `${data.dbPool.active} / ${data.dbPool.max}`
                : "—"
            }
            subtitle={
              data
                ? `${data.dbPool.utilizationPercent.toFixed(0)}% used · ${data.dbPool.idle} idle · ${data.dbPool.waiting} waiting`
                : undefined
            }
            breached={dbBreached}
            loading={isLoading}
            testId="health-db-pool"
          />
          <HealthCard
            icon={Radio}
            title="Socket.IO clients"
            value={data ? `${data.socketsConnected}` : "—"}
            subtitle="Connected on this instance"
            loading={isLoading}
            testId="health-sockets"
          />
        </div>

        <WorkerQueueSection
          worker={worker}
          loading={workerLoading}
          isError={workerError}
        />
      </div>
    </AdminLayout>
  );
}

function WorkerQueueSection({
  worker,
  loading,
  isError,
}: {
  worker: WorkerMetricsSnapshot | undefined;
  loading: boolean;
  isError: boolean;
}) {
  const queueNames = worker ? Object.keys(worker.queueDepth).sort() : [];
  const totalFailures = worker
    ? Object.values(worker.jobsFailedTotal).reduce((a, b) => a + b, 0)
    : 0;
  const maxDepth = worker
    ? Math.max(0, ...Object.values(worker.queueDepth))
    : 0;
  const depthBreached =
    !!worker && worker.overloadedQueues.length > 0;
  const heartbeatBreached = !!worker && worker.heartbeatStale;

  return (
    <div className="space-y-4" data-testid="worker-queue-section">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f3efe8]">
            Worker queue health
          </h2>
          <p className="text-sm text-[#f3efe8]/60 mt-1">
            BullMQ queue depth, recent failures, and worker heartbeat age.
          </p>
        </div>
        {worker?.generatedAt && (
          <p
            className="text-xs text-[#f3efe8]/50"
            data-testid="worker-generated-at"
          >
            Updated {new Date(worker.generatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {isError && !worker && (
        <div
          className="rounded-lg border border-red-500/60 bg-red-500/10 p-4 text-red-300"
          data-testid="worker-error"
        >
          Unable to load worker metrics.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HealthCard
          icon={Layers}
          title="Queue depth (max)"
          value={worker ? `${maxDepth}` : "—"}
          subtitle={
            worker
              ? `SLO ≤ ${worker.slo.queueBacklogMax} per queue · ${queueNames.length} queue(s)`
              : undefined
          }
          breached={depthBreached}
          loading={loading}
          testId="worker-queue-depth"
        />
        <HealthCard
          icon={XCircle}
          title="Jobs failed (total)"
          value={worker ? `${totalFailures}` : "—"}
          subtitle="Cumulative since worker start"
          loading={loading}
          testId="worker-jobs-failed"
        />
        <HealthCard
          icon={HeartPulse}
          title="Worker heartbeat"
          value={
            worker
              ? worker.workerNeverSeen
                ? "never"
                : formatHeartbeatAge(worker.heartbeatAgeSeconds)
              : "—"
          }
          subtitle={
            worker
              ? `SLO ≤ ${worker.slo.heartbeatMaxAgeSec}s${
                  worker.workerNeverSeen ? " · worker not running" : ""
                }`
              : undefined
          }
          breached={heartbeatBreached}
          loading={loading}
          testId="worker-heartbeat"
        />
      </div>

      {worker && queueNames.length > 0 && (
        <Card
          className="bg-[#2a0a2a] border-border"
          data-testid="worker-queue-table"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#f3efe8]/70">
              Per-queue breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#f3efe8]/60 border-b border-border">
                    <th className="py-2 pr-4 font-medium">Queue</th>
                    <th className="py-2 pr-4 font-medium">Depth</th>
                    <th className="py-2 pr-4 font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {queueNames.map((name) => {
                    const depth = worker.queueDepth[name] ?? 0;
                    const failed = worker.jobsFailedTotal[name] ?? 0;
                    const overloaded =
                      depth > worker.slo.queueBacklogMax;
                    return (
                      <tr
                        key={name}
                        className="border-b border-border/40 last:border-0"
                        data-testid={`worker-queue-row-${name}`}
                      >
                        <td className="py-2 pr-4 text-[#f3efe8]">{name}</td>
                        <td
                          className={`py-2 pr-4 font-mono ${
                            overloaded ? "text-red-300" : "text-[#f3efe8]"
                          }`}
                        >
                          {depth}
                        </td>
                        <td className="py-2 pr-4 font-mono text-[#f3efe8]">
                          {failed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
