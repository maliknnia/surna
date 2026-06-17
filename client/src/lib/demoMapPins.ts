import type { MapPin } from "@/components/map/InteractiveMap";
import type { Coordinates } from "@/lib/geo";
import { flags } from "@/config/flags";
import { getEventCoverUrl } from "@/lib/eventCover";
import { getDemoEvent } from "@/lib/demoEvents";
import { DEMO_PLACES, normalizeDemoPlaceId } from "@/lib/demoPlaces";

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

let jitterSeed = 1;
function jitter(base: number, range: number) {
  jitterSeed++;
  return base + (seededRandom(jitterSeed) - 0.5) * range * 2;
}

function demoPhoto(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/surna-${seed}/${w}/${h}`;
}

/** Stable demo pins around `center` — ids match feed / notifications deep links. */
export function generateDemoPins(center: Coordinates): MapPin[] {
  jitterSeed = 1;
  const lat = center.lat;
  const lng = center.lng;
  const now = new Date();
  const pins: MapPin[] = [];

  const demoEvents: Array<{
    id?: string;
    title: string;
    sport: string;
    desc: string;
    going: number;
    location?: string;
  }> = [
    { id: "demo-ev-pickup-bball", title: "Pickup Basketball", sport: "Basketball", desc: "Casual round-robin, all levels welcome. Free entry, just show up!", going: 12, location: "Marina Courts · Cork" },
    { title: "Morning Yoga in the Park", sport: "Yoga", desc: "Free community yoga session, bring your own mat", going: 24 },
    { id: "demo-ev-5v5-soccer", title: "Soccer 5v5 Tournament", sport: "Soccer", desc: "Competitive 5-a-side tournament. €15 per team", going: 40, location: "Pairc Ui Chaoimh" },
    { title: "Tennis Doubles Mixer", sport: "Tennis", desc: "Social doubles round-robin, partners assigned randomly!", going: 8 },
    { title: "CrossFit Open Workout", sport: "CrossFit", desc: "Free community WOD, all fitness levels", going: 16 },
    { title: "Beach Volleyball Sunset", sport: "Volleyball", desc: "Casual beach volleyball, just show up and play!", going: 14 },
    { title: "MMA Sparring Session", sport: "MMA", desc: "Controlled sparring for intermediate fighters", going: 6 },
    { id: "demo-ev-trail-run", title: "Sunday Trail Run 12km", sport: "Running", desc: "All paces welcome · water at halfway.", going: 35, location: "Fitzgerald's Park" },
    { title: "Flag Football League", sport: "Football", desc: "Co-ed flag football, free to join", going: 28 },
    { title: "Swimming Laps & Drills", sport: "Swimming", desc: "Open swim session with coached drills", going: 10 },
  ];
  demoEvents.forEach((e, i) => {
    const demoMeta = e.id ? getDemoEvent(e.id) : undefined;
    pins.push({
      id: e.id || `de${i}`,
      type: "event",
      title: demoMeta?.title || e.title,
      subtitle: e.sport,
      coords: { lat: jitter(lat, 0.008 + i * 0.001), lng: jitter(lng, 0.008 + i * 0.001) },
      data: {
        sport: e.sport,
        description: demoMeta?.description || e.desc,
        going_count: demoMeta?.going_count ?? e.going,
        starts_at: demoMeta?.starts_at || new Date(now.getTime() + (i + 1) * 3600000).toISOString(),
        location: demoMeta?.location || e.location || `Nearby Venue ${i + 1}`,
        maxParticipants: 24 + i * 4,
      },
      coverUrl: demoPhoto(`event-${i}`, 800, 480),
      hasStory: i < 3,
      storyState: i === 0 ? "new" : i === 1 ? "seen" : i === 2 ? "live" : "none",
      presence: i === 0 ? "active" : "offline",
    });
  });

  DEMO_PLACES.forEach((p, i) => {
    const latCoord = p.latitude ?? jitter(lat, 0.006 + i * 0.001);
    const lngCoord = p.longitude ?? jitter(lng, 0.006 + i * 0.001);
    pins.push({
      id: p.id,
      type: "place",
      title: p.name,
      subtitle: p.category,
      coords: { lat: latCoord, lng: lngCoord },
      data: {
        kind: p.category,
        sports: p.sports,
        rating: p.averageRating ? parseFloat(p.averageRating) : 4.5,
        description: p.description || p.bio,
        address: p.address || "Cork city centre",
        hourlyRate: 12 + i,
      },
      coverUrl: p.coverImageUrl || demoPhoto(`place-${i}`, 800, 480),
      iconUrl: p.profileImageUrl || demoPhoto(`place-av-${i}`, 200, 200),
      hasStory: i === 0,
      storyState: i === 0 ? "new" : "none",
    });
  });

  const demoTeams = [
    { name: "Cork FC United", sport: "Soccer", members: 18 },
    { name: "Rebel Athletic", sport: "Basketball", members: 12 },
    { name: "Leeside United", sport: "Running", members: 25 },
    { name: "Munster Rugby Club", sport: "Rugby", members: 20 },
    { name: "Shandon CrossFit Crew", sport: "CrossFit", members: 8 },
  ];
  demoTeams.forEach((t, i) => {
    pins.push({
      id: `dt${i}`,
      type: "team",
      title: t.name,
      subtitle: t.sport,
      coords: { lat: jitter(lat, 0.009 + i * 0.001), lng: jitter(lng, 0.009 + i * 0.001) },
      data: { sport: t.sport, memberCount: t.members, description: `${t.name} — competitive ${t.sport.toLowerCase()} squad` },
      coverUrl: demoPhoto(`team-${i}`, 800, 480),
      iconUrl: demoPhoto(`team-av-${i}`, 200, 200),
      hasStory: i < 2,
      storyState: i === 0 ? "new" : i === 1 ? "seen" : "none",
    });
  });

  const demoCoaches = [
    { name: "Coach Mike", sport: "Basketball", rating: 4.9, specialty: "Youth Development" },
    { name: "Coach Elena", sport: "Tennis", rating: 5.0, specialty: "Competition Prep" },
    { name: "Coach Jay", sport: "MMA", rating: 4.8, specialty: "Striking" },
    { name: "Coach Sara", sport: "Yoga", rating: 4.7, specialty: "Vinyasa Flow" },
  ];
  demoCoaches.forEach((c, i) => {
    pins.push({
      id: `dc${i}`,
      type: "coach",
      title: c.name,
      subtitle: c.specialty,
      coords: { lat: jitter(lat, 0.007 + i * 0.001), lng: jitter(lng, 0.007 + i * 0.001) },
      data: { sport: c.sport, rating: c.rating, specialty: c.specialty },
      iconUrl: demoPhoto(`coach-av-${i}`, 200, 200),
      coverUrl: demoPhoto(`coach-${i}`, 800, 480),
    });
  });

  const demoPlayers = [
    { name: "alex_hoops", activity: "Playing Basketball", sport: "Basketball" },
    { name: "run_jenny", activity: "Running 5K", sport: "Running" },
    { name: "mat_warrior", activity: "Training BJJ", sport: "MMA" },
    { name: "swim_fast", activity: "Swimming Laps", sport: "Swimming" },
    { name: "tennis_ace", activity: "Playing Doubles", sport: "Tennis" },
    { name: "lift_heavy", activity: "At the Gym", sport: "CrossFit" },
    { name: "soccer_king", activity: "Playing Soccer", sport: "Soccer" },
    { name: "yoga_flow", activity: "Yoga Session", sport: "Yoga" },
    { name: "volley_spike", activity: "Beach Volleyball", sport: "Volleyball" },
    { name: "box_champ", activity: "Sparring", sport: "Boxing" },
    { name: "trail_runner", activity: "Trail Running", sport: "Running" },
    { name: "hoop_dreams", activity: "Shooting Around", sport: "Basketball" },
  ];
  demoPlayers.forEach((p, i) => {
    pins.push({
      id: `dpl${i}`,
      type: "person",
      title: p.name,
      subtitle: p.activity,
      coords: { lat: jitter(lat, 0.004 + i * 0.0005), lng: jitter(lng, 0.004 + i * 0.0005) },
      data: { sport: p.sport, currentActivity: p.activity, username: p.name },
      iconUrl: demoPhoto(`player-av-${p.name}`, 200, 200),
      coverUrl: demoPhoto(`player-${p.name}`, 800, 480),
      presence: i % 3 === 0 ? "active" : i % 3 === 1 ? "idle" : "offline",
      hasStory: i < 4,
      storyState: i === 0 ? "new" : i < 3 ? "seen" : "none",
    });
  });

  const demoChallenges = [
    { title: "3-Point Challenge", sport: "Basketball", status: "live", participants: 8 },
    { title: "1v1 Tennis Showdown", sport: "Tennis", status: "pending", participants: 2 },
    { title: "Sprint Challenge", sport: "Running", status: "live", participants: 4 },
  ];
  demoChallenges.forEach((c, i) => {
    pins.push({
      id: `dch${i}`,
      type: "challenge",
      title: c.title,
      subtitle: `${c.sport} · ${c.status}`,
      coords: { lat: jitter(lat, 0.006 + i * 0.002), lng: jitter(lng, 0.006 + i * 0.002) },
      data: { sport: c.sport, status: c.status, participants: c.participants },
      coverUrl: demoPhoto(`challenge-${i}`, 800, 480),
      presence: c.status === "live" ? "active" : "offline",
    });
  });

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

  const seed = pin.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const avatar = demoPhoto(`map-${seed}`, 200, 200);
  const banner = demoPhoto(`map-cover-${seed}`, 800, 480);

  return {
    ...pin,
    iconUrl: avatar,
    coverUrl: banner,
  };
}

/** Resolve a deep-linked entity to the same coords as the visible demo pin. */
export function findDemoMapPin(
  type: string,
  id: string,
  center: Coordinates,
): MapPin | undefined {
  const pins = generateDemoPins(center);
  const exact = pins.find((p) => p.id === id && (p.type === type || type === "player" && p.type === "person"));
  if (exact) return exact;
  const byId = pins.find((p) => p.id === id);
  if (byId) return byId;
  if (type === "event" && (id.startsWith("demo-ev-") || id.startsWith("demo-route-"))) {
    const ev = getDemoEvent(id);
    if (ev) {
      const byTitle = pins.find(
        (p) => p.type === "event" && p.title.toLowerCase().includes(ev.title.slice(0, 10).toLowerCase()),
      );
      if (byTitle) return { ...byTitle, id, title: ev.title, data: { ...byTitle.data, ...ev } };
    }
  }
  if (type === "place") {
    const normalized = normalizeDemoPlaceId(id);
    const byPlaceId = pins.find((p) => p.type === "place" && p.id === normalized);
    if (byPlaceId) return { ...byPlaceId, id: normalized };
  }
  return undefined;
}

/** Demo pins only when explicitly enabled (dev by default). */
export function shouldUseDemoMapPins(): boolean {
  return flags.mapDemoPins;
}
