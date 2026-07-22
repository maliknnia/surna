import type { MapPin } from "@/components/map/InteractiveMap";
import type { Coordinates } from "@/lib/geo";
import { flags } from "@/config/flags";
import { getEventCoverUrl } from "@/lib/eventCover";
import { DEMO_EVENTS, getDemoEvent } from "@/lib/demoEvents";
import { DEMO_PLACES, normalizeDemoPlaceId } from "@/lib/demoPlaces";
import { DEMO_SHOWCASE_LIMIT, SHOWCASE_ATHLETES } from "@/lib/demoShowcase";

/** Person pins for map — showcase athletes near the viewport center. */
export function generateDemoPersonPins(center: Coordinates): MapPin[] {
  const offsets = [
    { lat: 0.0038, lng: -0.0042 },
    { lat: -0.0026, lng: 0.0035 },
    { lat: 0.0014, lng: 0.0051 },
  ];

  return SHOWCASE_ATHLETES.slice(0, DEMO_SHOWCASE_LIMIT).map((a, i) => {
    const off = offsets[i] ?? { lat: 0.002 * (i + 1), lng: -0.002 * (i + 1) };
    return {
      id: a.id,
      type: "person" as const,
      title: `${a.firstName} ${a.lastName}`,
      subtitle: a.sport,
      coords: { lat: center.lat + off.lat, lng: center.lng + off.lng },
      data: {
        sport: a.sport,
        username: a.username,
        bio: a.bio,
        location: a.location,
        profileImageUrl: a.profileImageUrl,
        firstName: a.firstName,
        lastName: a.lastName,
        isDemo: true,
      },
      iconUrl: a.profileImageUrl,
      coverUrl: a.coverImageUrl,
      hasStory: i === 0,
      storyState: i === 0 ? ("new" as const) : ("none" as const),
      presence: i === 0 ? ("active" as const) : ("idle" as const),
    };
  });
}

/** Event + place pins when the viewport is empty. */
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
        creator_avatar: e.creator_avatar,
        isDemo: true,
      },
      coverUrl: e.cover_url || getEventCoverUrl(e),
      iconUrl: e.creator_avatar,
      hasStory: i === 0,
      storyState: i === 0 ? "new" : "none",
      presence: i === 0 ? "active" : "offline",
    });
  });

  if (pins.length < DEMO_SHOWCASE_LIMIT) {
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
          isDemo: true,
        },
        coverUrl: p.coverImageUrl,
        iconUrl: p.profileImageUrl,
      });
    });
  }

  // Always include fake accounts with event/place demos
  const people = generateDemoPersonPins(center);
  const ids = new Set(pins.map((p) => p.id));
  for (const person of people) {
    if (!ids.has(person.id)) pins.push(person);
  }

  return pins;
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
  const pins = [...generateDemoPins(center), ...generateDemoPersonPins(center)];
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
  if ((type === "person" || type === "player") && id.startsWith("ds-")) {
    return pins.find((p) => p.id === id);
  }
  return undefined;
}

/** Demo pins when map demos are enabled (dev by default / env override). */
export function shouldUseDemoMapPins(): boolean {
  return flags.mapDemoPins;
}
