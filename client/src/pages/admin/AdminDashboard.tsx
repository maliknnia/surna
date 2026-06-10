import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "./AdminLayout";
import {
  Users,
  FileText,
  Shield,
  ShoppingBag,
  AlertCircle,
  TrendingUp,
  Activity,
  DollarSign,
  Calendar,
  Workflow,
  HeartPulse,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardStats {
  totalUsers: number;
  bannedUsers: number;
  flaggedPosts: number;
  pendingTeams: number;
  pendingEvents: number;
  pendingShops: number;
  totalRevenue: string;
  activeWallets: number;
}

interface QueueItem {
  id: string;
  type: string;
  title: string;
  priority: string;
  createdAt: string;
}

interface WorkerMetrics {
  queueDepth: Record<string, number>;
  jobsFailedTotal: Record<string, number>;
  workerHeartbeatTimestampSeconds: number;
  heartbeatAgeSeconds: number | null;
  slo: { queueBacklogMax: number; heartbeatMaxAgeSec: number };
  overloadedQueues: Array<{ name: string; depth: number }>;
  heartbeatStale: boolean;
  workerNeverSeen: boolean;
  generatedAt: string;
}

function formatHeartbeat(workerNeverSeen: boolean, ageSec: number | null): string {
  if (workerNeverSeen) return "no heartbeat yet";
  if (ageSec === null) return "—";
  if (ageSec < 90) return `${ageSec.toFixed(0)}s ago`;
  const mins = ageSec / 60;
  if (mins < 90) return `${mins.toFixed(0)}m ago`;
  return `${(mins / 60).toFixed(1)}h ago`;
}

function WorkerHealthCard({ data, loading }: { data?: WorkerMetrics; loading: boolean }) {
  if (loading) {
    return (
      <Card className="bg-[#2a0a2a] border-border">
        <CardHeader>
          <Skeleton className="h-5 w-40 bg-muted/40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full bg-muted/40" />
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  // Worst-first sort so the busiest queues are visible without scrolling.
  const queues = Object.entries(data.queueDepth).sort((a, b) => b[1] - a[1]);
  const totalDepth = queues.reduce((s, [, d]) => s + d, 0);
  const totalFailed = Object.values(data.jobsFailedTotal).reduce((s, n) => s + n, 0);
  const degraded = data.heartbeatStale || data.overloadedQueues.length > 0;

  return (
    <Card
      className={`bg-[#2a0a2a] border ${degraded ? "border-red-500/60" : "border-border"}`}
      data-testid="worker-health-card"
    >
      <CardHeader>
        <CardTitle className="text-[#f3efe8] flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Worker Queues
          {degraded && (
            <Badge className="ml-2 bg-red-500/20 text-red-300 border-red-500/30">
              degraded
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.workerNeverSeen ? (
          <p className="text-sm text-[#f3efe8]/60">
            Workers haven't reported in. This is expected when Redis isn't
            configured (dev / autoscale instance with workers off).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-xs text-[#f3efe8]/60">Total backlog</p>
                <p className="text-2xl font-bold text-[#f3efe8]" data-testid="worker-total-depth">
                  {totalDepth}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#f3efe8]/60">Failed (since boot)</p>
                <p className="text-2xl font-bold text-[#f3efe8]">{totalFailed}</p>
              </div>
              <div>
                <p className="text-xs text-[#f3efe8]/60">Heartbeat</p>
                <p
                  className={`text-2xl font-bold ${
                    data.heartbeatStale ? "text-red-300" : "text-[#f3efe8]"
                  }`}
                  data-testid="worker-heartbeat-age"
                >
                  {formatHeartbeat(data.workerNeverSeen, data.heartbeatAgeSeconds)}
                </p>
              </div>
            </div>
            {queues.length > 0 ? (
              <div className="space-y-1.5">
                {queues.map(([name, depth]) => {
                  const overloaded = depth > data.slo.queueBacklogMax;
                  const failed = data.jobsFailedTotal[name] || 0;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between text-sm rounded-md px-2 py-1"
                      style={{ background: overloaded ? "rgba(239,68,68,0.08)" : "transparent" }}
                      data-testid={`worker-queue-${name}`}
                    >
                      <span className={overloaded ? "text-red-300 font-medium" : "text-[#f3efe8]/80"}>
                        {name}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className={overloaded ? "text-red-300" : "text-[#f3efe8]/60"}>
                          {depth} pending
                        </span>
                        {failed > 0 && (
                          <span className="text-amber-300/80 text-xs">{failed} failed</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#f3efe8]/60">No queues registered.</p>
            )}
            <p className="text-[10px] text-[#f3efe8]/40 mt-3">
              SLO: backlog ≤ {data.slo.queueBacklogMax} per queue · heartbeat ≤
              {" "}{data.slo.heartbeatMaxAgeSec}s ·{" "}
              <Link href="/admin/health">
                <a className="underline hover:text-[#f3efe8]/70">open health dashboard</a>
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  loading,
}: {
  icon: any;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  loading?: boolean;
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
    <Card className="bg-[#2a0a2a] border-border" data-testid={`stat-${title.toLowerCase()}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[#f3efe8]/70">{title}</CardTitle>
        <Icon className="h-8 w-8 text-purple-400" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[#f3efe8]">{value}</div>
        {subtitle && <p className="text-xs text-[#f3efe8]/60 mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-500">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Worker metrics polled every 30s — slow enough to be cheap, fast enough
  // that an on-call admin sees a backed-up queue within a normal page visit.
  const { data: workerMetrics, isLoading: workerLoading } = useQuery<WorkerMetrics>({
    queryKey: ["/api/admin/worker-metrics"],
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  const { data: queues, isLoading: queuesLoading } = useQuery<{ queues: QueueItem[] }>({
    queryKey: ["/api/admin/queues"],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f3efe8]">Admin Dashboard</h1>
          <p className="text-[#f3efe8]/60 mt-1">
            Monitor and moderate SURNA platform activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            title="Total Users"
            value={stats?.totalUsers || 0}
            subtitle={`${stats?.bannedUsers || 0} banned`}
            loading={statsLoading}
          />
          <StatCard
            icon={FileText}
            title="Flagged Posts"
            value={stats?.flaggedPosts || 0}
            subtitle="Require review"
            loading={statsLoading}
          />
          <StatCard
            icon={Shield}
            title="Pending Teams"
            value={stats?.pendingTeams || 0}
            subtitle="Awaiting verification"
            loading={statsLoading}
          />
          <StatCard
            icon={DollarSign}
            title="Total Revenue"
            value={stats?.totalRevenue || "€0"}
            subtitle={`${stats?.activeWallets || 0} active wallets`}
            loading={statsLoading}
          />
        </div>

        {/* Activity Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-[#2a0a2a] border-border">
            <CardHeader>
              <CardTitle className="text-[#f3efe8] flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pending Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-400">
                {statsLoading ? <Skeleton className="h-10 w-16 bg-muted/40" /> : stats?.pendingEvents || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2a0a2a] border-border">
            <CardHeader>
              <CardTitle className="text-[#f3efe8] flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Pending Shops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-pink-400">
                {statsLoading ? <Skeleton className="h-10 w-16 bg-muted/40" /> : stats?.pendingShops || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2a0a2a] border-border">
            <CardHeader>
              <CardTitle className="text-[#f3efe8] flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Wallets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {statsLoading ? <Skeleton className="h-10 w-16 bg-muted/40" /> : stats?.activeWallets || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Background workers */}
        <WorkerHealthCard data={workerMetrics} loading={workerLoading} />

        {/* Moderation Queues */}
        <Card className="bg-[#2a0a2a] border-border">
          <CardHeader>
            <CardTitle className="text-[#f3efe8]">Moderation Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {queuesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-muted/40" />
                ))}
              </div>
            ) : queues?.queues && queues.queues.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {queues.queues.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4"
                      data-testid={`queue-item-${item.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium text-[#f3efe8]">{item.title}</p>
                          <p className="text-sm text-[#f3efe8]/60">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={item.priority === "high" ? "destructive" : "secondary"}
                          className={
                            item.priority === "high"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {item.priority}
                        </Badge>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-[#f3efe8]/60">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-[#f3efe8]/30" />
                <p>No pending items in moderation queue</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
