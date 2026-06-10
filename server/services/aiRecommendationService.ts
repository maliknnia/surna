// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { 
  users, 
  posts, 
  events, 
  teams, 
  coaches,
  userRecommendations, 
  userAiPreferences, 
  userInteractions,
  type UserRecommendation,
  type InsertUserRecommendation,
  type UserAiPreferences
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, asc, gte, lte, sql, inArray, exists } from "drizzle-orm";

export interface RecommendationRequest {
  userId: string;
  itemType: 'post' | 'event' | 'coach' | 'team' | 'user';
  limit?: number;
  algorithm?: 'content_based' | 'collaborative' | 'hybrid';
}

export interface RecommendationScore {
  itemId: string;
  score: number;
  reasons: string[];
}

export class AIRecommendationService {
  constructor() {}

  async generateRecommendations(request: RecommendationRequest): Promise<UserRecommendation[]> {
    const { userId, itemType, limit = 10, algorithm = 'hybrid' } = request;
    
    // Get user preferences and profile
    const userProfile = await this.getUserProfile(userId);
    const userPrefs = await this.getUserAiPreferences(userId);
    
    let recommendations: RecommendationScore[] = [];
    
    switch (algorithm) {
      case 'content_based':
        recommendations = await this.generateContentBasedRecommendations(userId, itemType, userProfile, userPrefs);
        break;
      case 'collaborative':
        recommendations = await this.generateCollaborativeRecommendations(userId, itemType, userProfile);
        break;
      case 'hybrid':
        const contentBased = await this.generateContentBasedRecommendations(userId, itemType, userProfile, userPrefs);
        const collaborative = await this.generateCollaborativeRecommendations(userId, itemType, userProfile);
        recommendations = this.combineRecommendations(contentBased, collaborative);
        break;
    }
    
    // Sort by score and take top recommendations
    recommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Save recommendations to database
    return await this.saveRecommendations(userId, itemType, recommendations, algorithm);
  }

  private async getUserProfile(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  private async getUserAiPreferences(userId: string): Promise<UserAiPreferences | null> {
    const [prefs] = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId));
    return prefs || null;
  }

  private async generateContentBasedRecommendations(
    userId: string, 
    itemType: string, 
    userProfile: any, 
    userPrefs: UserAiPreferences | null
  ): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];
    
    // Get user's interaction history to understand preferences
    const userHistoryQuery = await db
      .select()
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        eq(userInteractions.targetType, itemType)
      ))
      .orderBy(desc(userInteractions.createdAt))
      .limit(50);

    const interactionHistory = userHistoryQuery;
    
    switch (itemType) {
      case 'post':
        return await this.recommendPosts(userId, userProfile, userPrefs, interactionHistory);
      case 'event':
        return await this.recommendEvents(userId, userProfile, userPrefs, interactionHistory);
      case 'coach':
        return await this.recommendCoaches(userId, userProfile, userPrefs, interactionHistory);
      case 'team':
        return await this.recommendTeams(userId, userProfile, userPrefs, interactionHistory);
      default:
        return [];
    }
  }

  private async recommendPosts(userId: string, userProfile: any, userPrefs: UserAiPreferences | null, history: any[]): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];
    
    // Get recent posts excluding user's own posts
    const recentPosts = await db
      .select()
      .from(posts)
      .where(sql`${posts.authorId} != ${userId}`)
      .orderBy(desc(posts.createdAt))
      .limit(100);

    for (const post of recentPosts) {
      let score = 0.5; // Base score
      const reasons: string[] = [];

      // Sports preference matching
      if (userPrefs?.preferredSports && post.sport) {
        if (userPrefs.preferredSports.includes(post.sport)) {
          score += 0.3;
          reasons.push(`Matches your interest in ${post.sport}`);
        }
      }

      // Recency boost
      if (post.createdAt) {
        const postAge = Date.now() - new Date(post.createdAt).getTime();
        const daysSincePost = postAge / (1000 * 60 * 60 * 24);
        if (daysSincePost < 7) {
          score += 0.1 * (7 - daysSincePost) / 7;
          reasons.push('Recent post');
        }
      }

      // Engagement boost (likes)
      if (post.likesCount && post.likesCount > 5) {
        score += Math.min(0.2, post.likesCount * 0.01);
        reasons.push('Popular post');
      }

      if (score > 0.6) {
        recommendations.push({
          itemId: post.id,
          score,
          reasons
        });
      }
    }

    return recommendations;
  }

  private async recommendEvents(userId: string, userProfile: any, userPrefs: UserAiPreferences | null, history: any[]): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];
    
    // Get upcoming events excluding user's own events
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(and(
        sql`${events.organizerId} != ${userId}`,
        gte(events.startDate, new Date())
      ))
      .orderBy(asc(events.startDate))
      .limit(50);

    for (const event of upcomingEvents) {
      let score = 0.4; // Base score
      const reasons: string[] = [];

      // Sports/activity type matching
      if (userPrefs?.preferredSports && event.sport) {
        if (userPrefs.preferredSports.includes(event.sport)) {
          score += 0.4;
          reasons.push(`Matches your interest in ${event.sport}`);
        }
      }

      // Location proximity
      if (userProfile?.location && event.location) {
        if (event.location.toLowerCase().includes(userProfile.location.toLowerCase())) {
          score += 0.25;
          reasons.push('Near your location');
        }
      }

      // Time availability
      if (userPrefs?.availabilityDays && event.startDate) {
        const eventDay = new Date(event.startDate).toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
        if (userPrefs.availabilityDays.some(day => day.toLowerCase().includes(eventDay))) {
          score += 0.15;
          reasons.push('Fits your schedule');
        }
      }

      // Capacity consideration
      if (event.maxParticipants) {
        score += 0.1;
        reasons.push('Event available for registration');
      }

      if (score > 0.7) {
        recommendations.push({
          itemId: event.id,
          score,
          reasons
        });
      }
    }

    return recommendations;
  }

  private async recommendCoaches(userId: string, userProfile: any, userPrefs: UserAiPreferences | null, history: any[]): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];
    
    // Get available coaches
    const availableCoaches = await db
      .select()
      .from(coaches)
      .where(eq(coaches.isActive, true))
      .limit(50);

    for (const coach of availableCoaches) {
      let score = 0.3; // Base score
      const reasons: string[] = [];

      // Sports specialization matching
      if (userPrefs?.preferredSports && coach.specialties) {
        const coachSports = Array.isArray(coach.specialties) ? coach.specialties : [];
        const matchingSports = userPrefs.preferredSports.filter(sport => 
          coachSports.some((spec: string) => spec.toLowerCase().includes(sport.toLowerCase()))
        );
        if (matchingSports.length > 0) {
          score += 0.4 * matchingSports.length;
          reasons.push(`Specializes in ${matchingSports.join(', ')}`);
        }
      }

      // Experience level matching
      if (userPrefs?.experienceLevel && coach.experience) {
        // Simple experience matching based on years
        if (coach.experience.includes('5+') || coach.experience.includes('expert')) {
          score += 0.3;
          reasons.push('Experienced coach');
        }
      }

      // Budget matching
      if (userPrefs?.budgetRange && coach.hourlyRate) {
        const budget = userPrefs.budgetRange as any;
        const rate = parseFloat(coach.hourlyRate);
        if (budget?.min && budget?.max && !isNaN(rate)) {
          if (rate >= budget.min && rate <= budget.max) {
            score += 0.25;
            reasons.push('Within your budget');
          }
        }
      }

      if (score > 0.8) {
        recommendations.push({
          itemId: coach.id,
          score,
          reasons
        });
      }
    }

    return recommendations;
  }

  private async recommendTeams(userId: string, userProfile: any, userPrefs: UserAiPreferences | null, history: any[]): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];
    
    // Get teams that are public and have space
    const availableTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.isPublic, true))
      .limit(50);

    for (const team of availableTeams) {
      let score = 0.4; // Base score
      const reasons: string[] = [];

      // Sport matching
      if (userPrefs?.preferredSports && team.sport) {
        if (userPrefs.preferredSports.includes(team.sport)) {
          score += 0.4;
          reasons.push(`Plays ${team.sport}`);
        }
      }

      // Location matching
      if (userProfile?.location && team.location) {
        if (team.location.toLowerCase().includes(userProfile.location.toLowerCase())) {
          score += 0.2;
          reasons.push('Local team');
        }
      }

      // Team size consideration
      if (team.maxMembers && team.currentMembers) {
        const spotsLeft = team.maxMembers - team.currentMembers;
        if (spotsLeft > 0) {
          score += 0.1;
          reasons.push(`${spotsLeft} spots available`);
        }
      }

      if (score > 0.7) {
        recommendations.push({
          itemId: team.id,
          score,
          reasons
        });
      }
    }

    return recommendations;
  }

  private async generateCollaborativeRecommendations(
    userId: string, 
    itemType: string, 
    userProfile: any
  ): Promise<RecommendationScore[]> {
    // Find similar users based on interaction patterns
    const similarUsers = await this.findSimilarUsers(userId);
    const recommendations: RecommendationScore[] = [];
    
    if (similarUsers.length === 0) return [];

    // Get items that similar users have interacted with positively
    const similarUserInteractions = await db
      .select()
      .from(userInteractions)
      .where(and(
        inArray(userInteractions.userId, similarUsers.map(u => u.userId)),
        eq(userInteractions.targetType, itemType),
        sql`CAST(${userInteractions.weight} AS FLOAT) >= 0.7` // Only positive interactions
      ))
      .orderBy(desc(userInteractions.createdAt))
      .limit(100);

    // Score items based on how many similar users interacted with them
    const itemScores: { [key: string]: { score: number; count: number } } = {};
    
    for (const interaction of similarUserInteractions) {
      if (!itemScores[interaction.targetId]) {
        itemScores[interaction.targetId] = { score: 0, count: 0 };
      }
      itemScores[interaction.targetId].score += Number(interaction.weight || 1);
      itemScores[interaction.targetId].count += 1;
    }

    // Convert to recommendations
    Object.entries(itemScores).forEach(([itemId, data]) => {
      const avgScore = data.score / data.count;
      const popularityBoost = Math.min(0.3, data.count * 0.05);
      const finalScore = avgScore + popularityBoost;
      
      if (finalScore > 0.6) {
        recommendations.push({
          itemId,
          score: finalScore,
          reasons: [`Popular with users like you (${data.count} similar users)`]
        });
      }
    });

    return recommendations;
  }

  private async findSimilarUsers(userId: string): Promise<Array<{ userId: string; similarity: number }>> {
    // Simple similarity based on common interactions
    const userInteractions = await db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .limit(100);

    if (userInteractions.length === 0) return [];

    const targetIds = userInteractions.map(i => i.targetId);
    
    // Find users who interacted with the same items
    const otherUserInteractions = await db
      .select()
      .from(userInteractions)
      .where(and(
        inArray(userInteractions.targetId, targetIds),
        sql`${userInteractions.userId} != ${userId}`
      ));

    // Calculate similarity scores
    const userSimilarity: { [key: string]: number } = {};
    
    for (const interaction of otherUserInteractions) {
      if (!userSimilarity[interaction.userId]) {
        userSimilarity[interaction.userId] = 0;
      }
      userSimilarity[interaction.userId] += 1;
    }

    // Convert to array and sort by similarity
    return Object.entries(userSimilarity)
      .map(([userId, count]) => ({
        userId,
        similarity: count / userInteractions.length
      }))
      .filter(user => user.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }

  private combineRecommendations(
    contentBased: RecommendationScore[], 
    collaborative: RecommendationScore[]
  ): RecommendationScore[] {
    const combined: { [key: string]: RecommendationScore } = {};
    
    // Add content-based recommendations (70% weight)
    for (const rec of contentBased) {
      combined[rec.itemId] = {
        itemId: rec.itemId,
        score: rec.score * 0.7,
        reasons: [...rec.reasons, 'Content-based recommendation']
      };
    }
    
    // Add collaborative recommendations (30% weight)
    for (const rec of collaborative) {
      if (combined[rec.itemId]) {
        combined[rec.itemId].score += rec.score * 0.3;
        combined[rec.itemId].reasons.push(...rec.reasons);
      } else {
        combined[rec.itemId] = {
          itemId: rec.itemId,
          score: rec.score * 0.3,
          reasons: [...rec.reasons, 'Collaborative recommendation']
        };
      }
    }
    
    return Object.values(combined);
  }

  private async saveRecommendations(
    userId: string, 
    itemType: string, 
    recommendations: RecommendationScore[], 
    algorithm: string
  ): Promise<UserRecommendation[]> {
    const recommendationsToInsert: InsertUserRecommendation[] = recommendations.map(rec => ({
      userId,
      recommendedItemId: rec.itemId,
      itemType,
      score: rec.score.toString(),
      algorithm,
      reason: rec.reasons.join('; '),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }));

    if (recommendationsToInsert.length === 0) return [];

    return await db
      .insert(userRecommendations)
      .values(recommendationsToInsert)
      .returning();
  }

  private getLevelNumber(level: string): number {
    const levels: { [key: string]: number } = {
      'beginner': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4
    };
    return levels[level] || 1;
  }

  private isCompatibleSkillLevel(userLevel: string, teamLevel: string): boolean {
    const userNum = this.getLevelNumber(userLevel);
    const teamNum = this.getLevelNumber(teamLevel);
    return Math.abs(userNum - teamNum) <= 1;
  }

  // Get existing recommendations for a user
  async getUserRecommendations(userId: string, itemType?: string): Promise<UserRecommendation[]> {
    const query = db
      .select()
      .from(userRecommendations)
      .where(and(
        eq(userRecommendations.userId, userId),
        gte(userRecommendations.expiresAt, new Date()),
        itemType ? eq(userRecommendations.itemType, itemType) : undefined
      ))
      .orderBy(desc(userRecommendations.score))
      .limit(50);

    return await query;
  }

  // Update recommendation feedback
  async updateRecommendationFeedback(
    userId: string, 
    recommendationId: string, 
    feedback: { isViewed?: boolean; isClicked?: boolean; isLiked?: boolean }
  ): Promise<void> {
    await db
      .update(userRecommendations)
      .set(feedback)
      .where(and(
        eq(userRecommendations.id, recommendationId),
        eq(userRecommendations.userId, userId)
      ));
  }
}