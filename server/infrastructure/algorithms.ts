import { db } from "../db";
import { sql } from "drizzle-orm";
import { cacheAside, cacheKey, TTL } from "./cache";
import {
  scoreForPerson,
  DEFAULT_PERSON_RANKING,
  type PersonAffinity,
  type RankableContent,
  type PersonRankingWeights,
} from "@shared/personRanking";

export interface FeedItem {
  id: string;
  type: string;
  score: number;
  createdAt: Date;
  data: any;
}

export interface FeedRankingConfig {
  chronologicalWeight: number;
  engagementWeight: number;
  freshnessDecayHours: number;
  boostFactors: {
    isFollowing: number;
    isTeammate: number;
    hasMedia: number;
    isVerified: number;
    isSponsored: number;
  };
}

const DEFAULT_RANKING: FeedRankingConfig = {
  chronologicalWeight: DEFAULT_PERSON_RANKING.freshness,
  engagementWeight: DEFAULT_PERSON_RANKING.engagement,
  freshnessDecayHours: DEFAULT_PERSON_RANKING.halfLifeHours * 2,
  boostFactors: {
    isFollowing: DEFAULT_PERSON_RANKING.followBoost,
    isTeammate: DEFAULT_PERSON_RANKING.teammateBoost,
    hasMedia: DEFAULT_PERSON_RANKING.mediaBoost,
    isVerified: DEFAULT_PERSON_RANKING.verifiedBoost,
    isSponsored: 1.4,
  },
};

/** @deprecated Prefer scoreForPerson from @shared/personRanking — kept for callers. */
export function computeFeedScore(
  post: any,
  _userId: string,
  config: FeedRankingConfig = DEFAULT_RANKING,
  person?: PersonAffinity,
): number {
  const weights: PersonRankingWeights = {
    ...DEFAULT_PERSON_RANKING,
    freshness: config.chronologicalWeight,
    engagement: config.engagementWeight,
    halfLifeHours: Math.max(1, config.freshnessDecayHours / 2),
    followBoost: config.boostFactors.isFollowing,
    teammateBoost: config.boostFactors.isTeammate,
    mediaBoost: config.boostFactors.hasMedia,
    verifiedBoost: config.boostFactors.isVerified,
  };

  const item: RankableContent = {
    createdAt: post.createdAt,
    sport: post.sport,
    location: post.location,
    authorId: post.authorId || post.author?.id,
    authorSport: post.author?.sport,
    authorVerified: post.isVerified || post.author?.isVerified,
    likesCount: post.likeCount || post.likesCount,
    commentsCount: post.commentCount || post.commentsCount,
    sharesCount: post.shareCount || post.sharesCount,
    imageUrl: post.imageUrl || post.mediaUrl,
    videoUrl: post.videoUrl,
  };

  const affinity: PersonAffinity = person ?? {
    preferredSports: [],
    followingIds: post.isFollowing && item.authorId ? [item.authorId] : [],
    teammateIds: post.isTeammate && item.authorId ? [item.authorId] : [],
  };

  // Legacy flags when person affinity wasn't passed
  if (!person) {
    if (post.isFollowing && item.authorId) {
      affinity.followingIds = [...(affinity.followingIds as string[] || []), item.authorId];
    }
    if (post.isTeammate && item.authorId) {
      affinity.teammateIds = [...(affinity.teammateIds as string[] || []), item.authorId];
    }
  }

  let { score } = scoreForPerson(item, affinity, weights);
  if (post.isSponsored) score *= config.boostFactors.isSponsored;
  return Math.round(score * 1000) / 1000;
}

export { scoreForPerson, DEFAULT_PERSON_RANKING };

export interface MapCluster {
  lat: number;
  lng: number;
  count: number;
  entityIds: string[];
  bounds: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } };
}

export interface MapPrivacyConfig {
  fuzzRadiusMeters: number;
  minZoomForExact: number;
  hideExactForNonFriends: boolean;
}

const DEFAULT_MAP_PRIVACY: MapPrivacyConfig = {
  fuzzRadiusMeters: 500,
  minZoomForExact: 15,
  hideExactForNonFriends: true,
};

export function fuzzLocation(lat: number, lng: number, radiusMeters: number): { lat: number; lng: number } {
  const latOffset = (Math.random() - 0.5) * 2 * (radiusMeters / 111320);
  const lngOffset = (Math.random() - 0.5) * 2 * (radiusMeters / (111320 * Math.cos(lat * Math.PI / 180)));
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}

export function clusterMarkers(
  markers: Array<{ id: string; lat: number; lng: number }>,
  zoomLevel: number
): MapCluster[] {
  const gridSize = Math.pow(2, 18 - zoomLevel) * 0.001;
  const grid = new Map<string, MapCluster>();

  for (const m of markers) {
    const gridKey = `${Math.floor(m.lat / gridSize)}:${Math.floor(m.lng / gridSize)}`;
    if (!grid.has(gridKey)) {
      grid.set(gridKey, {
        lat: m.lat,
        lng: m.lng,
        count: 0,
        entityIds: [],
        bounds: { ne: { lat: m.lat, lng: m.lng }, sw: { lat: m.lat, lng: m.lng } },
      });
    }
    const cluster = grid.get(gridKey)!;
    cluster.lat = (cluster.lat * cluster.count + m.lat) / (cluster.count + 1);
    cluster.lng = (cluster.lng * cluster.count + m.lng) / (cluster.count + 1);
    cluster.count++;
    cluster.entityIds.push(m.id);
    cluster.bounds.ne.lat = Math.max(cluster.bounds.ne.lat, m.lat);
    cluster.bounds.ne.lng = Math.max(cluster.bounds.ne.lng, m.lng);
    cluster.bounds.sw.lat = Math.min(cluster.bounds.sw.lat, m.lat);
    cluster.bounds.sw.lng = Math.min(cluster.bounds.sw.lng, m.lng);
  }

  return Array.from(grid.values());
}

export function applyMapPrivacy(
  markers: Array<{ id: string; lat: number; lng: number; ownerId?: string }>,
  viewerId: string | null,
  zoomLevel: number,
  config: MapPrivacyConfig = DEFAULT_MAP_PRIVACY
): Array<{ id: string; lat: number; lng: number }> {
  return markers.map(m => {
    const isOwner = viewerId && m.ownerId === viewerId;
    const shouldFuzz = !isOwner && (zoomLevel < config.minZoomForExact || config.hideExactForNonFriends);

    if (shouldFuzz) {
      const fuzzed = fuzzLocation(m.lat, m.lng, config.fuzzRadiusMeters);
      return { id: m.id, lat: fuzzed.lat, lng: fuzzed.lng };
    }
    return { id: m.id, lat: m.lat, lng: m.lng };
  });
}

export interface NotificationBatch {
  userId: string;
  notifications: Array<{ type: string; message: string; priority: number; data: any }>;
}

export type NotificationPriority = "critical" | "high" | "medium" | "low";

const PRIORITY_MAP: Record<NotificationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function prioritizeNotifications(
  notifications: Array<{ type: string; priority: NotificationPriority; createdAt: Date; data: any }>
): typeof notifications {
  return [...notifications].sort((a, b) => {
    const pDiff = PRIORITY_MAP[b.priority] - PRIORITY_MAP[a.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function batchNotifications(
  notifications: Array<{ userId: string; type: string; message: string; priority: NotificationPriority; data: any }>,
  batchWindow: number = 5 * 60_000
): NotificationBatch[] {
  const batches = new Map<string, NotificationBatch>();

  for (const n of notifications) {
    if (!batches.has(n.userId)) {
      batches.set(n.userId, { userId: n.userId, notifications: [] });
    }
    batches.get(n.userId)!.notifications.push({
      type: n.type,
      message: n.message,
      priority: PRIORITY_MAP[n.priority],
      data: n.data,
    });
  }

  for (const batch of batches.values()) {
    batch.notifications.sort((a, b) => b.priority - a.priority);
  }

  return Array.from(batches.values());
}

export interface TrustScore {
  userId: string;
  score: number;
  factors: {
    accountAge: number;
    emailVerified: boolean;
    profileComplete: boolean;
    postsCount: number;
    reportsReceived: number;
    reportsGiven: number;
    teamMemberships: number;
    eventsAttended: number;
  };
}

export function computeTrustScore(factors: TrustScore["factors"]): number {
  let score = 50;

  const ageMonths = factors.accountAge / (30 * 24 * 60 * 60 * 1000);
  score += Math.min(ageMonths * 2, 10);

  if (factors.emailVerified) score += 10;
  if (factors.profileComplete) score += 5;

  score += Math.min(factors.postsCount * 0.5, 10);
  score += Math.min(factors.teamMemberships * 3, 9);
  score += Math.min(factors.eventsAttended * 2, 6);

  score -= factors.reportsReceived * 5;
  score += Math.min(factors.reportsGiven * 0.5, 3);

  return Math.max(0, Math.min(100, Math.round(score)));
}
