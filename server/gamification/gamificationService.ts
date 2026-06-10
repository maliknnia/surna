import { db } from '../db';
import { 
  pointTransactions, 
  badgeDefinitions, 
  userBadges, 
  userLevels, 
  userStreaks,
  rewards,
  userRewards,
  users,
  posts,
  events,
  teams
} from '@shared/schema';
import { eq, desc, asc, sql, and, or, sum, count, gte, lt, inArray } from 'drizzle-orm';
import { queueNotification } from '../notifications/pushService';

export interface PointsActivity {
  action: string;
  points: number;
  description: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface BadgeRequirement {
  type: 'points' | 'streak' | 'count' | 'level' | 'custom';
  target: number;
  metric?: string;
  sport?: string;
  timeframe?: string; // 'daily', 'weekly', 'monthly', 'all-time'
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'team';
  category: 'activity' | 'social' | 'skill' | 'competition';
  requirements: BadgeRequirement[];
  rewards: {
    points: number;
    badge?: string;
    rewardIds?: string[];
  };
  startDate: Date;
  endDate: Date;
  participantLimit?: number;
  isActive: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  profileImageUrl?: string;
  points: number;
  level: number;
  badges: number;
  rank: number;
}

// Points system configuration
const POINTS_CONFIG = {
  POST_CREATED: 10,
  POST_LIKED: 2,
  COMMENT_CREATED: 5,
  EVENT_CREATED: 15,
  EVENT_ATTENDED: 20,
  TEAM_JOINED: 10,
  TEAM_CREATED: 25,
  PROFILE_COMPLETED: 50,
  FRIEND_ADDED: 5,
  DAILY_LOGIN: 5,
  PURCHASE_MADE: 1, // 1 point per dollar spent
  COACH_SESSION_COMPLETED: 30,
  SKILL_TEST_PASSED: 40,
  TOURNAMENT_PARTICIPATION: 50,
  TOURNAMENT_WIN: 100,
} as const;

// Level progression configuration
const LEVEL_PROGRESSION = [
  0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900, 3500,
  4200, 4950, 5750, 6600, 7500, 8500, 9600, 10800, 12100, 13500,
  15000, 17000, 19500, 22500, 26000, 30000, 35000, 41000, 48000, 56000
];

export class GamificationService {
  
  // Award points for user actions
  static async awardPoints(
    userId: string, 
    activity: PointsActivity,
    skipDuplicateCheck = false
  ): Promise<{ success: boolean; totalPoints: number; levelUp?: boolean }> {
    try {
      // Check for duplicate transactions to prevent point farming
      if (!skipDuplicateCheck && activity.relatedEntityId) {
        const existing = await db
          .select()
          .from(pointTransactions)
          .where(
            and(
              eq(pointTransactions.userId, userId),
              eq(pointTransactions.action, activity.action),
              eq(pointTransactions.relatedEntityId, activity.relatedEntityId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Points already awarded for this action
          const currentLevel = await this.getUserLevel(userId);
          return { 
            success: false, 
            totalPoints: currentLevel.totalPoints 
          };
        }
      }

      // Create point transaction
      await db.insert(pointTransactions).values({
        userId,
        points: activity.points,
        action: activity.action,
        description: activity.description,
        relatedEntityType: activity.relatedEntityType,
        relatedEntityId: activity.relatedEntityId
      });

      // Update user level
      const levelResult = await this.updateUserLevel(userId, activity.points);
      
      // Check for new badges
      await this.checkForNewBadges(userId);
      
      // Update streaks if applicable
      if (activity.action.includes('daily') || activity.action.includes('login')) {
        await this.updateStreak(userId, 'daily_login');
      }

      // Send notification for significant points
      if (activity.points >= 20) {
        await queueNotification({
          userId,
          title: 'Points Earned!',
          body: `You earned ${activity.points} points for ${activity.description}`,
          type: 'gamification',
          data: { 
            points: activity.points, 
            action: activity.action,
            totalPoints: levelResult.totalPoints
          }
        });
      }

      return {
        success: true,
        totalPoints: levelResult.totalPoints,
        levelUp: levelResult.levelUp
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, totalPoints: 0 };
    }
  }

  // Get or create user level
  static async getUserLevel(userId: string, sport?: string): Promise<{
    level: number;
    totalPoints: number;
    pointsToNextLevel: number;
    sport?: string;
  }> {
    const existing = await db
      .select()
      .from(userLevels)
      .where(
        and(
          eq(userLevels.userId, userId),
          sport ? eq(userLevels.sport, sport) : sql`${userLevels.sport} IS NULL`
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create initial level
      await db.insert(userLevels).values({
        userId,
        level: 1,
        totalPoints: 0,
        pointsToNextLevel: LEVEL_PROGRESSION[1],
        sport
      });

      return {
        level: 1,
        totalPoints: 0,
        pointsToNextLevel: LEVEL_PROGRESSION[1],
        sport
      };
    }

    const row = existing[0];
    return {
      level: row.level ?? 1,
      totalPoints: row.totalPoints ?? 0,
      pointsToNextLevel: row.pointsToNextLevel ?? LEVEL_PROGRESSION[1],
      sport: row.sport ?? undefined,
    };
  }

  // Update user level based on points
  static async updateUserLevel(
    userId: string, 
    pointsToAdd: number, 
    sport?: string
  ): Promise<{ totalPoints: number; level: number; levelUp: boolean }> {
    const currentLevel = await this.getUserLevel(userId, sport);
    const newTotalPoints = currentLevel.totalPoints + pointsToAdd;
    
    // Calculate new level
    let newLevel = currentLevel.level;
    for (let i = 0; i < LEVEL_PROGRESSION.length; i++) {
      if (newTotalPoints >= LEVEL_PROGRESSION[i] && i + 1 > newLevel) {
        newLevel = i + 1;
      }
    }

    const pointsToNextLevel = newLevel < LEVEL_PROGRESSION.length 
      ? LEVEL_PROGRESSION[newLevel] - newTotalPoints 
      : 0;

    // Update in database
    await db
      .update(userLevels)
      .set({
        level: newLevel,
        totalPoints: newTotalPoints,
        pointsToNextLevel,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userLevels.userId, userId),
          sport ? eq(userLevels.sport, sport) : sql`${userLevels.sport} IS NULL`
        )
      );

    // Check if level increased
    const levelUp = newLevel > currentLevel.level;
    
    if (levelUp) {
      // Award level-up notification and badge
      await queueNotification({
        userId,
        title: 'Level Up!',
        body: `Congratulations! You reached level ${newLevel}${sport ? ` in ${sport}` : ''}!`,
        type: 'gamification',
        data: { 
          level: newLevel, 
          sport,
          totalPoints: newTotalPoints 
        }
      });

      // Check for level-based badges
      await this.checkLevelBadges(userId, newLevel, sport);
    }

    return {
      totalPoints: newTotalPoints,
      level: newLevel,
      levelUp
    };
  }

  // Check and award new badges
  static async checkForNewBadges(userId: string): Promise<string[]> {
    const newBadges: string[] = [];

    try {
      // Get all active badge definitions
      const badges = await db
        .select()
        .from(badgeDefinitions)
        .where(eq(badgeDefinitions.isActive, true));

      // Get user's existing badges
      const userExistingBadges = await db
        .select({ badgeId: userBadges.badgeId })
        .from(userBadges)
        .where(eq(userBadges.userId, userId));

      const existingBadgeIds = new Set(userExistingBadges.map(b => b.badgeId));

      // Check each badge requirement
      for (const badge of badges) {
        if (existingBadgeIds.has(badge.id)) {
          continue; // User already has this badge
        }

        const meetsRequirements = await this.checkBadgeRequirements(
          userId, 
          badge.requirements as BadgeRequirement[]
        );

        if (meetsRequirements) {
          // Award the badge
          await db.insert(userBadges).values({
            userId,
            badgeId: badge.id
          });

          newBadges.push(badge.id);

          // Send notification
          await queueNotification({
            userId,
            title: 'New Badge Earned!',
            body: `You earned the "${badge.name}" badge! ${badge.description}`,
            type: 'gamification',
            data: { 
              badgeId: badge.id, 
              badgeName: badge.name,
              badgeCategory: badge.category
            }
          });
        }
      }

      return newBadges;
    } catch (error) {
      console.error('Error checking for new badges:', error);
      return [];
    }
  }

  // Check if user meets badge requirements
  private static async checkBadgeRequirements(
    userId: string, 
    requirements: BadgeRequirement[]
  ): Promise<boolean> {
    for (const req of requirements) {
      const meets = await this.checkSingleRequirement(userId, req);
      if (!meets) {
        return false; // All requirements must be met
      }
    }
    return true;
  }

  // Check individual badge requirement
  private static async checkSingleRequirement(
    userId: string, 
    req: BadgeRequirement
  ): Promise<boolean> {
    try {
      switch (req.type) {
        case 'points': {
          const userLevel = await this.getUserLevel(userId, req.sport);
          return userLevel.totalPoints >= req.target;
        }

        case 'streak': {
          const streak = await db
            .select()
            .from(userStreaks)
            .where(
              and(
                eq(userStreaks.userId, userId),
                eq(userStreaks.type, req.metric || 'daily_login')
              )
            )
            .limit(1);

          const cur = streak[0]?.currentStreak ?? 0;
          const longest = streak[0]?.longestStreak ?? 0;
          return streak.length > 0 && (cur >= req.target || longest >= req.target);
        }

        case 'count': {
          let query;
          switch (req.metric) {
            case 'posts':
              query = db
                .select({ count: count() })
                .from(posts)
                .where(eq(posts.authorId, userId));
              break;
            case 'events':
              query = db
                .select({ count: count() })
                .from(events)
                .where(eq(events.organizerId, userId));
              break;
            case 'teams':
              query = db
                .select({ count: count() })
                .from(teams)
                .where(eq(teams.captainId, userId));
              break;
            default:
              return false;
          }

          const result = await query;
          return result[0]?.count >= req.target;
        }

        case 'level': {
          const userLevel = await this.getUserLevel(userId, req.sport);
          return userLevel.level >= req.target;
        }

        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking requirement:', error);
      return false;
    }
  }

  // Update user streaks
  static async updateStreak(userId: string, type: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    isNewRecord: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db
      .select()
      .from(userStreaks)
      .where(
        and(
          eq(userStreaks.userId, userId),
          eq(userStreaks.type, type)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new streak
      await db.insert(userStreaks).values({
        userId,
        type,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today
      });

      return { currentStreak: 1, longestStreak: 1, isNewRecord: true };
    }

    const streak = existing[0];
    const lastActivity = new Date(streak.lastActivityDate || 0);
    lastActivity.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrentStreak: number;
    let newLongestStreak: number;

    const curStreak = streak.currentStreak ?? 0;
    const longStreak = streak.longestStreak ?? 0;

    if (daysDiff === 0) {
      // Same day, no change
      return {
        currentStreak: curStreak,
        longestStreak: longStreak,
        isNewRecord: false
      };
    } else if (daysDiff === 1) {
      // Consecutive day
      newCurrentStreak = curStreak + 1;
      newLongestStreak = Math.max(longStreak, newCurrentStreak);
    } else {
      // Streak broken
      newCurrentStreak = 1;
      newLongestStreak = longStreak;
    }

    await db
      .update(userStreaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: today,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userStreaks.userId, userId),
          eq(userStreaks.type, type)
        )
      );

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      isNewRecord: newLongestStreak > longStreak
    };
  }

  // Get user's gamification stats
  static async getUserStats(userId: string): Promise<{
    level: number;
    totalPoints: number;
    pointsToNextLevel: number;
    badges: Array<{
      id: string;
      name: string;
      description: string;
      iconUrl?: string;
      category: string;
      tier: string;
      earnedAt: Date;
    }>;
    streaks: Array<{
      type: string;
      currentStreak: number;
      longestStreak: number;
    }>;
    recentActivities: Array<{
      action: string;
      points: number;
      description: string;
      createdAt: Date;
    }>;
  }> {
    // Get user level
    const userLevel = await this.getUserLevel(userId);

    // Get user badges
    const badges = await db
      .select({
        id: badgeDefinitions.id,
        name: badgeDefinitions.name,
        description: badgeDefinitions.description,
        iconUrl: badgeDefinitions.iconUrl,
        category: badgeDefinitions.category,
        tier: badgeDefinitions.tier,
        earnedAt: userBadges.earnedAt
      })
      .from(userBadges)
      .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));

    // Get user streaks
    const streaks = await db
      .select({
        type: userStreaks.type,
        currentStreak: userStreaks.currentStreak,
        longestStreak: userStreaks.longestStreak
      })
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId));

    // Get recent point transactions
    const recentActivities = await db
      .select({
        action: pointTransactions.action,
        points: pointTransactions.points,
        description: pointTransactions.description,
        createdAt: pointTransactions.createdAt
      })
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(20);

    return {
      level: userLevel.level,
      totalPoints: userLevel.totalPoints,
      pointsToNextLevel: userLevel.pointsToNextLevel,
      badges: badges.map((b) => ({
        ...b,
        iconUrl: b.iconUrl ?? undefined,
        tier: b.tier ?? '',
        earnedAt: b.earnedAt ?? new Date(0),
      })),
      streaks: streaks.map((s) => ({
        ...s,
        currentStreak: s.currentStreak ?? 0,
        longestStreak: s.longestStreak ?? 0,
      })),
      recentActivities: recentActivities.map((a) => ({
        ...a,
        description: a.description ?? '',
        createdAt: a.createdAt ?? new Date(0),
      })),
    };
  }

  // Get leaderboards
  static async getLeaderboard(
    type: 'points' | 'level' | 'badges' = 'points',
    sport?: string,
    limit = 50
  ): Promise<LeaderboardEntry[]> {
    let query;

    switch (type) {
      case 'points':
        query = db
          .select({
            userId: userLevels.userId,
            username: users.username,
            profileImageUrl: users.profileImageUrl,
            totalPoints: userLevels.totalPoints,
            level: userLevels.level
          })
          .from(userLevels)
          .innerJoin(users, eq(userLevels.userId, users.id))
          .where(sport ? eq(userLevels.sport, sport) : sql`${userLevels.sport} IS NULL`)
          .orderBy(desc(userLevels.totalPoints))
          .limit(limit);
        break;

      case 'level':
        query = db
          .select({
            userId: userLevels.userId,
            username: users.username,
            profileImageUrl: users.profileImageUrl,
            totalPoints: userLevels.totalPoints,
            level: userLevels.level
          })
          .from(userLevels)
          .innerJoin(users, eq(userLevels.userId, users.id))
          .where(sport ? eq(userLevels.sport, sport) : sql`${userLevels.sport} IS NULL`)
          .orderBy(desc(userLevels.level), desc(userLevels.totalPoints))
          .limit(limit);
        break;

      case 'badges':
        query = db
          .select({
            userId: userBadges.userId,
            username: users.username,
            profileImageUrl: users.profileImageUrl,
            badgeCount: count(userBadges.badgeId),
          })
          .from(userBadges)
          .innerJoin(users, eq(userBadges.userId, users.id))
          .groupBy(userBadges.userId, users.username, users.profileImageUrl)
          .orderBy(desc(count(userBadges.badgeId)))
          .limit(limit);
        break;

      default:
        throw new Error('Invalid leaderboard type');
    }

    const results = await query;

    // Add badge counts for points/level leaderboards
    if (type !== 'badges') {
      const userIds = results.map(r => r.userId);
      if (userIds.length === 0) {
        return [];
      }
      const badgeCounts = await db
        .select({
          userId: userBadges.userId,
          count: count(userBadges.badgeId)
        })
        .from(userBadges)
        .where(inArray(userBadges.userId, userIds))
        .groupBy(userBadges.userId);

      const badgeMap = new Map(badgeCounts.map(b => [b.userId, b.count]));

      return results.map((entry, index) => ({
        userId: entry.userId,
        username: entry.username,
        profileImageUrl: entry.profileImageUrl,
        points: entry.totalPoints || 0,
        level: entry.level || 1,
        badges: badgeMap.get(entry.userId) || 0,
        rank: index + 1
      }));
    }

    // For badges leaderboard, get level info
    const userIds = results.map(r => r.userId);
    if (userIds.length === 0) {
      return [];
    }
    const levelInfo = await db
      .select({
        userId: userLevels.userId,
        totalPoints: userLevels.totalPoints,
        level: userLevels.level
      })
      .from(userLevels)
      .where(
        and(
          inArray(userLevels.userId, userIds),
          sport ? eq(userLevels.sport, sport) : sql`${userLevels.sport} IS NULL`,
        ),
      );

    const levelMap = new Map(levelInfo.map(l => [l.userId, l]));

    return results.map((entry, index) => {
      const level = levelMap.get(entry.userId);
      return {
        userId: entry.userId,
        username: entry.username,
        profileImageUrl: entry.profileImageUrl,
        points: level?.totalPoints || 0,
        level: level?.level || 1,
        badges: entry.badgeCount,
        rank: index + 1
      };
    });
  }

  // Check for level-based badges
  private static async checkLevelBadges(userId: string, level: number, sport?: string): Promise<void> {
    // Award milestone level badges
    const milestones = [5, 10, 15, 20, 25, 30];
    
    if (milestones.includes(level)) {
      // Check if milestone badge exists and award it
      const badgeName = `Level ${level} Master${sport ? ` - ${sport}` : ''}`;
      
      // This would need to be implemented based on your badge system
      console.log(`User ${userId} reached level ${level} - awarding milestone badge: ${badgeName}`);
    }
  }

  // Quick access to points configuration
  static get POINTS() {
    return POINTS_CONFIG;
  }
}
