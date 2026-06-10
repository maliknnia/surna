// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Promotion Service - Handle in-app promotions and announcements
import { db } from "../db";
import { promotions, promotionViews, users } from "@shared/schema";
import { eq, and, gte, lte, lt, desc, count, isNull, or } from "drizzle-orm";

export interface Promotion {
  id: string;
  title: string;
  description: string;
  type: 'banner' | 'popup' | 'toast' | 'feature_highlight';
  targetUsers: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  priority: number;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  dismissible: boolean;
  maxViews?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionView {
  id: string;
  promotionId: string;
  userId: string;
  viewedAt: Date;
  clicked: boolean;
  dismissed: boolean;
}

export class PromotionService {
  // Get active promotions for a user
  static async getActivePromotions(userId: string, userSegment?: string): Promise<Promotion[]> {
    try {
      const now = new Date();

      const activePromotions = await db
        .select()
        .from(promotions)
        .where(and(
          eq(promotions.isActive, true),
          or(
            isNull(promotions.startDate),
            lte(promotions.startDate, now)
          ),
          or(
            isNull(promotions.endDate),
            gte(promotions.endDate, now)
          )
        ))
        .orderBy(desc(promotions.priority), desc(promotions.createdAt));

      // Filter promotions based on user segment and view limits
      const filteredPromotions = [];
      
      for (const promotion of activePromotions) {
        // Check if promotion targets this user segment
        if (promotion.targetUsers !== 'all' && promotion.targetUsers !== userSegment) {
          continue;
        }

        // Check view limits
        if (promotion.maxViews) {
          const [viewCount] = await db
            .select({ count: count() })
            .from(promotionViews)
            .where(and(
              eq(promotionViews.promotionId, promotion.id),
              eq(promotionViews.userId, userId)
            ));

          if (viewCount.count >= promotion.maxViews) {
            continue;
          }
        }

        // Check if user has dismissed this promotion
        const [dismissedView] = await db
          .select()
          .from(promotionViews)
          .where(and(
            eq(promotionViews.promotionId, promotion.id),
            eq(promotionViews.userId, userId),
            eq(promotionViews.dismissed, true)
          ));

        if (dismissedView) {
          continue;
        }

        filteredPromotions.push(promotion);
      }

      return filteredPromotions;
    } catch (error) {
      console.error('Failed to get active promotions:', error);
      return [];
    }
  }

  // Track promotion view
  static async trackPromotionView(promotionId: string, userId: string): Promise<void> {
    try {
      await db.insert(promotionViews).values({
        promotionId,
        userId,
        viewedAt: new Date(),
        clicked: false,
        dismissed: false
      });

      console.log(`Promotion view tracked: ${promotionId} by ${userId}`);
    } catch (error) {
      console.error('Failed to track promotion view:', error);
    }
  }

  // Track promotion click
  static async trackPromotionClick(promotionId: string, userId: string): Promise<void> {
    try {
      // Find the most recent view and update it
      const [latestView] = await db
        .select()
        .from(promotionViews)
        .where(and(
          eq(promotionViews.promotionId, promotionId),
          eq(promotionViews.userId, userId)
        ))
        .orderBy(desc(promotionViews.viewedAt))
        .limit(1);

      if (latestView) {
        await db
          .update(promotionViews)
          .set({ clicked: true })
          .where(eq(promotionViews.id, latestView.id));
      }

      console.log(`Promotion click tracked: ${promotionId} by ${userId}`);
    } catch (error) {
      console.error('Failed to track promotion click:', error);
    }
  }

  // Track promotion dismissal
  static async trackPromotionDismissal(promotionId: string, userId: string): Promise<void> {
    try {
      // Find the most recent view and update it
      const [latestView] = await db
        .select()
        .from(promotionViews)
        .where(and(
          eq(promotionViews.promotionId, promotionId),
          eq(promotionViews.userId, userId)
        ))
        .orderBy(desc(promotionViews.viewedAt))
        .limit(1);

      if (latestView) {
        await db
          .update(promotionViews)
          .set({ dismissed: true })
          .where(eq(promotionViews.id, latestView.id));
      }

      console.log(`Promotion dismissal tracked: ${promotionId} by ${userId}`);
    } catch (error) {
      console.error('Failed to track promotion dismissal:', error);
    }
  }

  // Create new promotion
  static async createPromotion(promotionData: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Promotion | null> {
    try {
      const [newPromotion] = await db
        .insert(promotions)
        .values({
          ...promotionData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return newPromotion;
    } catch (error) {
      console.error('Failed to create promotion:', error);
      return null;
    }
  }

  // Update promotion
  static async updatePromotion(id: string, updates: Partial<Promotion>): Promise<boolean> {
    try {
      await db
        .update(promotions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(promotions.id, id));

      return true;
    } catch (error) {
      console.error('Failed to update promotion:', error);
      return false;
    }
  }

  // Get promotion analytics
  static async getPromotionAnalytics(promotionId: string): Promise<{
    views: number;
    clicks: number;
    dismissals: number;
    clickThroughRate: number;
    dismissalRate: number;
  }> {
    try {
      const [analytics] = await db
        .select({
          views: count(),
          clicks: count(promotionViews.clicked),
          dismissals: count(promotionViews.dismissed)
        })
        .from(promotionViews)
        .where(eq(promotionViews.promotionId, promotionId));

      const clickThroughRate = analytics.views > 0 ? (analytics.clicks / analytics.views) * 100 : 0;
      const dismissalRate = analytics.views > 0 ? (analytics.dismissals / analytics.views) * 100 : 0;

      return {
        views: analytics.views,
        clicks: analytics.clicks,
        dismissals: analytics.dismissals,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        dismissalRate: Math.round(dismissalRate * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get promotion analytics:', error);
      return {
        views: 0,
        clicks: 0,
        dismissals: 0,
        clickThroughRate: 0,
        dismissalRate: 0
      };
    }
  }

  // Get all promotions (admin)
  static async getAllPromotions(): Promise<Promotion[]> {
    try {
      return await db
        .select()
        .from(promotions)
        .orderBy(desc(promotions.createdAt));
    } catch (error) {
      console.error('Failed to get all promotions:', error);
      return [];
    }
  }

  // Deactivate expired promotions
  static async deactivateExpiredPromotions(): Promise<void> {
    try {
      const now = new Date();
      
      await db
        .update(promotions)
        .set({ isActive: false })
        .where(and(
          eq(promotions.isActive, true),
          lt(promotions.endDate, now)
        ));

      console.log('Expired promotions deactivated');
    } catch (error) {
      console.error('Failed to deactivate expired promotions:', error);
    }
  }

  // Get user's promotion history
  static async getUserPromotionHistory(userId: string): Promise<PromotionView[]> {
    try {
      return await db
        .select()
        .from(promotionViews)
        .where(eq(promotionViews.userId, userId))
        .orderBy(desc(promotionViews.viewedAt));
    } catch (error) {
      console.error('Failed to get user promotion history:', error);
      return [];
    }
  }

  // Get promotion performance summary
  static async getPromotionPerformanceSummary(): Promise<Array<{
    id: string;
    title: string;
    type: string;
    views: number;
    clicks: number;
    ctr: number;
  }>> {
    try {
      const performanceData = await db
        .select({
          id: promotions.id,
          title: promotions.title,
          type: promotions.type,
          views: count(promotionViews.id),
          clicks: count(promotionViews.clicked)
        })
        .from(promotions)
        .leftJoin(promotionViews, eq(promotions.id, promotionViews.promotionId))
        .groupBy(promotions.id, promotions.title, promotions.type)
        .orderBy(desc(count(promotionViews.id)));

      return performanceData.map(promo => ({
        id: promo.id,
        title: promo.title,
        type: promo.type,
        views: promo.views,
        clicks: promo.clicks,
        ctr: promo.views > 0 ? Math.round((promo.clicks / promo.views) * 100 * 100) / 100 : 0
      }));
    } catch (error) {
      console.error('Failed to get promotion performance summary:', error);
      return [];
    }
  }
}