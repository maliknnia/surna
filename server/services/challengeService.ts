// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from "../db";
import { 
  challenges, 
  userChallenges, 
  users,
  userPerformance,
  pointTransactions,
  type Challenge, 
  type UserChallenge, 
  type InsertChallenge, 
  type InsertUserChallenge 
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import { gamificationService } from "./gamificationService";

export interface ChallengeRequirement {
  type: 'count' | 'streak' | 'milestone' | 'social' | 'time_based';
  metric: string; // e.g., 'posts_created', 'events_attended', 'daily_login'
  target: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'total';
}

export interface ChallengeReward {
  type: 'points' | 'badge' | 'title' | 'exclusive_content';
  value: number | string;
  description: string;
}

export interface ChallengeProgress {
  current: number;
  target: number;
  percentage: number;
  isCompleted: boolean;
}

export class ChallengeService {
  
  // Create a new challenge
  async createChallenge(challengeData: {
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
    category: 'social' | 'fitness' | 'engagement' | 'learning';
    requirements: ChallengeRequirement[];
    rewards: ChallengeReward[];
    startDate?: Date;
    endDate?: Date;
    participantLimit?: number;
  }): Promise<Challenge> {
    const [challenge] = await db.insert(challenges).values({
      title: challengeData.title,
      description: challengeData.description,
      type: challengeData.type,
      category: challengeData.category,
      requirements: challengeData.requirements,
      rewards: challengeData.rewards,
      startDate: challengeData.startDate,
      endDate: challengeData.endDate,
      participantLimit: challengeData.participantLimit,
    }).returning();

    return challenge;
  }

  // Get active challenges for a user
  async getActiveChallenges(userId?: string): Promise<(Challenge & { userChallenge?: UserChallenge; progress?: ChallengeProgress })[]> {
    const now = new Date();
    
    // Get all active challenges
    const activeChallenges = await db
      .select()
      .from(challenges)
      .where(and(
        eq(challenges.isActive, true),
        // Start date check (if set)
        challenges.startDate ? gte(now, challenges.startDate) : sql`true`,
        // End date check (if set)  
        challenges.endDate ? lte(now, challenges.endDate) : sql`true`
      ))
      .orderBy(desc(challenges.createdAt));

    if (!userId) {
      return activeChallenges;
    }

    // Get user's participation status for each challenge
    const userChallengeData = await db
      .select()
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId));

    const userChallengeMap = new Map(
      userChallengeData.map(uc => [uc.challengeId, uc])
    );

    // Calculate progress for each challenge
    const challengesWithProgress = await Promise.all(
      activeChallenges.map(async (challenge) => {
        const userChallenge = userChallengeMap.get(challenge.id);
        const progress = userId ? await this.calculateProgress(userId, challenge) : undefined;
        
        return {
          ...challenge,
          userChallenge,
          progress,
        };
      })
    );

    return challengesWithProgress;
  }

  // Join a challenge
  async joinChallenge(userId: string, challengeId: string): Promise<UserChallenge | null> {
    try {
      // Check if challenge exists and is active
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(and(eq(challenges.id, challengeId), eq(challenges.isActive, true)));

      if (!challenge) {
        throw new Error('Challenge not found or inactive');
      }

      // Check participant limit
      if (challenge.participantLimit) {
        const [participantCount] = await db
          .select({ count: count() })
          .from(userChallenges)
          .where(eq(userChallenges.challengeId, challengeId));

        if (participantCount.count >= challenge.participantLimit) {
          throw new Error('Challenge is full');
        }
      }

      // Check if user already joined
      const [existingParticipation] = await db
        .select()
        .from(userChallenges)
        .where(and(
          eq(userChallenges.userId, userId),
          eq(userChallenges.challengeId, challengeId)
        ));

      if (existingParticipation) {
        return existingParticipation;
      }

      // Create user challenge entry
      const [userChallenge] = await db.insert(userChallenges).values({
        userId,
        challengeId,
        status: 'active',
        progress: {},
      }).returning();

      // Award points for joining challenge
      await gamificationService.awardPoints(userId, 'EVENT_JOIN', `Joined challenge: ${challenge.title}`);

      return userChallenge;
    } catch (error) {
      console.error('Error joining challenge:', error);
      return null;
    }
  }

  // Calculate user progress for a challenge
  async calculateProgress(userId: string, challenge: Challenge): Promise<ChallengeProgress> {
    const requirements = challenge.requirements as ChallengeRequirement[];
    
    // For simplicity, we'll handle the first requirement
    // In a full implementation, you might need to handle multiple requirements
    const requirement = requirements[0];
    
    if (!requirement) {
      return { current: 0, target: 0, percentage: 0, isCompleted: false };
    }

    let current = 0;
    const target = requirement.target;

    // Calculate current progress based on requirement type
    switch (requirement.type) {
      case 'count':
        current = await this.getCountMetric(userId, requirement);
        break;
      case 'milestone':
        current = await this.getMilestoneMetric(userId, requirement);
        break;
      case 'streak':
        current = await this.getStreakMetric(userId, requirement);
        break;
      default:
        current = 0;
    }

    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const isCompleted = current >= target;

    return { current, target, percentage, isCompleted };
  }

  private async getCountMetric(userId: string, requirement: ChallengeRequirement): Promise<number> {
    const now = new Date();
    let startDate = new Date(0); // Default to beginning of time

    // Adjust start date based on timeframe
    if (requirement.timeframe) {
      switch (requirement.timeframe) {
        case 'daily':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
    }

    // Count based on metric type
    switch (requirement.metric) {
      case 'posts_created':
        // Count point transactions for post creation
        const [postCount] = await db
          .select({ count: count() })
          .from(pointTransactions)
          .where(and(
            eq(pointTransactions.userId, userId),
            eq(pointTransactions.reason, 'POST_CREATE'),
            gte(pointTransactions.createdAt, startDate)
          ));
        return postCount.count;

      case 'events_attended':
        const [eventCount] = await db
          .select({ count: count() })
          .from(pointTransactions)
          .where(and(
            eq(pointTransactions.userId, userId),
            eq(pointTransactions.reason, 'EVENT_ATTEND'),
            gte(pointTransactions.createdAt, startDate)
          ));
        return eventCount.count;

      case 'points_earned':
        const [pointsSum] = await db
          .select({ sum: sql<number>`COALESCE(SUM(${pointTransactions.points}), 0)` })
          .from(pointTransactions)
          .where(and(
            eq(pointTransactions.userId, userId),
            eq(pointTransactions.type, 'earned'),
            gte(pointTransactions.createdAt, startDate)
          ));
        return pointsSum.sum;

      default:
        return 0;
    }
  }

  private async getMilestoneMetric(userId: string, requirement: ChallengeRequirement): Promise<number> {
    switch (requirement.metric) {
      case 'total_points':
        const [userPerf] = await db
          .select()
          .from(userPerformance)
          .where(eq(userPerformance.userId, userId));
        return userPerf?.totalPoints || 0;

      case 'level_reached':
        // Would need to get from user levels table
        return 1; // Simplified

      default:
        return 0;
    }
  }

  private async getStreakMetric(userId: string, requirement: ChallengeRequirement): Promise<number> {
    // This would integrate with the streak system
    // For now, simplified implementation
    return 0;
  }

  // Update challenge progress and check completion
  async updateChallengeProgress(userId: string): Promise<void> {
    try {
      // Get all active user challenges
      const activeUserChallenges = await db
        .select({
          userChallenge: userChallenges,
          challenge: challenges,
        })
        .from(userChallenges)
        .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
        .where(and(
          eq(userChallenges.userId, userId),
          eq(userChallenges.status, 'active'),
          eq(challenges.isActive, true)
        ));

      // Check progress for each challenge
      for (const { userChallenge, challenge } of activeUserChallenges) {
        const progress = await this.calculateProgress(userId, challenge);
        
        // Update progress in database
        await db
          .update(userChallenges)
          .set({
            progress: {
              current: progress.current,
              target: progress.target,
              percentage: progress.percentage,
              lastUpdated: new Date(),
            },
          })
          .where(eq(userChallenges.id, userChallenge.id));

        // Check if challenge is completed
        if (progress.isCompleted && userChallenge.status === 'active') {
          await this.completeChallenge(userId, challenge.id);
        }
      }
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  }

  // Complete a challenge and award rewards
  async completeChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Update challenge status
        await tx
          .update(userChallenges)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(and(
            eq(userChallenges.userId, userId),
            eq(userChallenges.challengeId, challengeId)
          ));

        // Get challenge details for rewards
        const [challenge] = await tx
          .select()
          .from(challenges)
          .where(eq(challenges.id, challengeId));

        if (challenge) {
          const rewards = challenge.rewards as ChallengeReward[];
          
          // Award each reward
          for (const reward of rewards) {
            await this.awardChallengeReward(userId, reward, challenge.title, tx);
          }

          // Update user performance
          await tx
            .insert(userPerformance)
            .values({
              userId,
              challengesCompleted: 1,
            })
            .onConflictDoUpdate({
              target: [userPerformance.userId],
              set: {
                challengesCompleted: sql`${userPerformance.challengesCompleted} + 1`,
                updatedAt: new Date(),
              },
            });
        }
      });
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  }

  // Award challenge rewards
  private async awardChallengeReward(
    userId: string, 
    reward: ChallengeReward, 
    challengeTitle: string, 
    tx: any
  ): Promise<void> {
    switch (reward.type) {
      case 'points':
        await tx.insert(pointTransactions).values({
          userId,
          points: reward.value as number,
          type: 'earned',
          reason: 'challenge_completed',
          description: `Completed challenge: ${challengeTitle}`,
        });
        break;

      case 'badge':
        // This would integrate with the badge system
        // For now, award equivalent points
        await tx.insert(pointTransactions).values({
          userId,
          points: 100, // Default badge value
          type: 'earned',
          reason: 'challenge_badge',
          description: `Badge earned from challenge: ${challengeTitle}`,
        });
        break;

      default:
        break;
    }
  }

  // Get user's challenge history
  async getUserChallenges(userId: string): Promise<(UserChallenge & { challenge: Challenge })[]> {
    const result = await db
      .select({
        userChallenge: userChallenges,
        challenge: challenges,
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(eq(userChallenges.userId, userId))
      .orderBy(desc(userChallenges.startedAt));

    return result.map(r => ({
      ...r.userChallenge,
      challenge: r.challenge,
    }));
  }

  // Get challenge leaderboard
  async getChallengeLeaderboard(challengeId: string, limit: number = 10) {
    const result = await db
      .select({
        userId: userChallenges.userId,
        progress: userChallenges.progress,
        completedAt: userChallenges.completedAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(userChallenges)
      .innerJoin(users, eq(userChallenges.userId, users.id))
      .where(eq(userChallenges.challengeId, challengeId))
      .orderBy(
        // Completed challenges first, then by progress
        sql`CASE WHEN ${userChallenges.status} = 'completed' THEN 0 ELSE 1 END`,
        userChallenges.completedAt,
        sql`CAST(${userChallenges.progress}->>'percentage' AS float) DESC`
      )
      .limit(limit);

    return result;
  }

  // Create predefined challenges
  async createPredefinedChallenges(): Promise<void> {
    const predefinedChallenges = [
      {
        title: "Social Starter",
        description: "Create your first 5 posts and start connecting with the community",
        type: "weekly" as const,
        category: "social" as const,
        requirements: [{
          type: "count" as const,
          metric: "posts_created",
          target: 5,
          timeframe: "weekly" as const,
        }],
        rewards: [{
          type: "points" as const,
          value: 100,
          description: "100 bonus points for social engagement",
        }],
      },
      {
        title: "Event Explorer", 
        description: "Attend 3 events this month to discover new opportunities",
        type: "monthly" as const,
        category: "engagement" as const,
        requirements: [{
          type: "count" as const,
          metric: "events_attended",
          target: 3,
          timeframe: "monthly" as const,
        }],
        rewards: [{
          type: "points" as const,
          value: 200,
          description: "200 points for event participation",
        }],
      },
      {
        title: "Point Collector",
        description: "Earn 500 points through various activities",
        type: "weekly" as const,
        category: "engagement" as const,
        requirements: [{
          type: "count" as const,
          metric: "points_earned",
          target: 500,
          timeframe: "weekly" as const,
        }],
        rewards: [{
          type: "points" as const,
          value: 150,
          description: "150 bonus points for dedication",
        }],
      },
    ];

    for (const challengeData of predefinedChallenges) {
      try {
        await this.createChallenge(challengeData);
      } catch (error) {
        console.error(`Error creating challenge "${challengeData.title}":`, error);
      }
    }
  }
}

export const challengeService = new ChallengeService();