import { db } from '../db';
import { 
  rewards,
  userRewards,
  userLevels,
  users,
  pointTransactions
} from '@shared/schema';
import { eq, desc, asc, sql, and, or, lt, gte } from 'drizzle-orm';
import { GamificationService } from './gamificationService';
import { queueNotification } from '../notifications/pushService';

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: 'badge' | 'cosmetic' | 'premium' | 'physical' | 'experience' | 'discount';
  availability: 'unlimited' | 'limited' | 'seasonal' | 'exclusive';
  maxRedemptions?: number;
  currentRedemptions: number;
  imageUrl?: string;
  isActive: boolean;
  requiredLevel?: number;
  validUntil?: Date;
  metadata?: {
    discountPercent?: number;
    premiumDays?: number;
    physicalItem?: {
      weight: number;
      dimensions: string;
      shippingRequired: boolean;
    };
    experienceDetails?: {
      duration: string;
      location?: string;
      capacity?: number;
    };
  };
}

export interface RedemptionRequest {
  userId: string;
  rewardId: string;
  deliveryInfo?: {
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    email?: string;
    phone?: string;
    preferences?: Record<string, any>;
  };
}

export interface UserRedemption {
  id: string;
  userId: string;
  rewardId: string;
  redeemedAt: Date;
  status: 'pending' | 'fulfilled' | 'shipped' | 'completed' | 'cancelled';
  deliveryInfo?: any;
  fulfillmentNotes?: string;
  trackingNumber?: string;
}

export class RewardsService {

  private static deliveryMeta(raw: unknown): Record<string, unknown> {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return { ...(raw as Record<string, unknown>) };
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return { ...(parsed as Record<string, unknown>) };
        }
      } catch {
        /* ignore */
      }
    }
    return {};
  }

  private static async updateRedemptionMeta(
    redemptionId: string,
    patch: { status?: string; fulfillmentNotes?: string; trackingNumber?: string },
  ): Promise<void> {
    const [row] = await db
      .select({ deliveryInfo: userRewards.deliveryInfo })
      .from(userRewards)
      .where(eq(userRewards.id, redemptionId))
      .limit(1);
    const meta = RewardsService.deliveryMeta(row?.deliveryInfo);
    if (patch.fulfillmentNotes !== undefined) {
      meta.fulfillmentNotes = patch.fulfillmentNotes;
    }
    if (patch.trackingNumber !== undefined) {
      meta.trackingNumber = patch.trackingNumber;
    }
    await db
      .update(userRewards)
      .set({
        ...(patch.status ? { status: patch.status } : {}),
        deliveryInfo: meta,
      })
      .where(eq(userRewards.id, redemptionId));
  }

  // Predefined reward catalog
  static readonly REWARD_CATALOG: Omit<RewardItem, 'id' | 'currentRedemptions'>[] = [
    {
      title: "Early Adopter Badge",
      description: "Awarded for joining SURNA in the early launch phase.",
      pointsCost: 100,
      category: "badge",
      availability: "exclusive",
      imageUrl: "/rewards/early-adopter.png",
      isActive: true,
      requiredLevel: 1,
    },
    {
      title: "First Game Joined",
      description: "Unlocked after joining your first game or event.",
      pointsCost: 80,
      category: "badge",
      availability: "unlimited",
      imageUrl: "/rewards/first-game.png",
      isActive: true,
      requiredLevel: 1,
    },
    {
      title: "Cork Pioneer",
      description: "Recognizes users building the Cork sports community.",
      pointsCost: 150,
      category: "badge",
      availability: "limited",
      maxRedemptions: 5000,
      imageUrl: "/rewards/cork-pioneer.png",
      isActive: true,
      requiredLevel: 2,
    },
    {
      title: "Challenge Winner",
      description: "Awarded when you win a competitive challenge.",
      pointsCost: 200,
      category: "badge",
      availability: "unlimited",
      imageUrl: "/rewards/challenge-winner.png",
      isActive: true,
      requiredLevel: 3,
    },
    {
      title: "Team Captain",
      description: "For users leading teams and organizing teammates.",
      pointsCost: 250,
      category: "badge",
      availability: "unlimited",
      imageUrl: "/rewards/team-captain.png",
      isActive: true,
      requiredLevel: 4,
    },
    {
      title: "Century Club 100 Games",
      description: "Milestone reward for participating in 100 games.",
      pointsCost: 500,
      category: "badge",
      availability: "unlimited",
      imageUrl: "/rewards/century-club.png",
      isActive: true,
      requiredLevel: 8,
    },
    {
      title: "Top Scorer",
      description: "Recognizes elite scoring performance in matches.",
      pointsCost: 400,
      category: "badge",
      availability: "seasonal",
      imageUrl: "/rewards/top-scorer.png",
      isActive: true,
      requiredLevel: 6,
    },
    {
      title: "Community Builder",
      description: "Given to members who consistently help and support others.",
      pointsCost: 300,
      category: "badge",
      availability: "unlimited",
      imageUrl: "/rewards/community-builder.png",
      isActive: true,
      requiredLevel: 5,
    },
  ];

  // Initialize reward catalog in database
  static async initializeRewardCatalog(): Promise<void> {
    try {
      for (const reward of this.REWARD_CATALOG) {
        // Check if reward already exists
        const existing = await db
          .select()
          .from(rewards)
          .where(eq(rewards.title, reward.title))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(rewards).values({
            title: reward.title,
            description: reward.description,
            pointsCost: reward.pointsCost,
            category: reward.category,
            availability: reward.availability,
            maxRedemptions: reward.maxRedemptions,
            currentRedemptions: 0,
            imageUrl: reward.imageUrl,
            isActive: reward.isActive,
            requiredLevel: reward.requiredLevel,
            validUntil: reward.validUntil
          });
        }
      }
      console.log('âœ… Reward catalog initialized');
    } catch (error) {
      console.error('âŒ Failed to initialize reward catalog:', error);
    }
  }

  // Get available rewards for a user
  static async getAvailableRewards(userId: string): Promise<{
    rewards: Array<RewardItem & { canAfford: boolean; meetsRequirements: boolean }>;
    userPoints: number;
    userLevel: number;
  }> {
    try {
      // Get user's current points and level
      const userLevel = await GamificationService.getUserLevel(userId);

      // Get all active rewards
      const allRewards = await db
        .select()
        .from(rewards)
        .where(eq(rewards.isActive, true))
        .orderBy(asc(rewards.pointsCost));

      // Check availability and user eligibility for each reward
      const rewardsWithEligibility = allRewards.map(reward => {
        const canAfford = userLevel.totalPoints >= reward.pointsCost;
        const meetsLevelRequirement = !reward.requiredLevel || userLevel.level >= reward.requiredLevel;
        const notExpired = !reward.validUntil || new Date() <= reward.validUntil;
        const redeemed = reward.currentRedemptions ?? 0;
        const hasStock = reward.availability === 'unlimited' || 
                         !reward.maxRedemptions || 
                         redeemed < reward.maxRedemptions;

        return {
          id: reward.id,
          title: reward.title,
          description: reward.description ?? '',
          pointsCost: reward.pointsCost,
          category: reward.category as RewardItem['category'],
          availability: reward.availability as RewardItem['availability'],
          maxRedemptions: reward.maxRedemptions ?? undefined,
          currentRedemptions: redeemed,
          imageUrl: reward.imageUrl ?? undefined,
          isActive: reward.isActive ?? true,
          requiredLevel: reward.requiredLevel ?? undefined,
          validUntil: reward.validUntil ?? undefined,
          canAfford,
          meetsRequirements: meetsLevelRequirement && notExpired && hasStock
        };
      });

      return {
        rewards: rewardsWithEligibility,
        userPoints: userLevel.totalPoints,
        userLevel: userLevel.level
      };
    } catch (error) {
      console.error('Error fetching available rewards:', error);
      return {
        rewards: [],
        userPoints: 0,
        userLevel: 1
      };
    }
  }

  // Redeem a reward
  static async redeemReward(
    userId: string, 
    rewardId: string, 
    deliveryInfo?: RedemptionRequest['deliveryInfo']
  ): Promise<{
    success: boolean;
    redemptionId?: string;
    error?: string;
    remainingPoints?: number;
  }> {
    try {
      // Get reward details
      const [reward] = await db
        .select()
        .from(rewards)
        .where(eq(rewards.id, rewardId))
        .limit(1);

      if (!reward) {
        return { success: false, error: 'Reward not found' };
      }

      if (!reward.isActive) {
        return { success: false, error: 'Reward is no longer active' };
      }

      // Check if reward is still available
      if (reward.availability === 'limited' && 
          reward.maxRedemptions && 
          (reward.currentRedemptions ?? 0) >= reward.maxRedemptions) {
        return { success: false, error: 'Reward is out of stock' };
      }

      // Check expiration
      if (reward.validUntil && new Date() > reward.validUntil) {
        return { success: false, error: 'Reward has expired' };
      }

      // Get user's current points and level
      const userLevel = await GamificationService.getUserLevel(userId);

      // Check if user can afford the reward
      if (userLevel.totalPoints < reward.pointsCost) {
        return { 
          success: false, 
          error: `Insufficient points. Need ${reward.pointsCost}, have ${userLevel.totalPoints}` 
        };
      }

      // Check level requirement
      if (reward.requiredLevel && userLevel.level < reward.requiredLevel) {
        return { 
          success: false, 
          error: `Level ${reward.requiredLevel} required. Current level: ${userLevel.level}` 
        };
      }

      // Create redemption record
      const [redemption] = await db
        .insert(userRewards)
        .values({
          userId,
          rewardId: reward.id,
          status: 'pending',
          deliveryInfo: deliveryInfo ?? null,
        })
        .returning({ id: userRewards.id });

      // Deduct points
      await GamificationService.awardPoints(userId, {
        action: 'REWARD_REDEEMED',
        points: -reward.pointsCost, // Negative points to deduct
        description: `Redeemed reward: ${reward.title}`,
        relatedEntityType: 'reward',
        relatedEntityId: reward.id
      }, true); // Skip duplicate check

      // Update reward redemption count
      await db
        .update(rewards)
        .set({ 
          currentRedemptions: (reward.currentRedemptions ?? 0) + 1,
        })
        .where(eq(rewards.id, reward.id));

      // Send confirmation notification
      await queueNotification({
        userId,
        title: 'Reward Redeemed!',
        body: `You've successfully redeemed "${reward.title}" for ${reward.pointsCost} points!`,
        type: 'gamification',
        data: { 
          rewardId: reward.id,
          redemptionId: redemption.id,
          title: reward.title,
          category: reward.category,
          pointsSpent: reward.pointsCost
        }
      });

      // Handle different reward types
      await this.processRewardFulfillment(redemption.id, reward, deliveryInfo);

      return {
        success: true,
        redemptionId: redemption.id,
        remainingPoints: userLevel.totalPoints - reward.pointsCost
      };

    } catch (error) {
      console.error('Error redeeming reward:', error);
      return { 
        success: false, 
        error: 'Failed to redeem reward. Please try again.' 
      };
    }
  }

  // Process reward fulfillment based on type
  private static async processRewardFulfillment(
    redemptionId: string,
    reward: any,
    deliveryInfo?: any
  ): Promise<void> {
    try {
      switch (reward.category) {
        case 'premium': {
          console.log(`Activating premium features for redemption ${redemptionId}`);
          await RewardsService.updateRedemptionMeta(redemptionId, {
            status: 'fulfilled',
            fulfillmentNotes: 'Premium features activated',
          });
          break;
        }

        case 'discount': {
          const discountCode = `SURNA${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
          await RewardsService.updateRedemptionMeta(redemptionId, {
            status: 'fulfilled',
            fulfillmentNotes: `Discount code: ${discountCode}`,
          });
          break;
        }

        case 'physical': {
          await RewardsService.updateRedemptionMeta(redemptionId, {
            status: 'pending',
            fulfillmentNotes: 'Preparing for shipment',
          });
          console.log(`Physical item fulfillment initiated for redemption ${redemptionId}`);
          break;
        }

        case 'experience': {
          await RewardsService.updateRedemptionMeta(redemptionId, {
            status: 'pending',
            fulfillmentNotes: 'Experience booking in progress',
          });
          console.log(`Experience booking initiated for redemption ${redemptionId}`);
          break;
        }

        case 'cosmetic': {
          await RewardsService.updateRedemptionMeta(redemptionId, {
            status: 'fulfilled',
            fulfillmentNotes: 'Cosmetic item activated',
          });
          break;
        }

        default: {
          await db
            .update(userRewards)
            .set({ status: 'fulfilled' })
            .where(eq(userRewards.id, redemptionId));
        }
      }
    } catch (error) {
      console.error('Error processing reward fulfillment:', error);
    }
  }

  // Get user's redemption history
  static async getUserRedemptions(userId: string): Promise<Array<{
    id: string;
    reward: {
      title: string;
      description: string;
      category: string;
      imageUrl?: string;
    };
    redeemedAt: Date;
    status: string;
    pointsSpent: number;
    fulfillmentNotes?: string;
    trackingNumber?: string;
  }>> {
    try {
      const redemptions = await db
        .select({
          id: userRewards.id,
          rewardTitle: rewards.title,
          rewardDescription: rewards.description,
          rewardCategory: rewards.category,
          rewardImageUrl: rewards.imageUrl,
          pointsCost: rewards.pointsCost,
          redeemedAt: userRewards.redeemedAt,
          status: userRewards.status,
          deliveryInfo: userRewards.deliveryInfo,
        })
        .from(userRewards)
        .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
        .where(eq(userRewards.userId, userId))
        .orderBy(desc(userRewards.redeemedAt));

      return redemptions.map(r => {
        const meta = RewardsService.deliveryMeta(r.deliveryInfo);
        const notes = meta.fulfillmentNotes;
        const tracking = meta.trackingNumber;
        return {
          id: r.id,
          reward: {
            title: r.rewardTitle,
            description: r.rewardDescription ?? '',
            category: r.rewardCategory,
            imageUrl: r.rewardImageUrl ?? undefined,
          },
          redeemedAt: r.redeemedAt ?? new Date(0),
          status: r.status ?? 'pending',
          pointsSpent: r.pointsCost,
          fulfillmentNotes: typeof notes === 'string' ? notes : undefined,
          trackingNumber: typeof tracking === 'string' ? tracking : undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching user redemptions:', error);
      return [];
    }
  }

  // Get reward statistics for admin
  static async getRewardStatistics(): Promise<{
    totalRedemptions: number;
    totalPointsSpent: number;
    topRewards: Array<{
      title: string;
      redemptions: number;
      pointsSpent: number;
    }>;
    recentRedemptions: Array<{
      userName: string;
      rewardTitle: string;
      pointsSpent: number;
      redeemedAt: Date;
    }>;
  }> {
    try {
      // Get total redemptions and points spent
      const [totals] = await db
        .select({
          totalRedemptions: sql<number>`count(${userRewards.id})`,
          totalPointsSpent: sql<number>`sum(${rewards.pointsCost})`
        })
        .from(userRewards)
        .innerJoin(rewards, eq(userRewards.rewardId, rewards.id));

      // Get top rewards by redemption count
      const topRewards = await db
        .select({
          title: rewards.title,
          redemptions: sql<number>`count(${userRewards.id})`,
          pointsSpent: sql<number>`sum(${rewards.pointsCost})`
        })
        .from(userRewards)
        .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
        .groupBy(rewards.id, rewards.title)
        .orderBy(desc(sql`count(${userRewards.id})`))
        .limit(10);

      // Get recent redemptions
      const recentRedemptions = await db
        .select({
          userName: users.username,
          rewardTitle: rewards.title,
          pointsSpent: rewards.pointsCost,
          redeemedAt: userRewards.redeemedAt
        })
        .from(userRewards)
        .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
        .innerJoin(users, eq(userRewards.userId, users.id))
        .orderBy(desc(userRewards.redeemedAt))
        .limit(20);

      return {
        totalRedemptions: totals.totalRedemptions || 0,
        totalPointsSpent: totals.totalPointsSpent || 0,
        topRewards: topRewards.map(r => ({
          title: r.title,
          redemptions: r.redemptions,
          pointsSpent: r.pointsSpent
        })),
        recentRedemptions: recentRedemptions.map(r => ({
          userName: r.userName || 'Unknown',
          rewardTitle: r.rewardTitle,
          pointsSpent: r.pointsSpent,
          redeemedAt: r.redeemedAt ?? new Date(0),
        }))
      };
    } catch (error) {
      console.error('Error fetching reward statistics:', error);
      return {
        totalRedemptions: 0,
        totalPointsSpent: 0,
        topRewards: [],
        recentRedemptions: []
      };
    }
  }

  // Check for expiring rewards and send reminders
  static async checkExpiringRewards(): Promise<void> {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringRewards = await db
        .select()
        .from(rewards)
        .where(
          and(
            eq(rewards.isActive, true),
            gte(rewards.validUntil, new Date()),
            lt(rewards.validUntil, sevenDaysFromNow)
          )
        );

      // Notify users about expiring rewards
      for (const reward of expiringRewards) {
        // In a real implementation, you'd get users who might be interested
        // and send them notifications about expiring rewards
        console.log(`Reward "${reward.title}" expires soon: ${reward.validUntil}`);
      }
    } catch (error) {
      console.error('Error checking expiring rewards:', error);
    }
  }
}
