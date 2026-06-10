// client/src/hooks/useEvents.ts
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { demoEventToApiRow, getDemoEvent, isDemoEventId } from "@/lib/demoEvents";

type EventRow = {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  visibility: "public" | "private" | "unlisted";
  capacity?: number | null;
  cover_media_id?: string | null;
  created_at: string;
  cover_url?: string | null;
  cover_medium_url?: string | null;
  cover_thumb_url?: string | null;
  creator_username?: string | null;
  creator_first_name?: string | null;
  creator_avatar?: string | null;
  going_count?: number;
  interested_count?: number;
  total_rsvps?: number;
  attendees?: any[];
};

type EventsPage = {
  items: EventRow[];
  nextCursor: { cursorStartsAt: string; cursorId: string } | null;
};

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function useEventsList(params?: { from?: string; to?: string; q?: string; category?: string; lat?: number; lng?: number; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.q) search.set("q", params.q);
  if (params?.category) search.set("category", params.category);
  // Only add lat/lng if both are provided
  if (params?.lat !== undefined && params?.lng !== undefined) {
    search.set("lat", String(params.lat));
    search.set("lng", String(params.lng));
  }
  search.set("limit", String(params?.limit ?? 20));

  return useInfiniteQuery<EventsPage, Error>({
    queryKey: ["events", params],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams(search);
      if (pageParam && typeof pageParam === 'object' && 'cursorStartsAt' in pageParam) {
        p.set("cursorStartsAt", (pageParam as any).cursorStartsAt);
      }
      if (pageParam && typeof pageParam === 'object' && 'cursorId' in pageParam) {
        p.set("cursorId", (pageParam as any).cursorId);
      }
      return getJSON<EventsPage>("/api/events?" + p.toString());
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useEvent(id?: string) {
  return useQuery<EventRow, Error>({
    queryKey: ["event", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing event id");
      if (isDemoEventId(id)) {
        const demo = getDemoEvent(id);
        if (!demo) throw new Error("Event not found");
        return demoEventToApiRow(demo) as EventRow;
      }
      return getJSON<EventRow>(`/api/events/${id}`);
    },
    enabled: !!id,
    retry: (failureCount, error) => {
      if (id && isDemoEventId(id)) return false;
      return failureCount < 2;
    },
  });
}

export function useRSVP(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { status: "going" | "interested" | "not_going" | "waitlist"; issueTicket?: boolean }) => {
      if (isDemoEventId(eventId)) {
        return {
          status: payload.status,
          ticket: payload.issueTicket ? { code: `DEMO-${eventId.slice(-4).toUpperCase()}` } : null,
        };
      }
      return getJSON(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["my-rsvps"] });
    },
  });
}

export function useMyRSVPs() {
  return useQuery<{ items: any[] }, Error>({
    queryKey: ["my-rsvps"],
    queryFn: () => getJSON(`/api/events/me/rsvps`),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventData: {
      title: string;
      description?: string;
      startsAt: string;
      endsAt: string;
      location?: string;
      lat?: number;
      lng?: number;
      locationDetail?: Record<string, unknown>;
      visibility?: "public" | "private" | "unlisted";
      capacity?: number;
      coverMediaId?: string;
    }) => {
      return getJSON("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}