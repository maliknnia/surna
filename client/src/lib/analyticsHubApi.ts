/** Analytics Hub fetch helpers — maps server responses to chart-ready shapes. */

import type {
  DashboardMetrics,
  RealTimeData,
  TimeSeriesData,
} from "../../../shared/performance-types";

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

function formatChartLabel(date: string): string {
  try {
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return date;
  }
}

export function emptyDashboardMetrics(): DashboardMetrics {
  return {
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    totalSessions: 0,
    avgSessionDuration: 0,
    totalPageViews: 0,
    totalPosts: 0,
    totalEvents: 0,
    totalTeamJoins: 0,
    totalRevenue: 0,
    bounceRate: 0,
    conversionRate: 0,
    retentionRate: 0,
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    avgSessionLength: 0,
  };
}

export function emptyTimeSeries() {
  return {
    userActivity: [] as TimeSeriesData[],
    userGrowth: [] as TimeSeriesData[],
    contentEngagement: [] as TimeSeriesData[],
    dailyMetrics: [] as TimeSeriesData[],
  };
}

export function emptyRealtime(): RealTimeData {
  return {
    activeUsers: 0,
    recentEvents: 0,
    timestamp: new Date().toISOString(),
    systemStatus: "operational",
  };
}

function normalizeDashboardMetrics(raw: Record<string, unknown>): DashboardMetrics {
  const base = emptyDashboardMetrics();
  return {
    ...base,
    totalUsers: Number(raw.totalUsers ?? 0),
    activeUsers: Number(raw.activeUsers ?? raw.dailyActiveUsers ?? 0),
    newUsers: Number(raw.newUsers ?? 0),
    totalSessions: Number(raw.totalSessions ?? 0),
    avgSessionDuration: Number(raw.avgSessionDuration ?? raw.avgSessionLength ?? 0),
    totalPageViews: Number(raw.totalPageViews ?? 0),
    totalPosts: Number(raw.totalPosts ?? 0),
    totalEvents: Number(raw.totalEvents ?? 0),
    totalTeamJoins: Number(raw.totalTeamJoins ?? 0),
    totalRevenue: Number(raw.totalRevenue ?? 0),
    bounceRate: Number(raw.bounceRate ?? 0),
    conversionRate: Number(raw.conversionRate ?? 0),
    retentionRate: Number(raw.retentionRate ?? 0),
    dailyActiveUsers: Number(raw.dailyActiveUsers ?? raw.activeUsers ?? 0),
    weeklyActiveUsers: Number(raw.weeklyActiveUsers ?? 0),
    monthlyActiveUsers: Number(raw.monthlyActiveUsers ?? 0),
    avgSessionLength: Number(raw.avgSessionLength ?? raw.avgSessionDuration ?? 0),
  };
}

function normalizeTimeSeries(raw: Record<string, unknown>) {
  const userActivity = (Array.isArray(raw.userActivity) ? raw.userActivity : []).map(
    (row: Record<string, unknown>) => ({
      date: String(row.date ?? ""),
      label: formatChartLabel(String(row.date ?? "")),
      value: Number(row.activeUsers ?? row.value ?? 0),
      activeUsers: Number(row.activeUsers ?? 0),
      newUsers: Number(row.newUsers ?? 0),
    }),
  );

  const userGrowth = (Array.isArray(raw.userGrowth) ? raw.userGrowth : []).map(
    (row: Record<string, unknown>) => ({
      date: String(row.date ?? ""),
      label: formatChartLabel(String(row.date ?? "")),
      value: Number(row.newUsers ?? row.activeUsers ?? row.value ?? 0),
    }),
  );

  const contentEngagement = (Array.isArray(raw.contentEngagement) ? raw.contentEngagement : []).map(
    (row: Record<string, unknown>) => ({
      date: String(row.date ?? ""),
      label: formatChartLabel(String(row.date ?? "")),
      value: Number(row.interactions ?? row.posts ?? row.value ?? 0),
      posts: Number(row.posts ?? 0),
      events: Number(row.events ?? 0),
    }),
  );

  const dailyMetrics = userActivity.map((row) => ({
    date: row.date,
    label: row.label,
    value: row.value,
    dailyActiveUsers: row.activeUsers,
    newUsers: row.newUsers,
  }));

  return { userActivity, userGrowth, contentEngagement, dailyMetrics };
}

function normalizeRealtime(raw: Record<string, unknown>): RealTimeData {
  return {
    activeUsers: Number(raw.activeUsers ?? raw.liveUsers ?? 0),
    recentEvents: Number(raw.recentEvents ?? 0),
    timestamp:
      typeof raw.timestamp === "string"
        ? raw.timestamp
        : raw.timestamp instanceof Date
          ? raw.timestamp.toISOString()
          : new Date().toISOString(),
    systemStatus: (raw.systemStatus as RealTimeData["systemStatus"]) ?? "operational",
  };
}

export async function fetchAnalyticsDashboard(from: Date, to: Date): Promise<DashboardMetrics> {
  const params = new URLSearchParams({
    startDate: from.toISOString(),
    endDate: to.toISOString(),
  });
  const raw = await fetchJson<Record<string, unknown>>(`/api/analytics/dashboard-metrics?${params}`);
  return raw ? normalizeDashboardMetrics(raw) : emptyDashboardMetrics();
}

export async function fetchAnalyticsDailyMetrics(from: Date, to: Date) {
  const params = new URLSearchParams({
    startDate: from.toISOString(),
    endDate: to.toISOString(),
  });
  const raw = await fetchJson<Record<string, unknown>>(`/api/analytics/time-series?${params}`);
  return raw ? normalizeTimeSeries(raw) : emptyTimeSeries();
}

export async function fetchAnalyticsRealtime(): Promise<RealTimeData> {
  const raw = await fetchJson<Record<string, unknown>>("/api/analytics/realtime");
  return raw ? normalizeRealtime(raw) : emptyRealtime();
}
