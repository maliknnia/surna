// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from "../db";
import { eq, desc, asc, and, or, sql, inArray, gt, lt } from "drizzle-orm";
import {
  users,
  posts,
  events,
  teams,
  coaches,
  userInteractions,
  userAiPreferences,
  recommendationCache,
  trendingContent,
  type User,
  type Post,
  type Event,
  type Team,
  type Coach,
  type UserInteraction,
  type UserAiPreferences,
  type InsertUserInteraction,
  type InsertUserAiPreferences,
} from "@shared/schema";

// Local type definitions for recommendation responses
interface RecommendationItem {
  contentId: string;
  contentType: string;
  score: number;
  reasons?: string[];
  metadata?: any;
  content?: any;
}

interface RecommendationsResponse {
  posts: RecommendationItem[];
  events: RecommendationItem[];
  teams: RecommendationItem[];
  coaches: RecommendationItem[];
  algorithm: string;
  generatedAt: string;
}

export class RecommendationService {
  private readonly CACHE_TTL_HOURS = 6; // Recommendations expire after 6 hours
  private readonly MIN_INTERACTIONS_FOR_COLLABORATIVE = 10;
  private readonly DEFAULT_RECOMMENDATION_COUNT = 20;

  // Main entry point for getting personalized recommendations
  async getRecommendations(userId: string, options: {
    includeTypes?: string[];
    limit?: number;
    algorithm?: 'content_based' | 'collaborative' | 'hybrid' | 'trending';
    refreshCache?: boolean;
  } = {}): Promise<RecommendationsResponse> {
    const {
      includeTypes = ['post', 'event', 'team', 'coach'],
      limit = this.DEFAULT_RECOMMENDATION_COUNT,
      algorithm = 'hybrid',
      refreshCache = false
    } = options;

    // Check cache first unless refresh is requested
    if (!refreshCache) {
      const cached = await this.getCachedRecommendations(userId, includeTypes);
      if (cached) {
        return cached;
      }
    }

    // Generate new recommendations
    const recommendations = await this.generateRecommendations(userId, algorithm, includeTypes, limit);
    
    // Cache the results
    await this.cacheRecommendations(userId, recommendations, algorithm);
    
    return recommendations;
  }

  // Track user interactions for ML learning
  async trackInteraction(interaction: InsertUserInteraction): Promise<void> {
    try {
      await db.insert(userInteractions).values(interaction);
      
      // Update user preferences in the background
      this.updateUserPreferences(interaction.userId).catch(console.error);
      
      // Update trending content if it's a high-value interaction
      if (['like', 'share', 'join', 'comment'].includes(interaction.interactionType)) {
        this.updateTrendingContent(interaction.targetType, interaction.targetId).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  // Generate recommendations using specified algorithm
  private async generateRecommendations(
    userId: string,
    algorithm: string,
    includeTypes: string[],
    limit: number
  ): Promise<RecommendationsResponse> {
    const recommendations: RecommendationsResponse = {
      posts: [],
      events: [],
      teams: [],
      coaches: [],
      algorithm,
      generatedAt: new Date().toISOString()
    };

    switch (algorithm) {
      case 'content_based':
        return await this.contentBasedRecommendations(userId, includeTypes, limit);
      case 'collaborative':
        return await this.collaborativeFiltering(userId, includeTypes, limit);
      case 'trending':
        return await this.trendingRecommendations(userId, includeTypes, limit);
      case 'hybrid':
      default:
        return await this.hybridRecommendations(userId, includeTypes, limit);
    }
  }

  // Content-based recommendations using user's past interactions and preferences
  private async contentBasedRecommendations(
    userId: string,
    includeTypes: string[],
    limit: number
  ): Promise<RecommendationsResponse> {
    const userPrefs = await this.getUserPreferences(userId);
    const userInteractionHistory = await this.getUserInteractionHistory(userId, 100);
    
    const recommendations: RecommendationsResponse = {
      posts: [],
      events: [],
      teams: [],
      coaches: [],
      algorithm: 'content_based',
      generatedAt: new Date().toISOString()
    };

    // Get posts recommendations
    if (includeTypes.includes('post')) {
      recommendations.posts = await this.getContentBasedPosts(userId, userPrefs, userInteractionHistory, Math.floor(limit / includeTypes.length));
    }

    // Get events recommendations
    if (includeTypes.includes('event')) {
      recommendations.events = await this.getContentBasedEvents(userId, userPrefs, userInteractionHistory, Math.floor(limit / includeTypes.length));
    }

    // Get teams recommendations
    if (includeTypes.includes('team')) {
      recommendations.teams = await this.getContentBasedTeams(userId, userPrefs, userInteractionHistory, Math.floor(limit / includeTypes.length));
    }

    // Get coaches recommendations
    if (includeTypes.includes('coach')) {
      recommendations.coaches = await this.getContentBasedCoaches(userId, userPrefs, userInteractionHistory, Math.floor(limit / includeTypes.length));
    }

    return recommendations;
  }

  // Collaborative filtering based on similar users
  private async collaborativeFiltering(
    userId: string,
    includeTypes: string[],
    limit: number
  ): Promise<RecommendationsResponse> {
    const similarUsers = await this.findSimilarUsers(userId, 50);
    
    const recommendations: RecommendationsResponse = {
      posts: [],
      events: [],
      teams: [],
      coaches: [],
      algorithm: 'collaborative',
      generatedAt: new Date().toISOString()
    };

    if (similarUsers.length < 3) {
      // Fall back to content-based if not enough similar users
      return await this.contentBasedRecommendations(userId, includeTypes, limit);
    }

    // Get what similar users liked that this user hasn't interacted with
    const userInteractedContent = await this.getUserInteractedContent(userId);

    for (const contentType of includeTypes) {
      const recommendations_for_type = await this.getCollaborativeRecommendations(
        similarUsers,
        userInteractedContent,
        contentType,
        Math.floor(limit / includeTypes.length)
      );
      
      switch (contentType) {
        case 'post':
          recommendations.posts = recommendations_for_type;
          break;
        case 'event':
          recommendations.events = recommendations_for_type;
          break;
        case 'team':
          recommendations.teams = recommendations_for_type;
          break;
        case 'coach':
          recommendations.coaches = recommendations_for_type;
          break;
      }
    }

    return recommendations;
  }

  // Trending content recommendations
  private async trendingRecommendations(
    userId: string,
    includeTypes: string[],
    limit: number
  ): Promise<RecommendationsResponse> {
    const userInteractedContent = await this.getUserInteractedContent(userId);
    
    const recommendations: RecommendationsResponse = {
      posts: [],
      events: [],
      teams: [],
      coaches: [],
      algorithm: 'trending',
      generatedAt: new Date().toISOString()
    };

    for (const contentType of includeTypes) {
      const trending = await db
        .select()
        .from(trendingContent)
        .where(
          and(
            eq(trendingContent.contentType, contentType),
            eq(trendingContent.timeframe, 'daily') // Focus on daily trends
          )
        )
        .orderBy(desc(trendingContent.score))
        .limit(Math.floor(limit / includeTypes.length));

      const filteredTrending = trending.filter(
        t => !userInteractedContent.some(uc => uc.contentType === t.contentType && uc.contentId === t.contentId)
      );

      const trendingRecommendations: RecommendationItem[] = filteredTrending.map(t => ({
        contentType: t.contentType,
        contentId: t.contentId,
        score: Number(t.score) / 100, // Normalize to 0-1
        reasons: ['Trending now'],
        metadata: {
          trendScore: t.score,
          timeframe: t.timeframe
        }
      }));

      switch (contentType) {
        case 'post':
          recommendations.posts = trendingRecommendations;
          break;
        case 'event':
          recommendations.events = trendingRecommendations;
          break;
        case 'team':
          recommendations.teams = trendingRecommendations;
          break;
        case 'coach':
          recommendations.coaches = trendingRecommendations;
          break;
      }
    }

    return recommendations;
  }

  // Hybrid approach combining multiple algorithms
  private async hybridRecommendations(
    userId: string,
    includeTypes: string[],
    limit: number
  ): Promise<RecommendationsResponse> {
    const interactionCount = await this.getUserInteractionCount(userId);
    
    // Weights for different algorithms based on user's interaction history
    let contentWeight = 0.4;
    let collaborativeWeight = interactionCount >= this.MIN_INTERACTIONS_FOR_COLLABORATIVE ? 0.4 : 0.1;
    let trendingWeight = 0.2;
    
    // Adjust weights if collaborative filtering isn't viable
    if (collaborativeWeight === 0.1) {
      contentWeight = 0.7;
      trendingWeight = 0.2;
    }

    // Get recommendations from each algorithm
    const [contentBased, collaborative, trending] = await Promise.all([
      this.contentBasedRecommendations(userId, includeTypes, Math.floor(limit * contentWeight)),
      this.collaborativeFiltering(userId, includeTypes, Math.floor(limit * collaborativeWeight)),
      this.trendingRecommendations(userId, includeTypes, Math.floor(limit * trendingWeight))
    ]);

    // Combine and deduplicate recommendations
    const combined: RecommendationsResponse = {
      posts: this.combineRecommendations([
        ...contentBased.posts.map(r => ({ ...r, weight: contentWeight })),
        ...collaborative.posts.map(r => ({ ...r, weight: collaborativeWeight })),
        ...trending.posts.map(r => ({ ...r, weight: trendingWeight }))
      ]),
      events: this.combineRecommendations([
        ...contentBased.events.map(r => ({ ...r, weight: contentWeight })),
        ...collaborative.events.map(r => ({ ...r, weight: collaborativeWeight })),
        ...trending.events.map(r => ({ ...r, weight: trendingWeight }))
      ]),
      teams: this.combineRecommendations([
        ...contentBased.teams.map(r => ({ ...r, weight: contentWeight })),
        ...collaborative.teams.map(r => ({ ...r, weight: collaborativeWeight })),
        ...trending.teams.map(r => ({ ...r, weight: trendingWeight }))
      ]),
      coaches: this.combineRecommendations([
        ...contentBased.coaches.map(r => ({ ...r, weight: contentWeight })),
        ...collaborative.coaches.map(r => ({ ...r, weight: collaborativeWeight })),
        ...trending.coaches.map(r => ({ ...r, weight: trendingWeight }))
      ]),
      algorithm: 'hybrid',
      generatedAt: new Date().toISOString()
    };

    return combined;
  }

  // Helper methods
  private async getUserPreferences(userId: string): Promise<UserAiPreferences | null> {
    const [prefs] = await db
      .select()
      .from(userAiPreferences)
      .where(eq(userAiPreferences.userId, userId))
      .limit(1);
    
    return prefs || null;
  }

  private async getUserInteractionHistory(userId: string, limit: number): Promise<UserInteraction[]> {
    return await db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .orderBy(desc(userInteractions.createdAt))
      .limit(limit);
  }

  private async getUserInteractionCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId));
    
    return result[0]?.count || 0;
  }

  private async getUserInteractedContent(userId: string): Promise<{ contentType: string; contentId: string }[]> {
    return await db
      .select({
        contentType: userInteractions.targetType,
        contentId: userInteractions.targetId
      })
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId));
  }

  private async findSimilarUsers(userId: string, limit: number): Promise<string[]> {
    // Simplified similarity based on sports preferences and interaction patterns
    const userInteractionsList = await this.getUserInteractionHistory(userId, 100);
    const userSports = userInteractionsList
      .map(i => i.metadata as any)
      .filter(m => m && m.sport)
      .map(m => m.sport);

    if (userSports.length === 0) {
      return [];
    }

    // Find users who interact with similar sports content
    const similarUsers = await db
      .select({ userId: userInteractions.userId })
      .from(userInteractions)
      .where(
        and(
          sql`${userInteractions.metadata}->>'sport' = ANY(${userSports})`,
          sql`${userInteractions.userId} != ${userId}`
        )
      )
      .groupBy(userInteractions.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return similarUsers.map(u => u.userId);
  }

  private async getContentBasedPosts(
    userId: string,
    userPrefs: UserAiPreferences | null,
    interactions: UserInteraction[],
    limit: number
  ): Promise<RecommendationItem[]> {
    // Get posts similar to what user has liked
    const likedPostIds = interactions
      .filter(i => i.targetType === 'post' && i.interactionType === 'like')
      .map(i => i.targetId);

    if (likedPostIds.length === 0) {
      // If no interactions, use sports preferences
      const sportsPrefs = userPrefs?.skillLevels as any;
      const preferredSports = sportsPrefs ? Object.keys(sportsPrefs) : [];
      
      const postsResult = await db
        .select()
        .from(posts)
        .where(
          and(
            sql`${posts.authorId} != ${userId}`,
            preferredSports.length > 0 ? inArray(posts.sport, preferredSports) : undefined
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limit);

      return postsResult.map(post => ({
        contentType: 'post',
        contentId: post.id,
        score: 0.5,
        reasons: ['Matches your sports interests'],
        content: post
      }));
    }

    // Find similar posts using tags or popularity
    const similarPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          sql`${posts.authorId} != ${userId}`,
          likedPostIds.length > 0 ? sql`${posts.id} NOT IN (${likedPostIds.join(',')})` : undefined
        )
      )
      .orderBy(desc(posts.likesCount))
      .limit(limit);

    return similarPosts.map(post => ({
      contentType: 'post',
      contentId: post.id,
      score: Math.min(Number(post.likesCount) / 100, 1.0),
      reasons: ['Similar to posts you liked'],
      content: post
    }));
  }

  private async getContentBasedEvents(
    userId: string,
    userPrefs: UserAiPreferences | null,
    interactions: UserInteraction[],
    limit: number
  ): Promise<RecommendationItem[]> {
    const preferredSports = userPrefs?.preferredSports || [];
    
    const events_query = db
      .select()
      .from(events)
      .where(
        and(
          sql`${events.organizerId} != ${userId}`,
          gt(events.startDate, new Date()),
          preferredSports.length > 0 ? inArray(events.sport, preferredSports) : undefined
        )
      )
      .orderBy(asc(events.startDate))
      .limit(limit);

    const upcomingEvents = await events_query;

    return upcomingEvents.map(event => ({
      contentType: 'event',
      contentId: event.id,
      score: event.sport && preferredSports.includes(event.sport) ? 0.8 : 0.5,
      reasons: event.sport && preferredSports.includes(event.sport) 
        ? ['Matches your favorite sport', 'Upcoming event']
        : ['Upcoming event'],
      content: event
    }));
  }

  private async getContentBasedTeams(
    userId: string,
    userPrefs: UserAiPreferences | null,
    interactions: UserInteraction[],
    limit: number
  ): Promise<RecommendationItem[]> {
    const preferredSports = userPrefs?.preferredSports || [];
    
    const teams_query = db
      .select()
      .from(teams)
      .where(
        and(
          sql`${teams.captainId} != ${userId}`,
          preferredSports.length > 0 ? inArray(teams.sport, preferredSports) : undefined
        )
      )
      .orderBy(desc(teams.currentMembers))
      .limit(limit);

    const recommendedTeams = await teams_query;

    return recommendedTeams.map(team => ({
      contentType: 'team',
      contentId: team.id,
      score: preferredSports.includes(team.sport) ? 0.9 : 0.6,
      reasons: preferredSports.includes(team.sport) 
        ? ['Matches your favorite sport', `${team.currentMembers} members`]
        : [`${team.currentMembers} members`],
      content: team
    }));
  }

  private async getContentBasedCoaches(
    userId: string,
    userPrefs: UserAiPreferences | null,
    interactions: UserInteraction[],
    limit: number
  ): Promise<RecommendationItem[]> {
    const preferredSports = userPrefs?.preferredSports || [];
    
    const coaches_query = db
      .select()
      .from(coaches)
      .where(
        and(
          sql`${coaches.userId} != ${userId}`,
          preferredSports.length > 0 ? sql`${coaches.specialties} && ${preferredSports}` : undefined
        )
      )
      .orderBy(desc(coaches.isVerified))
      .limit(limit);

    const recommendedCoaches = await coaches_query;

    return recommendedCoaches.map(coach => ({
      contentType: 'coach',
      contentId: coach.id,
      score: coach.isVerified ? 0.9 : 0.6,
      reasons: [coach.isVerified ? 'Verified coach' : 'Active coach', 'Specializes in your sport'],
      content: coach
    }));
  }

  private async getCollaborativeRecommendations(
    similarUsers: string[],
    userInteractedContent: { contentType: string; contentId: string }[],
    contentType: string,
    limit: number
  ): Promise<RecommendationItem[]> {
    // Get what similar users liked that current user hasn't interacted with
    const similarUserInteractions = await db
      .select()
      .from(userInteractions)
      .where(
        and(
          inArray(userInteractions.userId, similarUsers),
          eq(userInteractions.targetType, contentType),
          inArray(userInteractions.interactionType, ['like', 'join', 'share'])
        )
      );

    // Filter out content user has already interacted with
    const filteredInteractions = similarUserInteractions.filter(
      interaction => !userInteractedContent.some(
        uc => uc.contentType === interaction.targetType && uc.contentId === interaction.targetId
      )
    );

    // Count recommendations by content
    const contentCounts = new Map<string, number>();
    filteredInteractions.forEach(interaction => {
      const current = contentCounts.get(interaction.targetId) || 0;
      contentCounts.set(interaction.targetId, current + 1);
    });

    // Sort by popularity among similar users
    const sortedContent = Array.from(contentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sortedContent.map(([contentId, count]) => ({
      contentType,
      contentId,
      score: Math.min(count / similarUsers.length, 1.0),
      reasons: [`${count} similar users liked this`],
      metadata: { similarUserCount: count }
    }));
  }

  private combineRecommendations(recommendations: (RecommendationItem & { weight: number })[]): RecommendationItem[] {
    const combined = new Map<string, RecommendationItem & { weight: number }>();
    
    recommendations.forEach(rec => {
      const key = `${rec.contentType}:${rec.contentId}`;
      const existing = combined.get(key);
      
      if (existing) {
        // Combine scores with weights
        existing.score = (existing.score * existing.weight + rec.score * rec.weight) / (existing.weight + rec.weight);
        const existingReasons = existing.reasons || [];
        const newReasons = rec.reasons || [];
        existing.reasons = Array.from(new Set([...existingReasons, ...newReasons]));
        existing.weight += rec.weight;
      } else {
        combined.set(key, { ...rec });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .map(({ weight, ...rec }) => rec);
  }

  private async getCachedRecommendations(userId: string, includeTypes: string[]): Promise<RecommendationsResponse | null> {
    const cached = await db
      .select()
      .from(recommendationCache)
      .where(
        and(
          eq(recommendationCache.userId, userId),
          gt(recommendationCache.expiresAt, new Date())
        )
      )
      .limit(1);

    if (cached.length === 0) {
      return null;
    }

    const cachedData = cached[0];
    const recommendations = cachedData.recommendations as any;

    // Filter by requested types
    const result: RecommendationsResponse = {
      posts: includeTypes.includes('post') ? (recommendations.posts || []) : [],
      events: includeTypes.includes('event') ? (recommendations.events || []) : [],
      teams: includeTypes.includes('team') ? (recommendations.teams || []) : [],
      coaches: includeTypes.includes('coach') ? (recommendations.coaches || []) : [],
      algorithm: cachedData.algorithm || 'cached',
      generatedAt: cachedData.createdAt?.toISOString() || new Date().toISOString()
    };

    return result;
  }

  private async cacheRecommendations(
    userId: string,
    recommendations: RecommendationsResponse,
    algorithm: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.CACHE_TTL_HOURS * 60 * 60 * 1000);

    try {
      // Delete old cache entries for this user
      await db
        .delete(recommendationCache)
        .where(eq(recommendationCache.userId, userId));

      // Insert new cache entry
      await db.insert(recommendationCache).values({
        userId,
        algorithm,
        recommendations: recommendations as any,
        expiresAt,
      });
    } catch (error) {
      console.error('Failed to cache recommendations:', error);
    }
  }

  private async updateUserPreferences(userId: string): Promise<void> {
    try {
      const recentInteractions = await this.getUserInteractionHistory(userId, 50);
      
      // Extract sports from interactions
      const sportsMap = new Map<string, number>();
      recentInteractions.forEach(interaction => {
        const metadata = interaction.metadata as any;
        if (metadata?.sport) {
          sportsMap.set(metadata.sport, (sportsMap.get(metadata.sport) || 0) + 1);
        }
      });

      const preferredSports = Array.from(sportsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sport]) => sport);

      // Check if preferences exist
      const existing = await this.getUserPreferences(userId);

      if (existing) {
        // Update existing preferences
        await db
          .update(userAiPreferences)
          .set({
            preferredSports,
            updatedAt: new Date(),
          })
          .where(eq(userAiPreferences.userId, userId));
      } else {
        // Create new preferences
        await db.insert(userAiPreferences).values({
          userId,
          preferredSports,
          skillLevels: {},
        });
      }
    } catch (error) {
      console.error('Failed to update user preferences:', error);
    }
  }

  private async updateTrendingContent(contentType: string, contentId: string): Promise<void> {
    try {
      // Check if trending entry exists
      const existing = await db
        .select()
        .from(trendingContent)
        .where(
          and(
            eq(trendingContent.contentType, contentType),
            eq(trendingContent.contentId, contentId),
            eq(trendingContent.timeframe, 'daily')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update score
        const currentScore = Number(existing[0].score);
        await db
          .update(trendingContent)
          .set({
            score: String(currentScore + 1),
          })
          .where(eq(trendingContent.id, existing[0].id));
      } else {
        // Create new trending entry
        await db.insert(trendingContent).values({
          contentType,
          contentId,
          score: "1",
          timeframe: 'daily',
        });
      }
    } catch (error) {
      console.error('Failed to update trending content:', error);
    }
  }
}

export const recommendationService = new RecommendationService();
