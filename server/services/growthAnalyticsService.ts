// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Growth Analytics Service - Track marketing performance and user acquisition
import { db } from "../db";
import { users, userReferrals, socialShares, marketingCampaigns } from "@shared/schema";
import { eq, and, gte, lte, sql, count, desc } from "drizzle-orm";

export interface GrowthMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeReferrers: number;
  totalReferrals: number;
  conversionRate: number;
  topAcquisitionChannels: ChannelMetrics[];
  socialShareMetrics: ShareMetrics[];
}

export interface ChannelMetrics {
  source: string;
  users: number;
  percentage: number;
}

export interface ShareMetrics {
  platform: string;
  shares: number;
  contentType: string;
}

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  type: string;
  reach: number;
  conversions: number;
  conversionRate: number;
  cost?: number;
  roi?: number;
}

export class GrowthAnalyticsService {
  // Get comprehensive growth metrics
  static async getGrowthMetrics(startDate?: Date, endDate?: Date): Promise<GrowthMetrics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Total users
      const [totalUsersResult] = await db
        .select({ count: count() })
        .from(users);

      // New users today
      const [newUsersTodayResult] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, today));

      // New users this week
      const [newUsersWeekResult] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, weekAgo));

      // New users this month
      const [newUsersMonthResult] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, monthAgo));

      // Active referrers (users with at least one completed referral)
      const [activeReferrersResult] = await db
        .select({ count: sql<number>`count(distinct ${userReferrals.inviterId})` })
        .from(userReferrals)
        .where(eq(userReferrals.status, 'completed'));

      // Total referrals
      const [totalReferralsResult] = await db
        .select({ count: count() })
        .from(userReferrals)
        .where(eq(userReferrals.status, 'completed'));

      // Calculate conversion rate (completed referrals / total referrals)
      const [totalReferralAttemptsResult] = await db
        .select({ count: count() })
        .from(userReferrals);

      const conversionRate = totalReferralAttemptsResult.count > 0 
        ? (totalReferralsResult.count / totalReferralAttemptsResult.count) * 100
        : 0;

      // Get top acquisition channels (simplified for now)
      const topAcquisitionChannels: ChannelMetrics[] = [
        { source: 'referral', users: totalReferralsResult.count, percentage: 0 },
        { source: 'direct', users: Math.max(0, totalUsersResult.count - totalReferralsResult.count), percentage: 0 }
      ];

      // Calculate percentages
      const totalChannelUsers = topAcquisitionChannels.reduce((sum, channel) => sum + channel.users, 0);
      topAcquisitionChannels.forEach(channel => {
        channel.percentage = totalChannelUsers > 0 ? (channel.users / totalChannelUsers) * 100 : 0;
      });

      // Get social share metrics
      const socialShareMetrics = await this.getSocialShareMetrics();

      return {
        totalUsers: totalUsersResult.count,
        newUsersToday: newUsersTodayResult.count,
        newUsersThisWeek: newUsersWeekResult.count,
        newUsersThisMonth: newUsersMonthResult.count,
        activeReferrers: activeReferrersResult.count,
        totalReferrals: totalReferralsResult.count,
        conversionRate: Math.round(conversionRate * 100) / 100,
        topAcquisitionChannels,
        socialShareMetrics
      };
    } catch (error) {
      console.error('Failed to get growth metrics:', error);
      return {
        totalUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        activeReferrers: 0,
        totalReferrals: 0,
        conversionRate: 0,
        topAcquisitionChannels: [],
        socialShareMetrics: []
      };
    }
  }

  // Get social share metrics
  static async getSocialShareMetrics(): Promise<ShareMetrics[]> {
    try {
      const shareMetrics = await db
        .select({
          platform: socialShares.platform,
          contentType: socialShares.contentType,
          shares: count()
        })
        .from(socialShares)
        .groupBy(socialShares.platform, socialShares.contentType)
        .orderBy(desc(count()));

      return shareMetrics.map(metric => ({
        platform: metric.platform,
        contentType: metric.contentType,
        shares: metric.shares
      }));
    } catch (error) {
      console.error('Failed to get social share metrics:', error);
      return [];
    }
  }

  // Track user acquisition source
  static async trackUserAcquisition(userId: string, source: string, medium?: string, campaign?: string): Promise<void> {
    try {
      // This could be stored in a separate acquisition tracking table
      // For now, we'll log it for analytics
      console.log(`User acquisition tracked: ${userId} from ${source}/${medium}/${campaign}`);
      
      // In a real implementation, you might:
      // 1. Store in a separate tracking table
      // 2. Send to external analytics service
      // 3. Update user profile with acquisition data
    } catch (error) {
      console.error('Failed to track user acquisition:', error);
    }
  }

  // Get campaign performance metrics
  static async getCampaignPerformance(campaignId: string): Promise<CampaignPerformance | null> {
    try {
      const [campaign] = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, campaignId));

      if (!campaign) {
        return null;
      }

      // Count conversions based on campaign type
      let conversions = 0;
      if (campaign.type === 'referral') {
        const [referralConversions] = await db
          .select({ count: count() })
          .from(userReferrals)
          .where(and(
            eq(userReferrals.campaignId, campaignId),
            eq(userReferrals.status, 'completed')
          ));
        conversions = referralConversions.count;
      }

      // Calculate metrics (simplified)
      const reach = campaign.metrics?.reach || 0;
      const conversionRate = reach > 0 ? (conversions / reach) * 100 : 0;

      return {
        campaignId: campaign.id,
        name: campaign.name,
        type: campaign.type,
        reach,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        cost: campaign.metrics?.cost,
        roi: campaign.metrics?.roi
      };
    } catch (error) {
      console.error('Failed to get campaign performance:', error);
      return null;
    }
  }

  // Get user growth trends (daily signups over time)
  static async getUserGrowthTrends(days: number = 30): Promise<Array<{date: string, users: number}>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await db
        .select({
          date: sql<string>`date(${users.createdAt})`,
          users: count()
        })
        .from(users)
        .where(gte(users.createdAt, startDate))
        .groupBy(sql`date(${users.createdAt})`)
        .orderBy(sql`date(${users.createdAt})`);

      return trends;
    } catch (error) {
      console.error('Failed to get user growth trends:', error);
      return [];
    }
  }

  // Get referral performance by user
  static async getTopReferrers(limit: number = 10): Promise<Array<{
    userId: string;
    userName: string;
    referrals: number;
    conversions: number;
    conversionRate: number;
  }>> {
    try {
      const topReferrers = await db
        .select({
          userId: userReferrals.inviterId,
          firstName: users.firstName,
          lastName: users.lastName,
          totalReferrals: count(),
          conversions: sql<number>`count(case when ${userReferrals.status} = 'completed' then 1 end)`
        })
        .from(userReferrals)
        .leftJoin(users, eq(userReferrals.inviterId, users.id))
        .groupBy(userReferrals.inviterId, users.firstName, users.lastName)
        .orderBy(desc(sql`count(case when ${userReferrals.status} = 'completed' then 1 end)`))
        .limit(limit);

      return topReferrers.map(referrer => ({
        userId: referrer.userId,
        userName: `${referrer.firstName} ${referrer.lastName}`.trim(),
        referrals: referrer.totalReferrals,
        conversions: referrer.conversions,
        conversionRate: referrer.totalReferrals > 0 
          ? Math.round((referrer.conversions / referrer.totalReferrals) * 100 * 100) / 100
          : 0
      }));
    } catch (error) {
      console.error('Failed to get top referrers:', error);
      return [];
    }
  }

  // Track social share conversion
  static async trackSocialShareConversion(shareId: string, userId: string): Promise<void> {
    try {
      console.log(`Social share conversion tracked: ${shareId} -> ${userId}`);
      // In a real implementation, you would:
      // 1. Update the social share record with conversion data
      // 2. Track attribution back to the original sharer
      // 3. Update campaign metrics
    } catch (error) {
      console.error('Failed to track social share conversion:', error);
    }
  }
}