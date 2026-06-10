// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from "../db";
import { 
  users, 
  userPerformance, 
  pointTransactions, 
  badgeDefinitions, 
  userBadges, 
  userLevels, 
  leaderboards, 
  userStreaks,
  notifications,
  type User,
  type BadgeDefinition,
  type UserBadge,
  type UserLevel,
  type PointTransaction,
  type UserStreak,
  type Leaderboard,
  type InsertBadgeDefinition,
  type InsertUserBadge,
  type InsertUserLevel,
  type InsertLeaderboard,
  type InsertUserStreak,
  type UserBadgeWithDefinition,
  type GamificationData
} from "../../shared/schema";
import { eq, desc, sql, and, gte, lte, isNull } from "drizzle-orm";

// Point values for different actions
export const POINT_VALUES = {
  POST_CREATE: 10,
  POST_LIKE: 2,
  POST_COMMENT: 5,
  EVENT_CREATE: 15,
  EVENT_JOIN: 10,
  EVENT_ATTEND: 20,
  TEAM_JOIN: 15,
  TEAM_CREATE: 25,
  MESSAGE_SEND: 1,
  COACH_SESSION: 30,
  PROFILE_COMPLETE: 50,
  FIRST_LOGIN: 25,
  DAILY_LOGIN: 5,
  WEEKLY_STREAK: 50,
  MONTHLY_STREAK: 200,
} as const;

// Level thresholds (XP required for each level)
export const LEVEL_THRESHOLDS = [
  0,     // Level 1
  100,   // Level 2
  250,   // Level 3
  500,   // Level 4
  1000,  // Level 5
  2000,  // Level 6
  3500,  // Level 7
  5500,  // Level 8
  8000,  // Level 9
  12000, // Level 10
  17000, // Level 11
  25000, // Level 12
  35000, // Level 13
  50000, // Level 14
  75000, // Level 15
  100000 // Level 16+
];

// Badge requirements
export const BADGE_REQUIREMENTS = {
  FIRST_POST: { type: 'count', metric: 'posts_created', value: 1 },
  SOCIAL_BUTTERFLY: { type: 'count', metric: 'posts_created', value: 10 },
  CONTENT_CREATOR: { type: 'count', metric: 'posts_created', value: 50 },
  EVENT_ORGANIZER: { type: 'count', metric: 'events_created', value: 5 },
  TEAM_PLAYER: { type: 'count', metric: 'teams_joined', value: 3 },
  COACH_SEEKER: { type: 'count', metric: 'coach_sessions', value: 10 },
  STREAK_MASTER: { type: 'streak', metric: 'daily_login', value: 7 },
  LEVEL_UP: { type: 'milestone', metric: 'level_reached', value: 5 },
  POINT_COLLECTOR: { type: 'milestone', metric: 'total_points', value: 1000 },
} as const;

export class GamificationService {
  
  // Award points to a user for specific actions
  async awardPoints(userId: string, action: keyof typeof POINT_VALUES, description?: string): Promise<void> {
    const points = POINT_VALUES[action];
    
    try {
      // Start transaction
      await db.transaction(async (tx) => {
        // Add point transaction record
        await tx.insert(pointTransactions).values({
          userId,
          points,
          reason: action,
          description: description || `Points awarded for ${action}`,
        });

        // Update user performance total points
        await tx.insert(userPerformance)
          .values({
            userId,
            totalPoints: points,
          })
          .onConflictDoUpdate({
            target: [userPerformance.userId],
            set: {
              totalPoints: sql`${userPerformance.totalPoints} + ${points}`,
              updatedAt: new Date(),
            },
          });

        // Update or create user level
        await this.updateUserLevel(userId, tx);
        
        // Check for badge achievements
        await this.checkBadgeProgress(userId, tx);
        
        // Send notification
        await this.sendPointsNotification(userId, points, action, tx);
      });
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  // Update user level based on total points
  async updateUserLevel(userId: string, tx?: any): Promise<void> {
    const dbClient = tx || db;
    
    // Get current user performance
    const [performance] = await dbClient
      .select()
      .from(userPerformance)
      .where(eq(userPerformance.userId, userId));

    if (!performance) return;

    const totalXP = performance.totalPoints;
    let newLevel = 1;
    let xpToNextLevel = LEVEL_THRESHOLDS[1];

    // Calculate new level
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= LEVEL_THRESHOLDS[i]) {
        newLevel = i + 1;
        xpToNextLevel = i + 1 < LEVEL_THRESHOLDS.length ? 
          LEVEL_THRESHOLDS[i + 1] - totalXP : 0;
        break;
      }
    }

    // Update or create user level
    const currentXP = totalXP - (newLevel > 1 ? LEVEL_THRESHOLDS[newLevel - 2] : 0);
    
    await dbClient.insert(userLevels)
      .values({
        userId,
        currentLevel: newLevel,
        currentXP,
        totalXP,
        xpToNextLevel,
      })
      .onConflictDoUpdate({
        target: [userLevels.userId],
        set: {
          currentLevel: newLevel,
          currentXP,
          totalXP,
          xpToNextLevel,
          updatedAt: new Date(),
        },
      });

    // Check if user leveled up and send notification
    const [existingLevel] = await dbClient
      .select()
      .from(userLevels)
      .where(eq(userLevels.userId, userId));

    if (existingLevel && existingLevel.currentLevel < newLevel) {
      await this.sendLevelUpNotification(userId, newLevel, tx);
    }
  }

  // Check and award badges based on user progress
  async checkBadgeProgress(userId: string, tx?: any): Promise<void> {
    const dbClient = tx || db;
    
    // Get user's current stats
    const [performance] = await dbClient
      .select()
      .from(userPerformance)
      .where(eq(userPerformance.userId, userId));

    if (!performance) return;

    // Get all badge definitions
    const allBadges = await dbClient
      .select()
      .from(badgeDefinitions)
      .where(eq(badgeDefinitions.isActive, true));

    // Get user's current badges
    const currentBadges = await dbClient
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));

    const currentBadgeIds = new Set(currentBadges.map((b: UserBadge) => b.badgeId));

    // Check each badge requirement
    for (const badge of allBadges) {
      if (currentBadgeIds.has(badge.id)) continue; // Already has this badge

      const shouldAward = await this.checkBadgeRequirement(userId, badge, performance, dbClient);
      
      if (shouldAward) {
        await this.awardBadge(userId, badge.id, dbClient);
      }
    }
  }

  // Check if user meets badge requirement
  private async checkBadgeRequirement(
    userId: string, 
    badge: BadgeDefinition, 
    performance: any, 
    dbClient: any
  ): Promise<boolean> {
    const requirement = badge.requirementData as any;
    
    switch (badge.requirementType) {
      case 'count':
        return this.checkCountRequirement(performance, requirement);
      case 'milestone':
        return this.checkMilestoneRequirement(performance, requirement);
      case 'streak':
        return await this.checkStreakRequirement(userId, requirement, dbClient);
      default:
        return false;
    }
  }

  private checkCountRequirement(performance: any, requirement: any): boolean {
    const metric = requirement.metric;
    const requiredValue = requirement.value;
    
    switch (metric) {
      case 'posts_created':
        // Would need to count posts - simplified for now
        return performance.totalPoints >= requiredValue * POINT_VALUES.POST_CREATE;
      case 'events_created':
        return performance.eventsAttended >= requiredValue;
      case 'teams_joined':
        return performance.teamsJoined >= requiredValue;
      default:
        return false;
    }
  }

  private checkMilestoneRequirement(performance: any, requirement: any): boolean {
    const metric = requirement.metric;
    const requiredValue = requirement.value;
    
    switch (metric) {
      case 'total_points':
        return performance.totalPoints >= requiredValue;
      case 'level_reached':
        return performance.currentLevel >= requiredValue;
      default:
        return false;
    }
  }

  private async checkStreakRequirement(userId: string, requirement: any, dbClient: any): Promise<boolean> {
    const [streak] = await dbClient
      .select()
      .from(userStreaks)
      .where(and(
        eq(userStreaks.userId, userId),
        eq(userStreaks.streakType, requirement.metric)
      ));

    return streak ? streak.currentStreak >= requirement.value : false;
  }

  // Award a badge to a user
  async awardBadge(userId: string, badgeId: string, tx?: any): Promise<void> {
    const dbClient = tx || db;
    
    try {
      // Insert user badge
      await dbClient.insert(userBadges).values({
        userId,
        badgeId,
      });

      // Get badge details for notification
      const [badge] = await dbClient
        .select()
        .from(badgeDefinitions)
        .where(eq(badgeDefinitions.id, badgeId));

      if (badge) {
        // Award points for earning badge
        if (badge.pointsAwarded > 0) {
          await dbClient.insert(pointTransactions).values({
            userId,
            points: badge.pointsAwarded,
            reason: 'badge_earned',
            description: `Badge earned: ${badge.title}`,
          });
        }

        // Send notification
        await this.sendBadgeNotification(userId, badge, dbClient);
      }
    } catch (error) {
      console.error('Error awarding badge:', error);
      throw error;
    }
  }

  // Update user streak
  async updateStreak(userId: string, streakType: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.transaction(async (tx) => {
        const [currentStreak] = await tx
          .select()
          .from(userStreaks)
          .where(and(
            eq(userStreaks.userId, userId),
            eq(userStreaks.streakType, streakType)
          ));

        if (currentStreak) {
          const lastActivity = new Date(currentStreak.lastActivityDate || 0);
          lastActivity.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
          
          let newStreak = currentStreak.currentStreak || 0;
          let newLongest = currentStreak.longestStreak || 0;
          
          if (daysDiff === 1) {
            // Consecutive day - increment streak
            newStreak += 1;
            newLongest = Math.max(newLongest, newStreak);
          } else if (daysDiff > 1) {
            // Streak broken - reset to 1
            newStreak = 1;
          }
          // If daysDiff === 0, same day - no change
          
          await tx.update(userStreaks)
            .set({
              currentStreak: newStreak,
              longestStreak: newLongest,
              lastActivityDate: today,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(userStreaks.id, currentStreak.id));
        } else {
          // Create new streak
          await tx.insert(userStreaks).values({
            userId,
            streakType,
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: today,
          });
        }
      });
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  // Get user's gamification data
  async getUserGamificationData(userId: string): Promise<GamificationData | null> {
    try {
      const [level] = await db
        .select()
        .from(userLevels)
        .where(eq(userLevels.userId, userId));

      if (!level) {
        // Initialize user level if doesn't exist
        await this.updateUserLevel(userId);
        return this.getUserGamificationData(userId);
      }

      const badges = await db
        .select({
          id: userBadges.id,
          userId: userBadges.userId,
          badgeId: userBadges.badgeId,
          earnedAt: userBadges.earnedAt,
          progress: userBadges.progress,
          isDisplayed: userBadges.isDisplayed,
          notificationSent: userBadges.notificationSent,
          badge: badgeDefinitions,
        })
        .from(userBadges)
        .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.earnedAt));

      const streaks = await db
        .select()
        .from(userStreaks)
        .where(eq(userStreaks.userId, userId));

      const recentPoints = await db
        .select()
        .from(pointTransactions)
        .where(eq(pointTransactions.userId, userId))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(10);

      // Get leaderboard position
      const leaderboardEntry = await db
        .select()
        .from(leaderboards)
        .where(and(
          eq(leaderboards.userId, userId),
          eq(leaderboards.metric, 'total_points'),
          eq(leaderboards.timeframe, 'all_time')
        ));

      const leaderboardPosition = leaderboardEntry[0]?.rank || 0;

      // Calculate progress to next level
      const xpToNext = level.xpToNextLevel || 0;
      const currentXP = level.currentXP || 0;
      const nextLevelProgress = xpToNext > 0 ? 
        (currentXP / (currentXP + xpToNext)) * 100 : 100;

      return {
        level,
        badges: badges as UserBadgeWithDefinition[],
        streaks,
        recentPoints,
        leaderboardPosition,
        nextLevelProgress,
      };
    } catch (error) {
      console.error('Error getting user gamification data:', error);
      return null;
    }
  }

  // Get leaderboard for specific metric and timeframe
  async getLeaderboard(metric: string, timeframe: string, sport?: string, limit: number = 50): Promise<Leaderboard[]> {
    try {
      const query = db
        .select({
          id: leaderboards.id,
          userId: leaderboards.userId,
          metric: leaderboards.metric,
          value: leaderboards.value,
          rank: leaderboards.rank,
          timeframe: leaderboards.timeframe,
          sport: leaderboards.sport,
          region: leaderboards.region,
          periodStart: leaderboards.periodStart,
          periodEnd: leaderboards.periodEnd,
          updatedAt: leaderboards.updatedAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            username: users.username,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(leaderboards)
        .innerJoin(users, eq(leaderboards.userId, users.id))
        .where(and(
          eq(leaderboards.metric, metric),
          eq(leaderboards.timeframe, timeframe),
          sport ? eq(leaderboards.sport, sport) : isNull(leaderboards.sport)
        ))
        .orderBy(leaderboards.rank)
        .limit(limit);

      return await query;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Update leaderboards (should be run periodically)
  async updateLeaderboards(): Promise<void> {
    try {
      // Clear existing leaderboards
      await db.delete(leaderboards);

      // Calculate and insert new leaderboard entries
      await this.calculatePointsLeaderboard('all_time');
      await this.calculatePointsLeaderboard('monthly');
      await this.calculatePointsLeaderboard('weekly');
      
      // Add other metrics as needed
      await this.calculateLevelLeaderboard();
      
    } catch (error) {
      console.error('Error updating leaderboards:', error);
      throw error;
    }
  }

  private async calculatePointsLeaderboard(timeframe: string): Promise<void> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeframe) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all_time':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get top users by points for the timeframe
    const query = timeframe === 'all_time' 
      ? db.select({
          userId: userPerformance.userId,
          totalPoints: userPerformance.totalPoints,
        })
        .from(userPerformance)
        .orderBy(desc(userPerformance.totalPoints))
        .limit(1000)
      : db.select({
          userId: pointTransactions.userId,
          totalPoints: sql<number>`SUM(${pointTransactions.points})`.as('totalPoints'),
        })
        .from(pointTransactions)
        .where(and(
          gte(pointTransactions.createdAt, startDate),
          lte(pointTransactions.createdAt, endDate)
        ))
        .groupBy(pointTransactions.userId)
        .orderBy(desc(sql`SUM(${pointTransactions.points})`))
        .limit(1000);

    const results = await query;

    // Insert leaderboard entries
    const leaderboardEntries = results.map((result, index) => ({
      userId: result.userId,
      metric: 'total_points',
      value: result.totalPoints || 0,
      rank: index + 1,
      timeframe,
      periodStart: startDate,
      periodEnd: timeframe !== 'all_time' ? endDate : undefined,
    }));

    if (leaderboardEntries.length > 0) {
      await db.insert(leaderboards).values(leaderboardEntries);
    }
  }

  private async calculateLevelLeaderboard(): Promise<void> {
    const results = await db.select({
      userId: userLevels.userId,
      currentLevel: userLevels.currentLevel,
      totalXP: userLevels.totalXP,
    })
    .from(userLevels)
    .orderBy(desc(userLevels.currentLevel), desc(userLevels.totalXP))
    .limit(1000);

    const leaderboardEntries = results.map((result, index) => ({
      userId: result.userId,
      metric: 'level',
      value: result.currentLevel || 1,
      rank: index + 1,
      timeframe: 'all_time',
      periodStart: new Date(0),
      periodEnd: undefined,
    }));

    if (leaderboardEntries.length > 0) {
      await db.insert(leaderboards).values(leaderboardEntries);
    }
  }

  // Notification helpers
  private async sendPointsNotification(userId: string, points: number, action: string, tx: any): Promise<void> {
    await tx.insert(notifications).values({
      userId,
      title: `+${points} Points!`,
      body: `You earned ${points} points for ${action.replace('_', ' ').toLowerCase()}`,
      type: 'score',
    });
  }

  private async sendLevelUpNotification(userId: string, newLevel: number, tx: any): Promise<void> {
    await tx.insert(notifications).values({
      userId,
      title: `Level Up! 🎉`,
      body: `Congratulations! You've reached level ${newLevel}!`,
      type: 'score',
    });
  }

  private async sendBadgeNotification(userId: string, badge: BadgeDefinition, tx: any): Promise<void> {
    await tx.insert(notifications).values({
      userId,
      title: `New Badge! ${badge.iconEmoji}`,
      body: `You've earned the "${badge.title}" badge!`,
      type: 'score',
    });
  }
}

export const gamificationService = new GamificationService();