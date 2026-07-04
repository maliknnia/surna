import type { MapPin } from "@/components/map/InteractiveMap";
import type { Coordinates } from "@/lib/geo";
import { flags } from "@/config/flags";
import { getEventCoverUrl } from "@/lib/eventCover";
import { DEMO_EVENTS, getDemoEvent } from "@/lib/demoEvents";
import { DEMO_PLACES, normalizeDemoPlaceId } from "@/lib/demoPlaces";
import { DEMO_SHOWCASE_LIMIT } from "@/lib/demoShowcase";

/** At most two showcase pins — only when demo map mode is explicitly on. */
export function generateDemoPins(center: Coordinates): MapPin[] {
  const lat = center.lat;
  const lng = center.lng;
  const pins: MapPin[] = [];

  DEMO_EVENTS.slice(0, DEMO_SHOWCASE_LIMIT).forEach((e, i) => {
    pins.push({
      id: e.id,
      type: "event",
      title: e.title,
      subtitle: e.sport,
      coords: { lat: lat + (i === 0 ? 0.004 : -0.003), lng: lng + (i === 0 ? -0.003 : 0.004) },
      data: {
        sport: e.sport,
        description: e.description,
        going_count: e.going_count,
        starts_at: e.starts_at,
        location: e.location,
      },
      coverUrl: getEventCoverUrl(e),
      hasStory: i === 0,
      storyState: i === 0 ? "new" : "none",
      presence: i === 0 ? "active" : "offline",
    });
  });

  if (pins.length >= DEMO_SHOWCASE_LIMIT) return pins;

  DEMO_PLACES.slice(0, DEMO_SHOWCASE_LIMIT - pins.length).forEach((p, i) => {
    pins.push({
      id: p.id,
      type: "place",
      title: p.name,
      subtitle: p.category,
      coords: {
        lat: p.latitude ?? lat + 0.002 * (i + 1),
        lng: p.longitude ?? lng + 0.002 * (i + 1),
      },
      data: {
        kind: p.category,
        sports: p.sports,
        rating: p.averageRating ? parseFloat(p.averageRating) : 4.8,
        description: p.description || p.bio,
        address: p.address,
      },
      coverUrl: p.coverImageUrl,
      iconUrl: p.profileImageUrl,
    });
  });

  return pins.slice(0, DEMO_SHOWCASE_LIMIT);
}

function isLikelyDemoAccount(id: string): boolean {
  return (
    id.startsWith("demo-") ||
    id.startsWith("ds-") ||
    id.includes("demo-user") ||
    /^d(pl|p|t|c|ch|e)\d+$/i.test(id)
  );
}

/** Ensure pins have avatar photos for Snap Map–style markers. */
export function enrichMapPinPhotos(pin: MapPin): MapPin {
  const d = pin.data || {};
  const fromData =
    pin.iconUrl?.trim() ||
    (d.profileImageUrl as string | undefined)?.trim() ||
    (d.logo as string | undefined)?.trim() ||
    (d.avatarUrl as string | undefined)?.trim() ||
    pin.coverUrl?.trim() ||
    (d.coverImageUrl as string | undefined)?.trim() ||
    (d.imageUrl as string | undefined)?.trim() ||
    "";

  if (fromData) {
    return {
      ...pin,
      iconUrl: pin.iconUrl?.trim() || fromData,
      coverUrl: pin.coverUrl?.trim() || fromData,
    };
  }

  const sportCover = getEventCoverUrl({
    sport: (d.sport as string | undefined) || pin.subtitle,
    title: pin.title,
    cover_url: pin.coverUrl,
    coverUrl: pin.coverUrl,
    imageUrl: d.imageUrl as string | undefined,
  });
  if (sportCover) {
    return { ...pin, iconUrl: sportCover, coverUrl: sportCover };
  }

  if (!isLikelyDemoAccount(pin.id)) {
    return pin;
  }

  return pin;
}

/** Resolve a deep-linked entity to the same coords as the visible demo pin. */
export function findDemoMapPin(
  type: string,
  id: string,
  center: Coordinates,
): MapPin | undefined {
  const pins = generateDemoPins(center);
  const exact = pins.find((p) => p.id === id && (p.type === type || (type === "player" && p.type === "person")));
  if (exact) return exact;
  const byId = pins.find((p) => p.id === id);
  if (byId) return byId;
  if (type === "event" && (id.startsWith("demo-ev-") || id.startsWith("demo-route-"))) {
    const ev = getDemoEvent(id);
    if (ev) {
      return pins.find((p) => p.type === "event" && p.id === ev.id);
    }
  }
  if (type === "place") {
    const normalized = normalizeDemoPlaceId(id);
    return pins.find((p) => p.type === "place" && p.id === normalized);
  }
  return undefined;
}

/** Demo pins only when explicitly enabled (dev by default). */
export function shouldUseDemoMapPins(): boolean {
  return flags.mapDemoPins;
}
