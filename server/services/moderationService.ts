// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Moderation Service - Handle content flagging and moderation
import { db } from "../db";
import { 
  flaggedContent, 
  userActions, 
  adminAlerts, 
  contentFilters, 
  moderationQueue,
  users,
  posts,
  postComments
} from "@shared/schema";
import { eq, and, sql, desc, count, or, lte, gte, ilike } from "drizzle-orm";

export interface FlagContentRequest {
  contentType: string;
  contentId: string;
  reportedUserId?: string;
  reason: string;
  description?: string;
}

export interface ModerationAction {
  flaggedContentId: string;
  actionTaken: string;
  reviewNotes?: string;
  userId?: string; // For user-specific actions
}

export class ModerationService {
  /**
   * Flag content for review
   */
  static async flagContent(reporterId: string, request: FlagContentRequest) {
    try {
      const [flagged] = await db
        .insert(flaggedContent)
        .values({
          contentType: request.contentType,
          contentId: request.contentId,
          reporterId,
          reportedUserId: request.reportedUserId,
          reason: request.reason,
          description: request.description,
          status: "pending",
          priority: this.calculatePriority(request.reason)
        })
        .returning();

      // Add to moderation queue
      await db.insert(moderationQueue).values({
        contentType: request.contentType,
        contentId: request.contentId,
        flaggedContentId: flagged.id,
        priority: this.getPriorityNumber(this.calculatePriority(request.reason))
      });

      // Check if this content has been flagged multiple times
      const [flagCount] = await db
        .select({ count: count() })
        .from(flaggedContent)
        .where(
          and(
            eq(flaggedContent.contentType, request.contentType),
            eq(flaggedContent.contentId, request.contentId),
            eq(flaggedContent.status, "pending")
          )
        );

      // Create alert if threshold exceeded
      if (flagCount.count >= 3) {
        await this.createAlert({
          alertType: "flagged_content_threshold",
          title: `Content flagged ${flagCount.count} times`,
          description: `${request.contentType} ${request.contentId} has been flagged multiple times`,
          severity: "high",
          relatedEntityType: request.contentType,
          relatedEntityId: request.contentId
        });
      }

      return flagged;
    } catch (error) {
      console.error('Failed to flag content:', error);
      throw error;
    }
  }

  /**
   * Get flagged content for review
   */
  static async getFlaggedContent(status?: string, priority?: string) {
    try {
      let query = db
        .select({
          id: flaggedContent.id,
          contentType: flaggedContent.contentType,
          contentId: flaggedContent.contentId,
          reason: flaggedContent.reason,
          description: flaggedContent.description,
          status: flaggedContent.status,
          priority: flaggedContent.priority,
          createdAt: flaggedContent.createdAt,
          reporterName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          reportedUserName: sql<string>`reported_user.first_name || ' ' || reported_user.last_name`
        })
        .from(flaggedContent)
        .leftJoin(users, eq(flaggedContent.reporterId, users.id))
        .leftJoin(
          sql`${users} as reported_user`, 
          sql`${flaggedContent.reportedUserId} = reported_user.id`
        );

      if (status) {
        query = query.where(eq(flaggedContent.status, status));
      }

      if (priority) {
        query = query.where(eq(flaggedContent.priority, priority));
      }

      return await query
        .orderBy(desc(flaggedContent.createdAt))
        .limit(50);
    } catch (error) {
      console.error('Failed to get flagged content:', error);
      return [];
    }
  }

  /**
   * Review flagged content and take action
   */
  static async reviewContent(reviewerId: string, action: ModerationAction) {
    try {
      // Update flagged content status
      await db
        .update(flaggedContent)
        .set({
          status: "reviewed",
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: action.reviewNotes,
          actionTaken: action.actionTaken
        })
        .where(eq(flaggedContent.id, action.flaggedContentId));

      // Remove from moderation queue
      await db
        .update(moderationQueue)
        .set({
          status: "completed",
          completedAt: new Date()
        })
        .where(eq(moderationQueue.flaggedContentId, action.flaggedContentId));

      // Take specific actions based on decision
      await this.executeAction(action, reviewerId);

      return { success: true };
    } catch (error) {
      console.error('Failed to review content:', error);
      throw error;
    }
  }

  /**
   * Execute moderation action
   */
  private static async executeAction(action: ModerationAction, performedBy: string) {
    switch (action.actionTaken) {
      case 'content_removed':
        // Remove the content (implement based on content type)
        break;
      
      case 'user_warned':
      case 'user_suspended':
      case 'user_banned':
        if (action.userId) {
          await this.performUserAction(action.userId, action.actionTaken, performedBy, action.reviewNotes);
        }
        break;
    }
  }

  /**
   * Perform action on user (warn, suspend, ban)
   */
  static async performUserAction(
    userId: string, 
    actionType: string, 
    performedBy: string, 
    reason: string,
    expiresAt?: Date
  ) {
    try {
      // Record the action
      await db.insert(userActions).values({
        userId,
        actionType,
        reason,
        performedBy,
        expiresAt,
        isActive: true
      });

      // Update user status if needed
      if (actionType === 'user_banned') {
        // Implement user banning logic
      } else if (actionType === 'user_suspended') {
        // Implement user suspension logic
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to perform user action:', error);
      throw error;
    }
  }

  /**
   * Get moderation queue
   */
  static async getModerationQueue(assignedTo?: string) {
    try {
      let query = db
        .select()
        .from(moderationQueue)
        .where(eq(moderationQueue.status, "pending"));

      if (assignedTo) {
        query = query.where(eq(moderationQueue.assignedTo, assignedTo));
      }

      return await query
        .orderBy(desc(moderationQueue.priority), desc(moderationQueue.createdAt))
        .limit(20);
    } catch (error) {
      console.error('Failed to get moderation queue:', error);
      return [];
    }
  }

  /**
   * Create admin alert
   */
  static async createAlert(alertData: {
    alertType: string;
    title: string;
    description: string;
    severity: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    metadata?: any;
  }) {
    try {
      await db.insert(adminAlerts).values(alertData);
    } catch (error) {
      console.error('Failed to create admin alert:', error);
    }
  }

  /**
   * Get admin alerts
   */
  static async getAdminAlerts(isRead?: boolean) {
    try {
      let query = db.select().from(adminAlerts);

      if (isRead !== undefined) {
        query = query.where(eq(adminAlerts.isRead, isRead));
      }

      return await query
        .orderBy(desc(adminAlerts.createdAt))
        .limit(50);
    } catch (error) {
      console.error('Failed to get admin alerts:', error);
      return [];
    }
  }

  /**
   * Auto-moderate content using filters
   */
  static async autoModerate(content: string, contentType: string, contentId: string, userId: string) {
    try {
      const filters = await db
        .select()
        .from(contentFilters)
        .where(eq(contentFilters.isActive, true));

      for (const filter of filters) {
        const regex = new RegExp(filter.pattern, 'gi');
        if (regex.test(content)) {
          // Auto-flag the content
          await this.flagContent("system", {
            contentType,
            contentId,
            reportedUserId: userId,
            reason: filter.type,
            description: `Auto-flagged by filter: ${filter.name}`
          });

          if (filter.action === 'auto_remove') {
            // Auto-remove content
            await this.executeAction({
              flaggedContentId: "", // Will be filled by flagContent
              actionTaken: 'content_removed',
              reviewNotes: `Auto-removed by filter: ${filter.name}`
            }, "system");
          }

          break; // Only apply first matching filter
        }
      }
    } catch (error) {
      console.error('Failed to auto-moderate content:', error);
    }
  }

  /**
   * Calculate priority based on reason
   */
  private static calculatePriority(reason: string): string {
    const highPriorityReasons = ['violence', 'harassment', 'hate_speech'];
    const mediumPriorityReasons = ['spam', 'inappropriate'];
    
    if (highPriorityReasons.includes(reason)) return 'high';
    if (mediumPriorityReasons.includes(reason)) return 'medium';
    return 'low';
  }

  /**
   * Convert priority to number for sorting
   */
  private static getPriorityNumber(priority: string): number {
    switch (priority) {
      case 'urgent': return 5;
      case 'high': return 4;
      case 'medium': return 3;
      case 'low': return 2;
      default: return 1;
    }
  }
}