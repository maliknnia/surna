// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Admin Service - Administrative functions and user management
import { db } from "../db";
import { 
  users, 
  userActions, 
  adminMetrics, 
  flaggedContent, 
  posts, 
  events, 
  teams,
  payments,
  orders
} from "@shared/schema";
import { eq, and, sql, desc, count, or, lte, gte, ilike, isNull } from "drizzle-orm";

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  suspendedUsers: number;
  totalPosts: number;
  flaggedContent: number;
  pendingReviews: number;
  totalRevenue: number;
  contentQualityScore: number;
}

export interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  lastActive?: Date;
  status: string;
  role?: string;
  totalPosts: number;
  totalReports: number;
}

export class AdminService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get user statistics
      const [userStats] = await db
        .select({
          totalUsers: count(),
          newUsersToday: sql<number>`COUNT(CASE WHEN DATE(${users.createdAt}) = CURRENT_DATE THEN 1 END)`,
          activeUsers: sql<number>`COUNT(CASE WHEN ${users.updatedAt} >= ${thirtyDaysAgo} THEN 1 END)`
        })
        .from(users);

      // Get suspended users count
      const [suspendedCount] = await db
        .select({ count: count() })
        .from(userActions)
        .where(
          and(
            eq(userActions.actionType, "user_suspended"),
            eq(userActions.isActive, true),
            or(
              isNull(userActions.expiresAt),
              gte(userActions.expiresAt, new Date())
            )
          )
        );

      // Get content statistics
      const [contentStats] = await db
        .select({
          totalPosts: count()
        })
        .from(posts);

      // Get flagged content count
      const [flaggedCount] = await db
        .select({ count: count() })
        .from(flaggedContent)
        .where(eq(flaggedContent.status, "pending"));

      // Get revenue statistics
      const [revenueStats] = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`
        })
        .from(payments)
        .where(eq(payments.status, "succeeded"));

      // Calculate content quality score (simplified)
      const totalContent = contentStats.totalPosts;
      const flaggedContentCount = flaggedCount.count;
      const contentQualityScore = totalContent > 0 
        ? Math.max(0, 100 - (flaggedContentCount / totalContent) * 100)
        : 100;

      return {
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        newUsersToday: userStats.newUsersToday,
        suspendedUsers: suspendedCount.count,
        totalPosts: contentStats.totalPosts,
        flaggedContent: flaggedCount.count,
        pendingReviews: flaggedCount.count,
        totalRevenue: Number(revenueStats.totalRevenue || 0),
        contentQualityScore: Math.round(contentQualityScore * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        suspendedUsers: 0,
        totalPosts: 0,
        flaggedContent: 0,
        pendingReviews: 0,
        totalRevenue: 0,
        contentQualityScore: 0
      };
    }
  }

  /**
   * Search users with filters
   */
  static async searchUsers(
    query?: string,
    status?: string,
    role?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserSearchResult[]> {
    try {
      let dbQuery = db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          profileImageUrl: users.profileImageUrl
        })
        .from(users);

      // Apply search query
      if (query) {
        dbQuery = dbQuery.where(
          or(
            ilike(users.email, `%${query}%`),
            ilike(users.firstName, `%${query}%`),
            ilike(users.lastName, `%${query}%`)
          )
        );
      }

      const userResults = await dbQuery
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get additional user statistics
      const userIds = userResults.map(u => u.id);
      
      // Get post counts
      const postCounts = await db
        .select({
          userId: posts.authorId,
          count: count()
        })
        .from(posts)
        .where(sql`${posts.authorId} = ANY(${userIds})`)
        .groupBy(posts.authorId);

      // Get report counts
      const reportCounts = await db
        .select({
          userId: flaggedContent.reportedUserId,
          count: count()
        })
        .from(flaggedContent)
        .where(sql`${flaggedContent.reportedUserId} = ANY(${userIds})`)
        .groupBy(flaggedContent.reportedUserId);

      // Combine data
      return userResults.map(user => ({
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        createdAt: user.createdAt || new Date(),
        lastActive: user.updatedAt,
        status: 'active', // TODO: Calculate based on user actions
        role: 'user', // TODO: Get from user role system
        totalPosts: postCounts.find(p => p.userId === user.id)?.count || 0,
        totalReports: reportCounts.find(r => r.userId === user.id)?.count || 0
      }));
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  }

  /**
   * Get user details with admin context
   */
  static async getUserDetails(userId: string) {
    try {
      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return null;
      }

      // Get user actions history
      const actions = await db
        .select({
          id: userActions.id,
          actionType: userActions.actionType,
          reason: userActions.reason,
          createdAt: userActions.createdAt,
          expiresAt: userActions.expiresAt,
          isActive: userActions.isActive,
          performedBy: sql<string>`${users.firstName} || ' ' || ${users.lastName}`
        })
        .from(userActions)
        .leftJoin(users, eq(userActions.performedBy, users.id))
        .where(eq(userActions.userId, userId))
        .orderBy(desc(userActions.createdAt));

      // Get content statistics
      const [contentStats] = await db
        .select({
          totalPosts: count(posts.id),
          totalReports: count(flaggedContent.id)
        })
        .from(users)
        .leftJoin(posts, eq(posts.authorId, users.id))
        .leftJoin(flaggedContent, eq(flaggedContent.reportedUserId, users.id))
        .where(eq(users.id, userId));

      return {
        user,
        actions,
        stats: contentStats
      };
    } catch (error) {
      console.error('Failed to get user details:', error);
      return null;
    }
  }

  /**
   * Generate admin report
   */
  static async generateReport(startDate: Date, endDate: Date) {
    try {
      // User metrics
      const [userMetrics] = await db
        .select({
          totalUsers: count(),
          newUsers: sql<number>`COUNT(CASE WHEN ${users.createdAt} BETWEEN ${startDate} AND ${endDate} THEN 1 END)`
        })
        .from(users);

      // Content metrics
      const [contentMetrics] = await db
        .select({
          totalPosts: count(posts.id),
          flaggedPosts: count(flaggedContent.id)
        })
        .from(posts)
        .leftJoin(
          flaggedContent, 
          and(
            eq(flaggedContent.contentType, "post"),
            eq(flaggedContent.contentId, posts.id)
          )
        )
        .where(
          and(
            gte(posts.createdAt, startDate),
            lte(posts.createdAt, endDate)
          )
        );

      // Moderation metrics
      const [moderationMetrics] = await db
        .select({
          totalReports: count(),
          resolvedReports: sql<number>`COUNT(CASE WHEN ${flaggedContent.status} = 'resolved' THEN 1 END)`,
          avgResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${flaggedContent.reviewedAt} - ${flaggedContent.createdAt})))/3600`
        })
        .from(flaggedContent)
        .where(
          and(
            gte(flaggedContent.createdAt, startDate),
            lte(flaggedContent.createdAt, endDate)
          )
        );

      return {
        period: { startDate, endDate },
        users: userMetrics,
        content: contentMetrics,
        moderation: moderationMetrics,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to generate admin report:', error);
      throw error;
    }
  }

  /**
   * Store daily metrics
   */
  static async storeDailyMetrics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await this.getDashboardStats();

      await db.insert(adminMetrics).values({
        date: today,
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        newUsers: stats.newUsersToday,
        suspendedUsers: stats.suspendedUsers,
        totalPosts: stats.totalPosts,
        flaggedPosts: stats.flaggedContent,
        totalReports: stats.pendingReviews,
        resolvedReports: 0, // Calculate separately
        contentQualityScore: stats.contentQualityScore.toString()
      });
    } catch (error) {
      console.error('Failed to store daily metrics:', error);
    }
  }

  /**
   * Get metrics trends
   */
  static async getMetricsTrends(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await db
        .select()
        .from(adminMetrics)
        .where(gte(adminMetrics.date, startDate))
        .orderBy(desc(adminMetrics.date));
    } catch (error) {
      console.error('Failed to get metrics trends:', error);
      return [];
    }
  }
}