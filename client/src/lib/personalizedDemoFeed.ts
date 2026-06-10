/**
 * Rotating demo stories & posts — order changes per session / home refresh.
 */

import { postCardTintGradient } from "@/lib/postCardBackground";
import { entityPath, mapPath, type MapEntityKind } from "@/lib/mapNavigation";

export type HomeBlockId =
  | "challenge"
  | "coaches"
  | "crew"
  | "eventSpotlight"
  | "eventsRow"
  | "feedQuote"
  | "happeningTeams"
  | "marketplace"
  | "mediaCard"
  | "partnerBrands"
  | "placesBrowse"
  | "rewards"
  | "sportsPick";

export const HOME_MEDIA_SECTION_TITLES = [
  "From the feed",
  "Trending near you",
  "Community spotlight",
  "This week in sport",
] as const;

export const DEMO_BRAND_PARTNERS = [
  { id: "b1", name: "SURNA Pro", tagline: "Gear & recovery", sport: "Fitness" },
  { id: "b2", name: "CourtLab", tagline: "Basketball training", sport: "Basketball" },
  { id: "b3", name: "FlowState", tagline: "Yoga & mobility", sport: "Yoga" },
  { id: "b4", name: "TrackOne", tagline: "Run clubs & events", sport: "Running" },
  { id: "b5", name: "AquaEdge", tagline: "Swim tech", sport: "Swimming" },
] as const;

export const DEMO_FEED_QUOTES = [
  { id: "q1", author: "Marcus J.", sport: "Basketball", text: "Morning grind never misses — who's training this week? Drop a 🔥" },
  { id: "q2", author: "Leila M.", sport: "Yoga", text: "Consistency > motivation. Show up for future you." },
  { id: "q3", author: "Cork FC", sport: "Soccer", text: "Need 2 more for tonight's 5-a-side. All levels welcome ⚽" },
  { id: "q4", author: "Zara K.", sport: "CrossFit", text: "PR day: 120kg deadlift after 2 years of showing up. 💥" },
] as const;

export function pickFeedQuote(seed: number) {
  const rng = seededRandom(seed + 501);
  return DEMO_FEED_QUOTES[Math.floor(rng() * DEMO_FEED_QUOTES.length)];
}

export type DemoStoryUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl: string;
  hasUnviewed: boolean;
  isLive: boolean;
  ownerType: "person" | "team" | "event" | "place" | "coach" | "challenge";
  sport: string;
  teaser: string;
};

export type DemoMediaCard = {
  id: string;
  title: string;
  subtitle: string;
  sport: string;
  author: string;
  avatarSeed: string;
  gradient: string;
};

export type DemoFeedPostTemplate = {
  id: string;
  type: "regular" | "event" | "team" | "sponsored" | "video";
  author: {
    name: string;
    username: string;
    avatar: string;
    role?: "coach" | "organizer" | "verified" | "team";
    sport: string;
    sportEmoji: string;
    location?: string;
    distance?: string;
  };
  content: string;
  sport: string;
  sportEmoji: string;
  eventName?: string;
  locationTag?: string;
  likesCount: number;
  commentsCount: number;
  comments: "casual" | "hype" | "event";
  timestamp: string;
  isSponsored?: boolean;
  sponsorCTA?: string;
  contextNotif?: string;
  interests: string[];
};

const AVATAR = (seed: string, bg = "2a2a2a") =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const rng = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const HOME_LOAD_KEY = "surna_home_load_gen";

function sessionSalt(): number {
  if (typeof window === "undefined") return 0;
  const key = "surna_feed_salt";
  let salt = parseInt(sessionStorage.getItem(key) || "", 10);
  if (!Number.isFinite(salt)) {
    salt = Math.floor(Math.random() * 1_000_000);
    sessionStorage.setItem(key, String(salt));
  }
  return salt;
}

/** Call once per full page load so home/feed shuffle changes on browser refresh. */
export function bumpHomeLoadGeneration(): number {
  if (typeof window === "undefined") return 0;
  const next = (parseInt(sessionStorage.getItem(HOME_LOAD_KEY) || "0", 10) || 0) + 1;
  sessionStorage.setItem(HOME_LOAD_KEY, String(next));
  return next;
}

function homeLoadGeneration(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(sessionStorage.getItem(HOME_LOAD_KEY) || "0", 10) || 0;
}

export function createFeedSeed(refreshCount = 0): number {
  const day = Math.floor(Date.now() / 86_400_000);
  return (day * 9973) ^ (refreshCount * 4187) ^ (homeLoadGeneration() * 7919) ^ sessionSalt();
}

const INTEREST_TAGS = ["basketball", "soccer", "run", "gym", "yoga", "swim", "mma", "tennis", "cycling", "volleyball"] as const;

const TEMPLATE_ENTITY: Record<string, { kind: MapEntityKind; id: string }> = {
  "fp-padel": { kind: "event", id: "demo-ev-padel-mixer" },
  "fp-hike": { kind: "event", id: "demo-ev-trail-run" },
  "fp-vb": { kind: "event", id: "demo-ev-beach-vb" },
  "fp-soccer": { kind: "event", id: "demo-ev-5v5-soccer" },
  "fp-cycle": { kind: "team", id: "dt2" },
  "fp-gym": { kind: "place", id: "dp0" },
};

export function pickInterestProfile(seed: number): string[] {
  const rng = seededRandom(seed + 77);
  const count = 3 + Math.floor(rng() * 3);
  const shuffled = shuffle([...INTEREST_TAGS], seed + 3);
  return shuffled.slice(0, count);
}

export function rankHomeBlocks(seed: number): HomeBlockId[] {
  const interests = pickInterestProfile(seed);
  const weights: Record<HomeBlockId, number> = {
    challenge: 1,
    coaches: 2,
    crew: 1,
    eventSpotlight: 2,
    eventsRow: 2,
    feedQuote: 1.6,
    happeningTeams: 2,
    marketplace: 1.2,
    mediaCard: 2.5,
    partnerBrands: 1.1,
    placesBrowse: 1.5,
    rewards: 0.8,
    sportsPick: 1,
  };
  if (interests.includes("basketball")) {
    weights.challenge += 2;
    weights.happeningTeams += 1.5;
  }
  if (interests.includes("soccer")) {
    weights.eventSpotlight += 2;
    weights.eventsRow += 1;
  }
  if (interests.includes("run") || interests.includes("cycling")) {
    weights.placesBrowse += 2;
    weights.sportsPick += 1;
  }
  if (interests.includes("gym") || interests.includes("yoga")) {
    weights.coaches += 2;
    weights.mediaCard += 1;
  }

  const ids = Object.keys(weights) as HomeBlockId[];
  const rng = seededRandom(seed + 99);
  return ids
    .map((id) => ({ id, score: weights[id] + rng() * 3 }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);
}

export const DEMO_STORY_POOL: DemoStoryUser[] = [
  { id: "ds-jordan", firstName: "Jordan", lastName: "Rivers", username: "jordan_bball", profileImageUrl: AVATAR("JR"), hasUnviewed: true, isLive: false, ownerType: "person", sport: "Basketball", teaser: "Game tonight 🏀" },
  { id: "ds-mia", firstName: "Mia", lastName: "Chen", username: "mia_futsal", profileImageUrl: AVATAR("MC"), hasUnviewed: true, isLive: true, ownerType: "person", sport: "Soccer", teaser: "Live scrimmage" },
  { id: "ds-corkfc", firstName: "Cork FC", lastName: "", username: "cork_fc", profileImageUrl: AVATAR("CF"), hasUnviewed: true, isLive: false, ownerType: "team", sport: "Soccer", teaser: "Need 2 players" },
  { id: "ds-venice", firstName: "Venice", lastName: "Courts", username: "venice_courts", profileImageUrl: AVATAR("VC"), hasUnviewed: true, isLive: false, ownerType: "place", sport: "Basketball", teaser: "Open run" },
  { id: "ds-elena", firstName: "Coach", lastName: "Elena", username: "coach_elena", profileImageUrl: AVATAR("CE"), hasUnviewed: true, isLive: true, ownerType: "coach", sport: "Tennis", teaser: "Serve clinic" },
  { id: "ds-sam", firstName: "Sam", lastName: "Track", username: "sam_track", profileImageUrl: AVATAR("ST"), hasUnviewed: true, isLive: false, ownerType: "person", sport: "Running", teaser: "5K tomorrow" },
  { id: "ds-nova", firstName: "Nova", lastName: "Gym", username: "nova_lift", profileImageUrl: AVATAR("NG"), hasUnviewed: true, isLive: false, ownerType: "place", sport: "CrossFit", teaser: "Open gym" },
  { id: "ds-rio", firstName: "Rio", lastName: "Surf", username: "rio_surf", profileImageUrl: AVATAR("RS"), hasUnviewed: false, isLive: false, ownerType: "person", sport: "Surf", teaser: "Dawn paddle" },
  { id: "ds-padel", firstName: "Padel", lastName: "Club", username: "padel_hub", profileImageUrl: AVATAR("PH"), hasUnviewed: true, isLive: false, ownerType: "event", sport: "Padel", teaser: "Doubles open" },
  { id: "ds-zoe", firstName: "Zoe", lastName: "Yoga", username: "zoe_flow", profileImageUrl: AVATAR("ZY"), hasUnviewed: false, isLive: false, ownerType: "coach", sport: "Yoga", teaser: "Sunrise flow" },
  { id: "ds-muay", firstName: "Kai", lastName: "Muay", username: "kai_muay", profileImageUrl: AVATAR("KM"), hasUnviewed: true, isLive: false, ownerType: "person", sport: "MMA", teaser: "Sparring" },
  { id: "ds-swim", firstName: "Aqua", lastName: "Centre", username: "aqua_centre", profileImageUrl: AVATAR("AC"), hasUnviewed: true, isLive: false, ownerType: "place", sport: "Swimming", teaser: "Lane free" },
  { id: "ds-hike", firstName: "Trail", lastName: "Crew", username: "trail_crew", profileImageUrl: AVATAR("TC"), hasUnviewed: true, isLive: false, ownerType: "challenge", sport: "Hiking", teaser: "Sunday hike" },
  { id: "ds-vb", firstName: "Beach", lastName: "VB", username: "beach_vb", profileImageUrl: AVATAR("BV"), hasUnviewed: false, isLive: true, ownerType: "team", sport: "Volleyball", teaser: "Beach cup LIVE" },
  { id: "ds-cycle", firstName: "Cycle", lastName: "Squad", username: "cycle_squad", profileImageUrl: AVATAR("CS"), hasUnviewed: true, isLive: false, ownerType: "team", sport: "Cycling", teaser: "40km ride" },
];

export const DEMO_MEDIA_POOL: DemoMediaCard[] = [
  { id: "dm1", title: "Pickup under the lights", subtitle: "Basketball · 12 joined", sport: "Basketball", author: "Jordan R.", avatarSeed: "JR", gradient: "linear-gradient(135deg,#1a1a2e,#16213e)" },
  { id: "dm2", title: "Sunday trail 12km", subtitle: "Running · All paces", sport: "Running", author: "Dylan H.", avatarSeed: "DH", gradient: "linear-gradient(135deg,#0f2027,#203a43)" },
  { id: "dm3", title: "Padel doubles mixer", subtitle: "Padel · 3 courts free", sport: "Padel", author: "Padel Hub", avatarSeed: "PH", gradient: "linear-gradient(135deg,#2c1810,#4a3728)" },
  { id: "dm4", title: "Open water swim set", subtitle: "Swimming · Coach on deck", sport: "Swimming", author: "Aqua Centre", avatarSeed: "AC", gradient: "linear-gradient(135deg,#0c1445,#1b6ca8)" },
  { id: "dm5", title: "5v5 needs two more", subtitle: "Soccer · Tonight 7pm", sport: "Soccer", author: "Cork FC", avatarSeed: "CF", gradient: "linear-gradient(135deg,#0d2818,#1a4d2e)" },
  { id: "dm6", title: "Mobility + strength", subtitle: "CrossFit · PR board", sport: "CrossFit", author: "Zara K.", avatarSeed: "ZK", gradient: "linear-gradient(135deg,#2d1f3d,#4a2c5a)" },
  { id: "dm7", title: "Sunrise yoga on the pier", subtitle: "Yoga · Free community", sport: "Yoga", author: "Leila M.", avatarSeed: "LM", gradient: "linear-gradient(135deg,#3d2c1e,#8b6914)" },
  { id: "dm8", title: "Beach volleyball finals", subtitle: "Volleyball · LIVE now", sport: "Volleyball", author: "Beach VB", avatarSeed: "BV", gradient: "linear-gradient(135deg,#4a1942,#7b2d8e)" },
];

export const DEMO_FEED_POST_POOL: DemoFeedPostTemplate[] = [
  {
    id: "fp-padel", type: "event", author: { name: "Padel Hub", username: "padel_hub", avatar: "PH", role: "organizer", sport: "Padel", sportEmoji: "🎾", location: "Cork", distance: "1.1 km" },
    content: "Doubles mixer tonight — all levels. Courts 2 & 4 reserved. Reply if you need a partner!",
    sport: "Padel", sportEmoji: "🎾", eventName: "Mixer · 7:30pm", locationTag: "Marina Courts",
    likesCount: 38, commentsCount: 9, comments: "hype", timestamp: "8 min ago", contextNotif: "3 players joined near you", interests: ["tennis", "soccer"],
  },
  {
    id: "fp-swim", type: "regular", author: { name: "Aqua Centre", username: "aqua_centre", avatar: "AC", sport: "Swimming", sportEmoji: "🏊", location: "Cork", distance: "2.4 km" },
    content: "Lane 3 open for masters squad — technique focus. Bring fins if you have them 🏊",
    sport: "Swimming", sportEmoji: "🏊",
    likesCount: 67, commentsCount: 11, comments: "casual", timestamp: "22 min ago", interests: ["swim"],
  },
  {
    id: "fp-mma", type: "video", author: { name: "Kai Muay", username: "kai_muay", avatar: "KM", role: "coach", sport: "MMA", sportEmoji: "🥊", location: "Cork", distance: "3 km" },
    content: "Pad work + conditioning circuit — who’s in for Saturday? Clip from last session 🔥",
    sport: "MMA", sportEmoji: "🥊",
    likesCount: 201, commentsCount: 34, comments: "hype", timestamp: "45 min ago", interests: ["mma", "gym"],
  },
  {
    id: "fp-cycle", type: "team", author: { name: "Cycle Squad", username: "cycle_squad", avatar: "CS", role: "team", sport: "Cycling", sportEmoji: "🚴", location: "Cork", distance: "0.6 km" },
    content: "40km coastal spin Sunday — café stop halfway. Lights + helmet required.",
    sport: "Cycling", sportEmoji: "🚴", locationTag: "City Hall meetup",
    likesCount: 54, commentsCount: 14, comments: "event", timestamp: "1 hr ago", interests: ["cycling", "run"],
  },
  {
    id: "fp-hike", type: "event", author: { name: "Trail Crew", username: "trail_crew", avatar: "TC", role: "organizer", sport: "Hiking", sportEmoji: "🥾", location: "Cork", distance: "5 km" },
    content: "Foggy ridge loop — moderate pace, dogs welcome. Carpool from Fitzgerald’s Park.",
    sport: "Hiking", sportEmoji: "🥾", eventName: "Ridge loop · Sat 9am", locationTag: "Fitzgerald's Park",
    likesCount: 41, commentsCount: 8, comments: "event", timestamp: "2 hr ago", interests: ["run"],
  },
  {
    id: "fp-gym", type: "sponsored", author: { name: "Iron District", username: "iron_district", avatar: "ID", role: "verified", sport: "Gym", sportEmoji: "🏋️", location: "City Centre" },
    content: "New lifting platforms + women’s strength hour Mon/Wed. First week free for SURNA members.",
    sport: "Gym", sportEmoji: "🏋️", eventName: "Strength hour", locationTag: "Iron District",
    likesCount: 156, commentsCount: 22, comments: "event", timestamp: "3 hr ago", isSponsored: true, sponsorCTA: "Book slot", interests: ["gym"],
  },
  {
    id: "fp-bball", type: "regular", author: { name: "Jordan Rivers", username: "jordan_bball", avatar: "JR", sport: "Basketball", sportEmoji: "🏀", location: "Cork", distance: "0.9 km" },
    content: "Indoor run was packed — who's free for 3v3 after work? Bringing extra balls 🏀",
    sport: "Basketball", sportEmoji: "🏀",
    likesCount: 188, commentsCount: 27, comments: "casual", timestamp: "4 hr ago", interests: ["basketball"],
  },
  {
    id: "fp-yoga", type: "regular", author: { name: "Zoe Flow", username: "zoe_flow", avatar: "ZY", role: "coach", sport: "Yoga", sportEmoji: "🧘", location: "Cork", distance: "1.8 km" },
    content: "Breathwork + slow flow — mats provided. Drop-in welcome, leave phones at the door 🌿",
    sport: "Yoga", sportEmoji: "🧘",
    likesCount: 92, commentsCount: 15, comments: "casual", timestamp: "6 hr ago", interests: ["yoga"],
  },
  {
    id: "fp-vb", type: "event", author: { name: "Beach VB", username: "beach_vb", avatar: "BV", role: "organizer", sport: "Volleyball", sportEmoji: "🏐", location: "Cork", distance: "4.2 km" },
    content: "Quarter-finals on the sand — come cheer or sub in if a team needs you!",
    sport: "Volleyball", sportEmoji: "🏐", eventName: "Beach cup", locationTag: "Marina strand",
    likesCount: 73, commentsCount: 18, comments: "hype", timestamp: "Yesterday", interests: ["volleyball"],
  },
  {
    id: "fp-soccer", type: "event", author: { name: "Cork FC United", username: "cork_fc", avatar: "CF", role: "organizer", sport: "Soccer", sportEmoji: "⚽", location: "Cork", distance: "0.8 km" },
    content: "5-a-side still needs a keeper + one outfield — kickoff 7pm ⚽",
    sport: "Soccer", sportEmoji: "⚽", eventName: "5-a-side tonight", locationTag: "Pairc Ui Chaoimh",
    likesCount: 61, commentsCount: 16, comments: "hype", timestamp: "Yesterday", interests: ["soccer"],
  },
];

function demoPostMediaBg(p: DemoFeedPostTemplate): string {
  return postCardTintGradient({
    sport: p.sport,
    contentKind: p.type,
    authorRole: p.author.role,
  });
}

export function pickStoryUsers(seed: number, count = 10): DemoStoryUser[] {
  return shuffle(DEMO_STORY_POOL, seed).slice(0, count);
}

export function pickMediaCards(seed: number, count = 3): DemoMediaCard[] {
  return shuffle(DEMO_MEDIA_POOL, seed + 11).slice(0, count);
}

export function pickDemoFeedPosts(
  seed: number,
  tab: "For You" | "Following" | "Events" | "Nearby",
  count = 8,
): (DemoFeedPostTemplate & { imageGradient: string })[] {
  const interests = pickInterestProfile(seed);
  let pool = DEMO_FEED_POST_POOL.map((p) => ({ ...p, imageGradient: demoPostMediaBg(p) }));

  if (tab === "Events") pool = pool.filter((p) => p.type === "event");
  if (tab === "Nearby") pool = pool.filter((p) => p.author.distance);
  if (tab === "Following") return [];

  const rng = seededRandom(seed + 5);
  pool = pool
    .map((p) => ({
      post: p,
      score:
        p.interests.filter((i) => interests.includes(i)).length * 4 +
        (p.type === "event" ? 1.5 : 0) +
        rng() * 2,
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.post);

  const shuffled = shuffle(pool, seed + 23);
  return shuffled.slice(0, count);
}

/** Maps rotating demo templates into Feed page card shape */
export function templateToFeedDemoPost(
  t: DemoFeedPostTemplate & { imageGradient: string },
): {
  id: string;
  type: DemoFeedPostTemplate["type"];
  author: {
    name: string;
    username: string;
    avatar: string;
    avatarColor: string;
    role?: "coach" | "organizer" | "verified" | "team";
    sport?: string;
    sportEmoji?: string;
    location?: string;
    distance?: string;
  };
    content: string;
  imageGradient: string;
  imageUrl?: string;
  sport?: string;
  sportEmoji?: string;
  eventName?: string;
  locationTag?: string;
  likesCount: number;
  commentsCount: number;
  comments: "casual" | "hype" | "event";
  timestamp: string;
  isSponsored?: boolean;
  sponsorCTA?: string;
  contextNotif?: string;
  actionRoute?: string;
  entityKind?: "event" | "team" | "place";
  entityId?: string;
  mapRoute?: string;
} {
  const linked = TEMPLATE_ENTITY[t.id];
  const entityKind = linked?.kind as "event" | "team" | "place" | undefined;
  const entityId = linked?.id;
  const actionRoute = linked ? entityPath(linked.kind, linked.id) : undefined;
  const mapRoute = linked ? mapPath({ type: linked.kind, id: linked.id }) : undefined;
  return {
    id: t.id,
    type: t.type,
    author: {
      name: t.author.name,
      username: t.author.username,
      avatar: t.author.avatar,
      avatarColor: "var(--surna-text-muted)",
      role: t.author.role,
      sport: t.author.sport,
      sportEmoji: t.author.sportEmoji,
      location: t.author.location,
      distance: t.author.distance,
    },
    content: t.content,
    imageGradient: t.imageGradient,
    imageUrl: (t as { imageUrl?: string }).imageUrl,
    sport: t.sport,
    sportEmoji: t.sportEmoji,
    eventName: t.eventName,
    locationTag: t.locationTag,
    likesCount: t.likesCount,
    commentsCount: t.commentsCount,
    comments: t.comments,
    timestamp: t.timestamp,
    isSponsored: t.isSponsored,
    sponsorCTA: t.sponsorCTA,
    contextNotif: t.contextNotif,
    actionRoute,
    entityKind,
    entityId,
    mapRoute,
  };
}

export type FeedDemoPost = ReturnType<typeof templateToFeedDemoPost>;

export function interleaveFeedItems<TDemo, TApi>(
  demos: TDemo[],
  api: TApi[],
  seed: number,
): Array<{ kind: "demo"; item: TDemo } | { kind: "api"; item: TApi }> {
  const tagged = [
    ...demos.map((item) => ({ kind: "demo" as const, item })),
    ...api.map((item) => ({ kind: "api" as const, item })),
  ];
  return shuffle(tagged, seed + 41);
}
