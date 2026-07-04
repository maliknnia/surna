/** Two curated showcase personas — used when offline demos are explicitly enabled. */

export const DEMO_SHOWCASE_LIMIT = 2;

const IMG = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=85`;

export type ShowcaseAthlete = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl: string;
  sport: string;
  bio: string;
  location: string;
};

export const SHOWCASE_ATHLETES: ShowcaseAthlete[] = [
  {
    id: "ds-aisha",
    firstName: "Aisha",
    lastName: "Okafor",
    username: "aisha_swim",
    profileImageUrl: IMG("1594381898411-8465977d70af", 400, 400),
    sport: "Swimming",
    bio: "NCAA freestyler · open-water prep · Atlanta",
    location: "Atlanta, GA",
  },
  {
    id: "ds-elena",
    firstName: "Elena",
    lastName: "Volkov",
    username: "elena_tennis",
    profileImageUrl: IMG("1544005313-94ddf0286df2", 400, 400),
    sport: "Tennis",
    bio: "D1 background · USTA pathway coach · NYC",
    location: "New York, NY",
  },
];

export function showcaseAvatar(username: string): string | undefined {
  return SHOWCASE_ATHLETES.find((a) => a.username === username)?.profileImageUrl;
}

/** Client-side demo ids — never mix with live API lists by default. */
export function isClientDemoId(id: string | null | undefined): boolean {
  if (!id) return false;
  const s = String(id);
  return (
    s.startsWith("demo-") ||
    s.startsWith("ds-") ||
    s.startsWith("dt") ||
    s.startsWith("dp") ||
    s.startsWith("dv") ||
    s.startsWith("fv")
  );
}

/** Drop demo rows when the API returned real rows. */
export function apiOnly<T>(items: T[], isDemo: (item: T) => boolean): T[] {
  const list = Array.isArray(items) ? items : [];
  const real = list.filter((item) => !isDemo(item));
  return real.length > 0 ? real : [];
}
