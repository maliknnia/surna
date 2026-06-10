/** API origin — same host as the page unless Vite runs alone on :5173. */
export function apiOrigin(): string {
  if (typeof window === "undefined") return "";
  const { origin, hostname, port, protocol } = window.location;
  // Split dev: Vite on 5173, Express API on 5000
  if (port === "5173") {
    return `${protocol}//${hostname}:5000`;
  }
  // Unified dev (5000), LAN phone, or tunnel (443) — API is same origin
  return origin;
}

export function googleLoginUrl(next?: string): string {
  const base = `${apiOrigin()}/api/login?provider=google`;
  if (next && next.startsWith("/")) {
    return `${base}&next=${encodeURIComponent(next)}`;
  }
  return base;
}

/** Local dev: one-click session (requires LOCAL_AUTH_BYPASS on server). */
export function devQuickLoginUrl(next?: string): string {
  const base = `${apiOrigin()}/api/login?dev=1`;
  if (next && next.startsWith("/")) {
    return `${base}&next=${encodeURIComponent(next)}`;
  }
  return base;
}

export function loginPagePath(next?: string): string {
  if (!next || !next.startsWith("/")) return "/login";
  return `/login?next=${encodeURIComponent(next)}`;
}
