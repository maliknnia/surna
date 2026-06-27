import { ROUTES } from "@/navigation";
import { eventDetailPath } from "@/lib/eventRoutes";
import { getDemoEvent } from "@/lib/demoEvents";
import { findDemoMapPin } from "@/lib/demoMapPins";
import type { Coordinates } from "@/lib/geo";

export type MapEntityKind =
  | "event"
  | "place"
  | "team"
  | "coach"
  | "person"
  | "player"
  | "challenge"
  | "instant";

/** Canonical full-screen map (same UI everywhere — not home panel / places list). */
export function mapPath(opts?: {
  type?: MapEntityKind | string;
  id?: string;
  lat?: number;
  lng?: number;
}): string {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.id) params.set("id", opts.id);
  if (opts?.lat != null) params.set("lat", String(opts.lat));
  if (opts?.lng != null) params.set("lng", String(opts.lng));
  const q = params.toString();
  return q ? `${ROUTES.map}?${q}` : ROUTES.map;
}

/** Detail page for a specific entity (preferred for Join / View event / venue profile). */
export function entityPath(kind: MapEntityKind | string, id: string, meta?: { sport?: string }): string {
  switch (kind) {
    case "event":
      return eventDetailPath(id, meta?.sport);
    case "place":
      return ROUTES.place(id);
    case "team":
      return ROUTES.team(id);
    case "coach":
      return ROUTES.coach(id);
    case "person":
    case "player":
      return ROUTES.person(id);
    case "challenge":
      return ROUTES.challenge(id);
    case "instant":
      return ROUTES.instantTeam(id);
    default:
      return ROUTES.map;
  }
}

export type ContentLinkInput = {
  postType?: string | null;
  type?: string | null;
  eventId?: string | null;
  placeId?: string | null;
  teamId?: string | null;
  coachId?: string | null;
  userId?: string | null;
  challengeId?: string | null;
  entityKind?: MapEntityKind | string | null;
  entityId?: string | null;
};

/** Primary CTA (join, view event, view venue) vs optional map deep link. */
export function resolveContentLinks(input: ContentLinkInput): {
  primary?: string;
  map?: string;
  kind?: MapEntityKind;
  id?: string;
} {
  const postType = (input.postType || input.type || "").toLowerCase();

  let kind = (input.entityKind || "") as MapEntityKind | "";
  let id = input.entityId || "";

  if (!kind || !id) {
    if (input.eventId || postType === "event") {
      kind = "event";
      id = input.eventId || id;
    } else if (input.placeId || postType === "place") {
      kind = "place";
      id = input.placeId || id;
    } else if (input.teamId || postType === "team") {
      kind = "team";
      id = input.teamId || id;
    } else if (input.coachId || postType === "coach") {
      kind = "coach";
      id = input.coachId || id;
    } else if (input.challengeId || postType === "challenge") {
      kind = "challenge";
      id = input.challengeId || id;
    } else if (input.userId || postType === "person") {
      kind = "person";
      id = input.userId || id;
    }
  }

  if (!kind || !id) return {};

  return {
    kind: kind as MapEntityKind,
    id,
    primary: entityPath(kind, id),
    map: mapPath({ type: kind, id }),
  };
}

export function parseMapFocusFromSearch(search: string): {
  type: MapEntityKind;
  id: string;
  lat?: number;
  lng?: number;
} | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const type = (params.get("type") || params.get("focus") || "") as MapEntityKind;
  const id = params.get("id") || "";
  if (!type || !id) {
    const lat = params.get("lat");
    const lng = params.get("lng");
    if (lat && lng) {
      return {
        type: "event",
        id: "coords",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
    }
    return null;
  }
  const lat = params.get("lat");
  const lng = params.get("lng");
  return {
    type,
    id,
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
  };
}

/** Build a map pin when the entity is not in the viewport payload (demo/API). */
export function buildFocusPin(
  focus: { type: MapEntityKind; id: string; lat?: number; lng?: number },
  center: Coordinates,
): {
  id: string;
  type: MapEntityKind;
  title: string;
  subtitle?: string;
  coords: Coordinates;
  data: Record<string, unknown>;
} | null {
  if (focus.lat != null && focus.lng != null && !Number.isNaN(focus.lat) && !Number.isNaN(focus.lng)) {
    return {
      id: focus.id === "coords" ? "focus-coords" : focus.id,
      type: focus.type,
      title: "Selected location",
      coords: { lat: focus.lat, lng: focus.lng },
      data: {},
    };
  }

  const demo = findDemoMapPin(focus.type, focus.id, center);
  if (demo) {
    return {
      id: demo.id,
      type: demo.type as MapEntityKind,
      title: demo.title,
      subtitle: demo.subtitle,
      coords: demo.coords,
      data: demo.data ?? {},
    };
  }

  if (focus.type === "event" && focus.id.startsWith("demo-ev-")) {
    const ev = getDemoEvent(focus.id);
    if (!ev) return null;
    const seed = focus.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const angle = ((seed % 360) * Math.PI) / 180;
    const r = 0.005;
    return {
      id: ev.id,
      type: "event",
      title: ev.title,
      subtitle: ev.sport,
      coords: {
        lat: center.lat + Math.sin(angle) * r,
        lng: center.lng + Math.cos(angle) * r,
      },
      data: {
        sport: ev.sport,
        location: ev.location,
        starts_at: ev.starts_at,
        going_count: ev.going_count,
        description: ev.description,
      },
    };
  }

  const seed = focus.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = ((seed % 360) * Math.PI) / 180;
  const r = 0.004;
  return {
    id: focus.id,
    type: focus.type,
    title: "Selected",
    coords: {
      lat: center.lat + Math.sin(angle) * r,
      lng: center.lng + Math.cos(angle) * r,
    },
    data: {},
  };
}

export function matchPinToFocus(
  pins: Array<{ id: string; type: string }>,
  focus: { type: string; id: string },
): string | null {
  const exact = pins.find((p) => p.id === focus.id && p.type === focus.type);
  if (exact) return exact.id;
  const byId = pins.find((p) => p.id === focus.id);
  if (byId) return byId.id;
  if (focus.type === "event" && focus.id.startsWith("demo-ev-")) {
    const demo = getDemoEvent(focus.id);
    if (demo) {
      const byTitle = pins.find(
        (p) =>
          p.type === "event" &&
          "title" in p &&
          (p as { title?: string }).title?.toLowerCase().includes(demo.title.slice(0, 12).toLowerCase()),
      );
      if (byTitle) return byTitle.id;
    }
  }
  return null;
}
