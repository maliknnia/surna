/** When set, disables rate limits and bot blocking for load/soak runs only. */
export function isLoadTestMode(): boolean {
  return process.env.LOAD_TEST === "1" || process.env.LOADTEST_BYPASS === "1";
}

export function isHealthProbePath(path: string): boolean {
  return (
    path === "/api/ping" ||
    path === "/healthz" ||
    path === "/health" ||
    path.startsWith("/health/") ||
    path === "/health/live" ||
    path === "/health/ready"
  );
}
