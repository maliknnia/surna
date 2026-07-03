/** Two curated showcase personas — used across stories, profiles, and offline demos. */

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
