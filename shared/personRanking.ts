/**
 * Surna person-ranking core — single source of truth for “what should this person see?”
 *
 * Score = (freshness × Wf + engagement × We) × affinityBoosts × qualityBoosts
 *
 * Affinity (who you are / who you follow):
 *   follow author     ×3.0
 *   shared sport      ×2.0
 *   shared city       ×1.75
 *   teammate          ×1.4
 *
 * Quality:
 *   has media         ×1.15
 *   verified author   ×1.1
 *
 * Freshness: exponential decay over ~36h (half-life ~18h)
 * Engagement: log2(1 + likes + 2×comments + 3×shares)
 *
 * Cold-start (few interactions): affinity + freshness dominate.
 * Warm users: collaborative layer (recommendationService) blends on top via API.
 */

export type PersonAffinity = {
  preferredSports: string[];
  locationCity?: string | null;
  followingIds?: Set<string> | string[];
  teammateIds?: Set<string> | string[];
};

export type RankableContent = {
  createdAt?: Date | string | number | null;
  sport?: string | null;
  location?: string | null;
  authorId?: string | null;
  authorSport?: string | null;
  authorVerified?: boolean | null;
  likeCount?: number | null;
  likesCount?: number | null;
  commentCount?: number | null;
  commentsCount?: number | null;
  shareCount?: number | null;
  sharesCount?: number | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaUrl?: string | null;
  goingCount?: number | null;
  currentMembers?: number | null;
  followersCount?: number | null;
};

export type PersonRankingWeights = {
  freshness: number;
  engagement: number;
  halfLifeHours: number;
  followBoost: number;
  sportBoost: number;
  locationBoost: number;
  teammateBoost: number;
  mediaBoost: number;
  verifiedBoost: number;
};

export const DEFAULT_PERSON_RANKING: PersonRankingWeights = {
  freshness: 0.55,
  engagement: 0.45,
  halfLifeHours: 18,
  followBoost: 3.0,
  sportBoost: 2.0,
  locationBoost: 1.75,
  teammateBoost: 1.4,
  mediaBoost: 1.15,
  verifiedBoost: 1.1,
};

function toSet(ids?: Set<string> | string[]): Set<string> {
  if (!ids) return new Set();
  return ids instanceof Set ? ids : new Set(ids);
}

function normalizeSport(s?: string | null): string {
  return (s || "").toLowerCase().trim().replace(/[\s\-.]/g, "_");
}

function cityKey(location?: string | null): string {
  if (!location) return "";
  return location.toLowerCase().split(",")[0]?.trim() || "";
}

/** Exponential freshness in [0, 1]. */
export function freshnessScore(
  createdAt: Date | string | number | null | undefined,
  halfLifeHours = DEFAULT_PERSON_RANKING.halfLifeHours,
): number {
  if (createdAt == null) return 0.35;
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3_600_000);
  return Math.pow(0.5, ageHours / Math.max(1, halfLifeHours));
}

/** Log-scaled engagement so viral posts don't dominate forever. */
export function engagementScore(item: RankableContent): number {
  const likes = Number(item.likeCount ?? item.likesCount ?? item.goingCount ?? item.followersCount ?? item.currentMembers ?? 0);
  const comments = Number(item.commentCount ?? item.commentsCount ?? 0);
  const shares = Number(item.shareCount ?? item.sharesCount ?? 0);
  return Math.log2(1 + likes + comments * 2 + shares * 3);
}

export function sportMatches(itemSport: string | null | undefined, preferred: string[]): boolean {
  const post = normalizeSport(itemSport);
  if (!post || preferred.length === 0) return false;
  const prefs = preferred.map(normalizeSport).filter(Boolean);
  return prefs.some((p) => p === post || post.includes(p) || p.includes(post));
}

export function locationMatches(itemLoc: string | null | undefined, viewerCity: string | null | undefined): boolean {
  const city = cityKey(viewerCity);
  const loc = (itemLoc || "").toLowerCase();
  return Boolean(city && loc && loc.includes(city));
}

/**
 * Rank one item for one person. Higher = show earlier.
 * Returns a float suitable for sort; reasons are optional explainability.
 */
export function scoreForPerson(
  item: RankableContent,
  person: PersonAffinity,
  weights: PersonRankingWeights = DEFAULT_PERSON_RANKING,
): { score: number; reasons: string[] } {
  const following = toSet(person.followingIds);
  const teammates = toSet(person.teammateIds);
  const reasons: string[] = [];

  const fresh = freshnessScore(item.createdAt, weights.halfLifeHours);
  const engage = engagementScore(item);
  let score = fresh * weights.freshness + engage * weights.engagement;

  const authorId = item.authorId || undefined;
  if (authorId && following.has(authorId)) {
    score *= weights.followBoost;
    reasons.push("following");
  }
  if (authorId && teammates.has(authorId)) {
    score *= weights.teammateBoost;
    reasons.push("teammate");
  }

  const sport = item.sport || item.authorSport;
  if (sportMatches(sport, person.preferredSports)) {
    score *= weights.sportBoost;
    reasons.push("your_sport");
  }

  if (locationMatches(item.location, person.locationCity)) {
    score *= weights.locationBoost;
    reasons.push("near_you");
  }

  if (item.imageUrl || item.videoUrl || item.mediaUrl) {
    score *= weights.mediaBoost;
    reasons.push("has_media");
  }
  if (item.authorVerified) {
    score *= weights.verifiedBoost;
    reasons.push("verified");
  }

  return { score: Math.round(score * 1000) / 1000, reasons };
}

/** Sort a list for a person (highest score first). */
export function rankForPerson<T extends RankableContent>(
  items: T[],
  person: PersonAffinity,
  weights?: PersonRankingWeights,
): Array<T & { _rankScore: number; _rankReasons: string[] }> {
  return items
    .map((item) => {
      const { score, reasons } = scoreForPerson(item, person, weights);
      return { ...item, _rankScore: score, _rankReasons: reasons };
    })
    .sort((a, b) => b._rankScore - a._rankScore);
}

/** Interaction weights for the learning loop (persisted to user_interactions.weight). */
export const INTERACTION_WEIGHTS: Record<string, number> = {
  view: 0.1,
  skip: -0.2,
  search: 0.3,
  like: 0.8,
  comment: 0.9,
  share: 1.0,
  join: 1.0,
  save: 0.7,
  book: 1.0,
  follow: 0.85,
};
