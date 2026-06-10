import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { clearCsrfToken, getCsrfToken, isCsrfError } from "./csrf";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function csrfHeaders(method: string): Promise<Record<string, string>> {
  if (method === "GET" || method === "HEAD") return {};
  const token = await getCsrfToken();
  return { "x-csrf-token": token };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  Object.assign(headers, await csrfHeaders(method));

  const doFetch = () =>
    fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

  let res = await doFetch().finally(() => clearTimeout(timeout));

  if (!res.ok && method !== "GET" && method !== "HEAD") {
    const text = await res.text();
    if (isCsrfError(res.status, text)) {
      clearCsrfToken();
      Object.assign(headers, await csrfHeaders(method));
      res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    } else {
      throw new Error(`${res.status}: ${text}`);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

/** Multipart uploads — do not set Content-Type (browser sets boundary). */
export async function apiFormRequest(method: string, url: string, body: FormData): Promise<Response> {
  const headers = await csrfHeaders(method);
  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
