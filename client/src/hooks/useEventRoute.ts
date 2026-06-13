import { useQuery } from "@tanstack/react-query";
import { generateDemoRoutes } from "@/lib/demoMapRoutes";
import { getDemoEvent, isDemoEventId } from "@/lib/demoEvents";
import { findDemoMapPin } from "@/lib/demoMapPins";
import { isRouteSport, normalizeRouteCoords } from "@/lib/eventRoutes";
import type { Coordinates } from "@/lib/geo";

const FALLBACK_CENTER: Coordinates = { lat: 51.8985, lng: -8.4756 };

type EventRouteResponse = {
  eventId: string;
  sport: string | null;
  routeCoordinates: unknown;
};

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

function demoCenterForEvent(eventId: string): Coordinates {
  const pin = findDemoMapPin("event", eventId, FALLBACK_CENTER);
  return pin?.coords ?? FALLBACK_CENTER;
}

function demoRouteForEvent(eventId: string, sport: string, center: Coordinates): Coordinates[] {
  const routes = generateDemoRoutes(center);
  const byId = routes.find((r) => r.id === eventId);
  if (byId) return byId.coordinates;

  const s = sport.toLowerCase();
  const bySport = routes.find((r) => {
    const rs = r.sportType.toLowerCase();
    if (s.includes("run") || s.includes("jog")) return rs.includes("run");
    if (s.includes("hik") || s.includes("trail")) return rs.includes("hik");
    if (s.includes("cycl") || s.includes("bike")) return rs.includes("cycl");
    return false;
  });
  return bySport?.coordinates ?? routes[0]!.coordinates;
}

export function useEventRoute(eventId?: string, sportHint?: string | null) {
  return useQuery({
    queryKey: ["event-route", eventId],
    queryFn: async (): Promise<Coordinates[]> => {
      if (!eventId) return [];

      if (isDemoEventId(eventId)) {
        const demo = getDemoEvent(eventId);
        const sport = demo?.sport ?? sportHint ?? "";
        if (!isRouteSport(sport)) return [];
        const center = demoCenterForEvent(eventId);
        return demoRouteForEvent(eventId, sport, center);
      }

      try {
        const data = await getJSON<EventRouteResponse>(`/api/events/${eventId}/route`);
        const coords = normalizeRouteCoords(data.routeCoordinates);
        if (coords.length >= 2) return coords;
      } catch {
        /* fall through to sport-based demo path */
      }

      if (isRouteSport(sportHint)) {
        return demoRouteForEvent(eventId, sportHint!, FALLBACK_CENTER);
      }

      return [];
    },
    enabled: !!eventId,
    staleTime: 60_000,
  });
}
