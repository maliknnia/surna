// Session CSRF token (double-submit cookie). Fetched after login; cleared on logout.

let cachedToken: string | null = null;

export function clearCsrfToken(): void {
  cachedToken = null;
}

export async function getCsrfToken(force = false): Promise<string> {
  if (!force && cachedToken) return cachedToken;
  const res = await fetch("/api/csrf-token", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const data = await res.json();
  cachedToken = data.csrfToken;
  return cachedToken as string;
}

/** Warm the CSRF cookie as soon as the user session is known. */
export function prefetchCsrfToken(): void {
  void getCsrfToken().catch(() => {
    /* not logged in yet */
  });
}

export function isCsrfError(status: number, body: string): boolean {
  return status === 403 && /invalid csrf/i.test(body);
}
