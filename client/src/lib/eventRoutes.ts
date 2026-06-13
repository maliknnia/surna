import type { Coordinates } from "@/lib/geo";
import { calculateDistance } from "@/lib/geo";
import { ROUTES } from "@/navigation";
import type { MapRoute } from "@/components/map/surnaMapRoutes";
import { generateDemoRoutes } from "@/lib/demoMapRoutes";
import { getDemoEvent, isDemoEventId } from "@/lib/demoEvents";
import { findDemoMapPin } from "@/lib/demoMapPins";

const MAP_ROUTE_FOCUS_KEY = "surna-map-route-focus";
const FALLBACK_CENTER: Coordinates = { lat: 51.8985, lng: -8.4756 };

/** Sports that use the full-screen route detail flow. */
export function isRouteSport(sport: string | null | undefined): boolean {
  if (!sport) return false;
  const s = sport.toLowerCase();
  return (
    s.includes("cycl") ||
    s.includes("bike") ||
    s.includes("run") ||
    s.includes("jog") ||
    s.includes("hik") ||
    s.includes("trail")
  );
}

export function eventDetailPath(eventId: string, sport?: string | null): string {
  if (isRouteSport(sport)) return ROUTES.eventRoute(eventId);
  return ROUTES.event(eventId);
}

export function pathDistanceKm(coords: Coordinates[]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += calculateDistance(coords[i - 1]!, coords[i]!);
  }
  return total;
}

export function estimateDurationMinutes(sport: string, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  const s = sport.toLowerCase();
  let speedKmh = 20;
  if (s.includes("run") || s.includes("jog")) speedKmh = 10;
  else if (s.includes("hik") || s.includes("walk") || s.includes("trail")) speedKmh = 4;
  else if (s.includes("cycl") || s.includes("bike")) speedKmh = 20;
  return Math.round((distanceKm / speedKmh) * 60);
}

export function formatRouteDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function normalizeRouteCoords(raw: unknown): Coordinates[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: Coordinates[] = [];
  for (const point of raw) {
    if (Array.isArray(point) && point.length >= 2) {
      const lat = Number(point[0]);
      const lng = Number(point[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
      continue;
    }
    if (point && typeof point === "object") {
      const p = point as { lat?: unknown; lng?: unknown };
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
    }
  }
  return out;
}

export function eventCoordsFromRow(ev: Record<string, unknown>): Coordinates | null {
  const lat = Number(ev.lat ?? ev.latitude);
  const lng = Number(ev.lng ?? ev.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

export function storeMapRouteFocus(route: MapRoute): void {
  try {
    sessionStorage.setItem(MAP_ROUTE_FOCUS_KEY, JSON.stringify(route));
  } catch {
    /* ignore */
  }
}

export function consumeMapRouteFocus(): MapRoute | null {
  try {
    const raw = sessionStorage.getItem(MAP_ROUTE_FOCUS_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(MAP_ROUTE_FOCUS_KEY);
    const parsed = JSON.parse(raw) as MapRoute;
    if (!parsed?.coordinates?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function demoRouteCoordinates(eventId: string, sport: string, center: Coordinates): Coordinates[] {
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

export async function resolveEventRouteCoordinates(
  ev: Record<string, unknown>,
): Promise<Coordinates[]> {
  const fromRow = normalizeRouteCoords(ev.route_coordinates ?? ev.routeCoordinates);
  if (fromRow.length >= 2) return fromRow;

  const eventId = String(ev.id ?? "");
  const sport = String(ev.sport ?? "");

  if (isDemoEventId(eventId)) {
    const demo = getDemoEvent(eventId);
    const demoSport = demo?.sport ?? sport;
    const center =
      eventCoordsFromRow(ev) ??
      findDemoMapPin("event", eventId, FALLBACK_CENTER)?.coords ??
      FALLBACK_CENTER;
    return demoRouteCoordinates(eventId, demoSport, center);
  }

  try {
    const res = await fetch(`/api/events/${eventId}/route`, { credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as { routeCoordinates?: unknown };
      const coords = normalizeRouteCoords(data.routeCoordinates);
      if (coords.length >= 2) return coords;
    }
  } catch {
    /* fall through */
  }

  if (isRouteSport(sport)) {
    const center =
      eventCoordsFromRow(ev) ??
      findDemoMapPin("event", eventId, FALLBACK_CENTER)?.coords ??
      FALLBACK_CENTER;
    return demoRouteCoordinates(eventId, sport, center);
  }

  return [];
}
