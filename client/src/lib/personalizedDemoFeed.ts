/**
 * Rotating demo story pool — order changes per session / home refresh.
 * Main feed posts come from the API only; this module is for stories UI fallbacks.
 */

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

/** Call once per full page load so story order changes on browser refresh. */
export function bumpHomeLoadGeneration(): number {
  if (typeof window === "undefined") return 0;
  const next = (parseInt(sessionStorage.getItem(HOME_LOAD_KEY) || "0", 10) || 0) + 1;
  sessionStorage.setItem(HOME_LOAD_KEY, String(next));
  return next;
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

export function pickStoryUsers(seed: number, count = 10): DemoStoryUser[] {
  return shuffle(DEMO_STORY_POOL, seed ^ sessionSalt()).slice(0, count);
}
