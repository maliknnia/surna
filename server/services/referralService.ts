// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Referral Service - Handle user referrals and rewards
import { db } from "../db";
import { userReferrals, users, pointTransactions } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export interface ReferralReward {
  inviterReward: number;
  inviteeReward: number;
  type: 'points' | 'discount' | 'premium_days';
}

export class ReferralService {
  private static readonly DEFAULT_REWARDS: ReferralReward = {
    inviterReward: 100,
    inviteeReward: 50,
    type: 'points'
  };

  // Generate unique referral code for user
  static generateReferralCode(userId: string): string {
    const hash = crypto.createHash('md5').update(userId + Date.now()).digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  // Generate referral link with UTM parameters
  static generateReferralLink(userId: string, code: string): string {
    const baseUrl = process.env.BASE_URL || 'https://surna.app';
    return `${baseUrl}/join?ref=${encodeURIComponent(userId)}`;
  }

  // Create referral invitation
  static async createReferral(inviterId: string, inviteeEmail: string): Promise<any> {
    try {
      const referralCode = this.generateReferralCode(inviterId);
      
      const [referral] = await db.insert(userReferrals).values({
        inviterId,
        inviteeEmail,
        referralCode,
        status: 'pending',
        createdAt: new Date()
      }).returning();

      return {
        ...referral,
        referralLink: this.generateReferralLink(inviterId, referralCode)
      };
    } catch (error) {
      console.error('Failed to create referral:', error);
      throw new Error('Failed to create referral');
    }
  }

  // Process referral when invitee signs up
  static async processReferralSignup(referralCode: string, inviteeId: string): Promise<boolean> {
    try {
      // Support both legacy referral code and new userId-based referrals (join?ref=userId)
      const [referralByCode] = await db
        .select()
        .from(userReferrals)
        .where(and(
          eq(userReferrals.referralCode, referralCode),
          eq(userReferrals.status, 'pending')
        ));

      const referral = referralByCode ?? null;
      const inviterId = referral?.inviterId || referralCode;

      // Update referral status
      if (referral) {
        await db
          .update(userReferrals)
          .set({
            inviteeId,
            status: 'completed',
            completedAt: new Date()
          })
          .where(eq(userReferrals.id, referral.id));
      }

      // Award rewards
      await this.awardReferralRewards(inviterId, inviteeId);

      return true;
    } catch (error) {
      console.error('Failed to process referral signup:', error);
      return false;
    }
  }

  // Award rewards to both inviter and invitee
  private static async awardReferralRewards(inviterId: string, inviteeId: string): Promise<void> {
    const rewards = this.DEFAULT_REWARDS;

    try {
      const { awardCompetitivePoints } = await import("./competitiveEngine");
      await awardCompetitivePoints(inviterId, "referral_signup", {
        relatedEntityId: inviteeId,
        relatedEntityType: "referral",
        description: "Referral bonus — friend signed up",
      });

      // Welcome bonus for invitee (legacy amount)
      await db.insert(pointTransactions).values({
        userId: inviteeId,
        points: rewards.inviteeReward,
        action: 'signup_bonus',
        description: 'Welcome bonus for joining via referral'
      });

      console.log(`[Phase4-1] Referral rewards: ${rewards.inviterReward}+300 to ${inviterId}, ${rewards.inviteeReward} to ${inviteeId}`);
    } catch (error) {
      console.error('Failed to award referral rewards:', error);
    }
  }

  // Get user's referral statistics
  static async getUserReferralStats(userId: string): Promise<any> {
    try {
      const [stats] = await db
        .select({
          totalReferrals: sql<number>`count(*)`,
          completedReferrals: sql<number>`count(case when status = 'completed' then 1 end)`,
          pendingReferrals: sql<number>`count(case when status = 'pending' then 1 end)`,
          totalRewards: sql<number>`sum(case when status = 'completed' then ${this.DEFAULT_REWARDS.inviterReward} else 0 end)`
        })
        .from(userReferrals)
        .where(eq(userReferrals.inviterId, userId));

      return stats || {
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalRewards: 0
      };
    } catch (error) {
      console.error('Failed to get referral stats:', error);
      return {
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalRewards: 0
      };
    }
  }

  // Get user's referral history
  static async getUserReferrals(userId: string): Promise<any[]> {
    try {
      const referrals = await db
        .select({
          id: userReferrals.id,
          inviteeEmail: userReferrals.inviteeEmail,
          referralCode: userReferrals.referralCode,
          status: userReferrals.status,
          createdAt: userReferrals.createdAt,
          completedAt: userReferrals.completedAt,
          inviteeName: users.firstName,
          inviteeLastName: users.lastName
        })
        .from(userReferrals)
        .leftJoin(users, eq(userReferrals.inviteeId, users.id))
        .where(eq(userReferrals.inviterId, userId))
        .orderBy(userReferrals.createdAt);

      return referrals.map(referral => ({
        ...referral,
        referralLink: this.generateReferralLink(userId, referral.referralCode)
      }));
    } catch (error) {
      console.error('Failed to get user referrals:', error);
      return [];
    }
  }

  // Get top referrers leaderboard
  static async getTopReferrers(limit: number = 10): Promise<any[]> {
    try {
      const topReferrers = await db
        .select({
          userId: userReferrals.inviterId,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          completedReferrals: sql<number>`count(case when ${userReferrals.status} = 'completed' then 1 end)`,
          totalRewards: sql<number>`count(case when ${userReferrals.status} = 'completed' then 1 end) * ${this.DEFAULT_REWARDS.inviterReward}`
        })
        .from(userReferrals)
        .leftJoin(users, eq(userReferrals.inviterId, users.id))
        .groupBy(userReferrals.inviterId, users.firstName, users.lastName, users.profileImageUrl)
        .having(sql`count(case when ${userReferrals.status} = 'completed' then 1 end) > 0`)
        .orderBy(sql`count(case when ${userReferrals.status} = 'completed' then 1 end) desc`)
        .limit(limit);

      return topReferrers;
    } catch (error) {
      console.error('Failed to get top referrers:', error);
      return [];
    }
  }
}