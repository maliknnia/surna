import { apiRequest } from "@/lib/queryClient";

export type StreamSession = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  streamerId?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export async function createStreamSession(body: {
  title: string;
  description?: string | null;
  streamType?: string;
  eventId?: string | null;
  teamId?: string | null;
}) {
  const res = await apiRequest("POST", "/api/streaming", body);
  return (await res.json()) as StreamSession;
}

export async function fetchStreamSession(id: string) {
  return fetchJson<StreamSession>(`/api/streams/${id}`);
}

export async function startStreamSession(id: string) {
  const res = await apiRequest("POST", `/api/streaming/${id}/start`);
  return res.json();
}

export async function endStreamSession(id: string) {
  const res = await apiRequest("POST", `/api/streaming/${id}/end`);
  return res.json();
}

export async function fetchStreamViewerCount(id: string) {
  const viewers = await fetchJson<unknown[]>(`/api/streaming/${id}/viewers`);
  return { count: Array.isArray(viewers) ? viewers.length : 0 };
}
