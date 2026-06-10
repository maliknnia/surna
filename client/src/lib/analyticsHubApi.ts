/** Analytics Hub fetch helpers (avoids broken queryKey.join with object segments). */

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAnalyticsDashboard(from: Date, to: Date) {
  const params = new URLSearchParams({
    startDate: from.toISOString(),
    endDate: to.toISOString(),
  });
  return fetchJson(`/api/analytics/dashboard?${params}`);
}

export async function fetchAnalyticsDailyMetrics(from: Date, to: Date) {
  const params = new URLSearchParams({
    startDate: from.toISOString(),
    endDate: to.toISOString(),
  });
  return fetchJson(`/api/analytics/daily-metrics?${params}`);
}

export async function fetchAnalyticsRealtime(): Promise<Record<string, unknown> | null> {
  return fetchJson<Record<string, unknown>>("/api/analytics/realtime");
}
