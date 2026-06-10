import type { CoachWithProfile } from "@shared/schema";

function norm(s: string) {
  return s.toLowerCase().trim();
}

function sportMatches(coach: CoachWithProfile, keywords: string[]): boolean {
  const hay = [
    coach.user.sport,
    ...(coach.specialties ?? []),
    coach.profile?.tagline,
  ]
    .filter(Boolean)
    .map((x) => norm(String(x)));

  return keywords.some((kw) => hay.some((h) => h.includes(norm(kw))));
}

export type CoachRowConfig = {
  id: string;
  title: string;
  subtitle?: string;
  layout: "circles" | "squares" | "wide";
  coaches: CoachWithProfile[];
};

export function buildCoachDiscoverRows(
  coaches: CoachWithProfile[],
  options?: { userLocation?: string | null; sportFilter?: string },
): CoachRowConfig[] {
  const list = [...coaches];
  if (!list.length) return [];

  const used = new Set<string>();
  const take = (pool: CoachWithProfile[], n: number) => {
    const out: CoachWithProfile[] = [];
    for (const c of pool) {
      if (out.length >= n) break;
      if (used.has(c.id)) continue;
      used.add(c.id);
      out.push(c);
    }
    return out;
  };

  const loc = options?.userLocation?.split(",")[0]?.trim().toLowerCase();
  const nearYou = loc
    ? list.filter((c) => c.user.location?.toLowerCase().includes(loc))
    : [];
  const nearPool = nearYou.length >= 3 ? nearYou : list;

  const verified = list.filter((c) => c.isVerified);
  const pending = list.filter((c) => !c.isVerified);
  const premium = [...list].sort((a, b) => parseFloat(b.hourlyRate || "0") - parseFloat(a.hourlyRate || "0"));

  const sportSections: { title: string; keywords: string[] }[] = [
    { title: "Football & soccer coaches", keywords: ["soccer", "football"] },
    { title: "Basketball coaches", keywords: ["basketball"] },
    { title: "Tennis coaches", keywords: ["tennis"] },
    { title: "MMA & combat", keywords: ["mma", "boxing", "combat"] },
    { title: "Swim & endurance", keywords: ["swim", "running", "endurance"] },
    { title: "CrossFit & strength", keywords: ["crossfit", "strength", "fitness"] },
  ];

  const rows: CoachRowConfig[] = [];

  const sportFilter = options?.sportFilter;
  if (sportFilter && sportFilter !== "All") {
    const filtered = list.filter((c) => sportMatches(c, [sportFilter]));
    if (filtered.length) {
      rows.push({
        id: "filter-circles",
        title: `${sportFilter} coaches`,
        subtitle: "Swipe to explore",
        layout: "circles",
        coaches: take(filtered, 12),
      });
      rows.push({
        id: "filter-squares",
        title: "Book a session",
        subtitle: "Rates, ratings & availability",
        layout: "squares",
        coaches: take(filtered, 10),
      });
    }
    return rows;
  }

  const near = take(nearPool, 10);
  if (near.length) {
    rows.push({
      id: "near-you",
      title: loc ? `Coaches near ${options?.userLocation?.split(",")[0]}` : "Coaches near you",
      subtitle: "Based on your area · tap to view profile",
      layout: "circles",
      coaches: near,
    });
  }

  const verifiedList = take(verified.length ? verified : list, 8);
  rows.push({
    id: "verified",
    title: "Verified pros",
    subtitle: "Background-checked coaches",
    layout: "circles",
    coaches: verifiedList,
  });

  for (const sec of sportSections) {
    const pool = list.filter((c) => sportMatches(c, sec.keywords));
    const picked = take(pool, 8);
    if (picked.length >= 3) {
      rows.push({
        id: `sport-${sec.keywords[0]}`,
        title: sec.title,
        layout: "circles",
        coaches: picked,
      });
    }
  }

  rows.push({
    id: "featured-squares",
    title: "Featured this week",
    subtitle: "Full profiles · book in one tap",
    layout: "squares",
    coaches: take(verified.length ? verified : list, 10),
  });

  const premiumPick = take(premium, 6);
  if (premiumPick.length) {
    rows.push({
      id: "premium-wide",
      title: "Premium coaching",
      subtitle: "Elite experience & higher touch",
      layout: "wide",
      coaches: premiumPick,
    });
  }

  if (pending.length >= 2) {
    rows.push({
      id: "new-faces",
      title: "New on SURNA",
      subtitle: "Fresh profiles — verification in progress",
      layout: "squares",
      coaches: take(pending, 8),
    });
  }

  const rest = take(list, 20);
  if (rest.length) {
    rows.push({
      id: "discover-more",
      title: "Discover more",
      subtitle: "Every coach on the platform",
      layout: "squares",
      coaches: rest,
    });
  }

  return rows;
}
