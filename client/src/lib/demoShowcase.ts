/** Curated showcase personas — used when offline demos are enabled. */

export const DEMO_SHOWCASE_LIMIT = 8;

/** High-quality portrait URL (face crop) for showcase athletes. */
const FACE = (id: string, w = 400, h = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=faces&auto=format&q=90`;

const SHOT = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=90`;

export type ShowcaseAthlete = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl: string;
  coverImageUrl: string;
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
    profileImageUrl: FACE("1530549387789-4c1017266635"),
    coverImageUrl: SHOT("1518611012118-696072aa579a", 1200, 700),
    sport: "Swimming",
    bio: "NCAA freestyler · open-water prep · Atlanta",
    location: "Atlanta, GA",
  },
  {
    id: "ds-elena",
    firstName: "Elena",
    lastName: "Volkov",
    username: "elena_tennis",
    profileImageUrl: FACE("1544005313-94ddf0286df2"),
    coverImageUrl: SHOT("1601422407692-ec4eeec1d9b3", 1200, 700),
    sport: "Tennis",
    bio: "D1 background · USTA pathway coach · NYC",
    location: "New York, NY",
  },
  {
    id: "ds-marcus",
    firstName: "Marcus",
    lastName: "Reid",
    username: "marcus_run",
    profileImageUrl: FACE("1507003211169-0a1dd7228f2d"),
    coverImageUrl: SHOT("1476480862126-209bfaa8edc8", 1200, 700),
    sport: "Running",
    bio: "Trail & road · sub-3 marathon chase · Cork",
    location: "Cork, IE",
  },
  {
    id: "ds-jordan",
    firstName: "Jordan",
    lastName: "Blake",
    username: "jordan_run",
    profileImageUrl: FACE("1529626455594-4ff0802cfb7e"),
    coverImageUrl: SHOT("1552674605-db6ffd4facb5", 1200, 700),
    sport: "Running",
    bio: "Road 5K–half · tempo Tuesday crew · Dublin",
    location: "Dublin, IE",
  },
  {
    id: "ds-sofia",
    firstName: "Sofia",
    lastName: "Martinez",
    username: "sofia_trail",
    profileImageUrl: FACE("1438761681033-6461ffad8d80"),
    coverImageUrl: SHOT("1476480862126-209bf4358e27", 1200, 700),
    sport: "Running",
    bio: "Trail ultras · ridge lines · Galway",
    location: "Galway, IE",
  },
  {
    id: "ds-devon",
    firstName: "Devon",
    lastName: "Park",
    username: "devon_hoops",
    profileImageUrl: FACE("1500648767791-00dcc994a43e"),
    coverImageUrl: SHOT("1546519638-68e109498ffc", 1200, 700),
    sport: "Basketball",
    bio: "Pickup captain · mid-range specialist · Cork",
    location: "Cork, IE",
  },
  {
    id: "ds-nina",
    firstName: "Nina",
    lastName: "Chen",
    username: "nina_cycle",
    profileImageUrl: FACE("1494790108377-be9c29b29330"),
    coverImageUrl: SHOT("1541625602330-2277a4c46182", 1200, 700),
    sport: "Cycling",
    bio: "Group rides · climbs · weekend centuries",
    location: "Killarney, IE",
  },
  {
    id: "ds-amir",
    firstName: "Amir",
    lastName: "Hassan",
    username: "amir_football",
    profileImageUrl: FACE("1506794778202-cad84cf45f1d"),
    coverImageUrl: SHOT("1574629810360-7efbbe195018", 1200, 700),
    sport: "Soccer",
    bio: "5-a-side & Sunday league · left wing",
    location: "Limerick, IE",
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
