// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { 
  products, 
  productRecommendations,
  productViews,
  orderItems,
  users,
  productReviews,
  productCategories,
  productAttributes,
  userWishlists,
  wishlistItems,
  type Product,
  type ProductRecommendation,
  type InsertProductRecommendation
} from '@shared/schema';
import { eq, desc, and, sql, inArray, ne, gte, lte, isNull, or } from 'drizzle-orm';

export interface RecommendationResult {
  productId: string;
  score: number;
  reason: string;
  recommendationType: string;
  product?: Product;
  metadata?: Record<string, any>;
}

export interface PersonalizedRecommendations {
  collaborative: RecommendationResult[];
  contentBased: RecommendationResult[];
  trending: RecommendationResult[];
  personalized: RecommendationResult[];
}

export class MarketplaceRecommendationService {

  // Generate comprehensive personalized recommendations for a user
  async generatePersonalizedRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<PersonalizedRecommendations> {
    try {
      // Get user's purchase and interaction history
      const userHistory = await this.getUserInteractionHistory(userId);
      
      // Generate different types of recommendations in parallel
      const [collaborative, contentBased, trending, personalized] = await Promise.all([
        this.generateCollaborativeRecommendations(userId, limit / 4),
        this.generateContentBasedRecommendations(userId, limit / 4),
        this.generateTrendingRecommendations(userId, limit / 4),
        this.generateHybridRecommendations(userId, limit / 4)
      ]);

      return {
        collaborative,
        contentBased,
        trending,
        personalized
      };
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      throw error;
    }
  }

  // Collaborative filtering: Find similar users and recommend their preferences
  async generateCollaborativeRecommendations(
    userId: string, 
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    try {
      // Find similar users based on purchase and review patterns
      const similarUsers = await db
        .select({
          userId: users.id,
          commonProducts: sql<number>`count(*) as common_products`,
          similarity: sql<number>`
            count(*) * 1.0 / (
              (select count(*) from order_items oi1 
               inner join orders o1 on oi1.order_id = o1.id 
               where o1.user_id = ${userId}) + 
              (select count(*) from order_items oi2 
               inner join orders o2 on oi2.order_id = o2.id 
               where o2.user_id = users.id) - count(*)
            ) as similarity_score`
        })
        .from(users)
        .innerJoin(
          sql`(
            select o.user_id, oi.product_id 
            from orders o 
            inner join order_items oi on o.id = oi.order_id 
            where o.user_id != ${userId}
          ) as user_products`,
          sql`users.id = user_products.user_id`
        )
        .innerJoin(
          sql`(
            select oi.product_id 
            from orders o 
            inner join order_items oi on o.id = oi.order_id 
            where o.user_id = ${userId}
          ) as target_user_products`,
          sql`user_products.product_id = target_user_products.product_id`
        )
        .groupBy(users.id)
        .having(sql`count(*) >= 2`) // At least 2 common products
        .orderBy(sql`similarity_score desc`)
        .limit(10);

      if (similarUsers.length === 0) {
        return [];
      }

      const similarUserIds = similarUsers.map(u => u.userId);

      // Get products purchased by similar users but not by the target user
      const recommendations = await db
        .select({
          productId: products.id,
          product: products,
          purchaseCount: sql<number>`count(*) as purchase_count`,
          avgRating: sql<number>`coalesce(avg(pr.rating), 0) as avg_rating`
        })
        .from(products)
        .innerJoin(orderItems, eq(products.id, orderItems.productId))
        .innerJoin(
          sql`orders o`,
          sql`order_items.order_id = o.id`
        )
        .leftJoin(productReviews, eq(products.id, productReviews.productId))
        .where(
          and(
            inArray(sql`o.user_id`, similarUserIds),
            sql`${products.id} not in (
              select oi.product_id 
              from orders o2 
              inner join order_items oi on o2.id = oi.order_id 
              where o2.user_id = ${userId}
            )`
          )
        )
        .groupBy(products.id)
        .orderBy(desc(sql`purchase_count * avg_rating`))
        .limit(limit);

      return recommendations.map(rec => ({
        productId: rec.productId,
        score: (rec.purchaseCount * (rec.avgRating || 3)) / 100,
        reason: 'Users with similar taste also bought this',
        recommendationType: 'collaborative',
        product: rec.product,
        metadata: {
          purchaseCount: rec.purchaseCount,
          avgRating: rec.avgRating,
          similarUsers: similarUsers.length
        }
      }));
    } catch (error) {
      console.error('Error generating collaborative recommendations:', error);
      return [];
    }
  }

  // Content-based filtering: Recommend similar products based on attributes
  async generateContentBasedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    try {
      // Get user's preferred categories and attributes from purchase history
      const userPreferences = await db
        .select({
          category: products.category,
          sport: sql<string>`coalesce(pa.attribute_value, '') as sport_type`,
          categoryCount: sql<number>`count(*) as category_count`,
          avgRating: sql<number>`avg(pr.rating) as avg_rating`
        })
        .from(products)
        .innerJoin(orderItems, eq(products.id, orderItems.productId))
        .innerJoin(
          sql`orders o`,
          sql`order_items.order_id = o.id`
        )
        .leftJoin(productAttributes, 
          and(
            eq(productAttributes.productId, products.id),
            eq(productAttributes.attributeName, 'sport_type')
          )
        )
        .leftJoin(productReviews, eq(products.id, productReviews.productId))
        .where(eq(sql`o.user_id`, userId))
        .groupBy(products.category, sql`pa.attribute_value`)
        .orderBy(desc(sql`category_count`));

      if (userPreferences.length === 0) {
        // Fall back to popular products if no purchase history
        return this.generateTrendingRecommendations(userId, limit);
      }

      const topCategories = userPreferences.slice(0, 3);

      // Find similar products in preferred categories
      const recommendations = await db
        .select({
          productId: products.id,
          product: products,
          similarity: sql<number>`
            case 
              when products.category = ANY(${topCategories.map(p => p.category)}) then 1.0
              else 0.5
            end as similarity_score`,
          avgRating: sql<number>`coalesce(avg(pr.rating), 0) as avg_rating`,
          reviewCount: sql<number>`count(pr.id) as review_count`
        })
        .from(products)
        .leftJoin(productReviews, eq(products.id, productReviews.productId))
        .where(
          and(
            eq(products.isActive, true),
            or(
              inArray(products.category, topCategories.map(p => p.category!)),
              sql`exists(
                select 1 from product_attributes pa2 
                where pa2.product_id = products.id 
                and pa2.attribute_name = 'sport_type' 
                and pa2.attribute_value in (${topCategories.map(p => p.sport).filter(s => s)})
              )`
            ),
            sql`${products.id} not in (
              select oi.product_id 
              from orders o2 
              inner join order_items oi on o2.id = oi.order_id 
              where o2.user_id = ${userId}
            )`
          )
        )
        .groupBy(products.id, sql`similarity_score`)
        .orderBy(desc(sql`similarity_score * (avg_rating + 1) * log(review_count + 1)`))
        .limit(limit);

      return recommendations.map(rec => ({
        productId: rec.productId,
        score: rec.similarity * (rec.avgRating + 1) * Math.log(rec.reviewCount + 1) / 100,
        reason: 'Similar to products you\'ve purchased',
        recommendationType: 'content_based',
        product: rec.product,
        metadata: {
          avgRating: rec.avgRating,
          reviewCount: rec.reviewCount,
          similarity: rec.similarity
        }
      }));
    } catch (error) {
      console.error('Error generating content-based recommendations:', error);
      return [];
    }
  }

  // Trending products based on recent activity and popularity
  async generateTrendingRecommendations(
    userId?: string,
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const trendingProducts = await db
        .select({
          productId: products.id,
          product: products,
          trendScore: sql<number>`
            (count(distinct pv.id) * 0.1 + 
             count(distinct oi.id) * 2.0 + 
             count(distinct pr.id) * 0.5 + 
             avg(coalesce(pr.rating, 0)) * 0.3) as trend_score`,
          viewCount: sql<number>`count(distinct pv.id) as view_count`,
          purchaseCount: sql<number>`count(distinct oi.id) as purchase_count`,
          reviewCount: sql<number>`count(distinct pr.id) as review_count`,
          avgRating: sql<number>`avg(pr.rating) as avg_rating`
        })
        .from(products)
        .leftJoin(productViews, 
          and(
            eq(productViews.productId, products.id),
            gte(productViews.viewedAt, oneWeekAgo)
          )
        )
        .leftJoin(orderItems, eq(orderItems.productId, products.id))
        .leftJoin(
          sql`orders o`,
          and(
            sql`order_items.order_id = o.id`,
            gte(sql`o.created_at`, oneWeekAgo)
          )
        )
        .leftJoin(productReviews, 
          and(
            eq(productReviews.productId, products.id),
            gte(productReviews.createdAt, oneWeekAgo)
          )
        )
        .where(
          and(
            eq(products.isActive, true),
            userId ? sql`${products.id} not in (
              select oi.product_id 
              from orders o2 
              inner join order_items oi on o2.id = oi.order_id 
              where o2.user_id = ${userId}
            )` : undefined
          )
        )
        .groupBy(products.id)
        .having(sql`count(distinct pv.id) + count(distinct oi.id) + count(distinct pr.id) > 0`)
        .orderBy(desc(sql`trend_score`))
        .limit(limit);

      return trendingProducts.map(product => ({
        productId: product.productId,
        score: product.trendScore / 100,
        reason: 'Trending this week',
        recommendationType: 'trending',
        product: product.product,
        metadata: {
          viewCount: product.viewCount,
          purchaseCount: product.purchaseCount,
          reviewCount: product.reviewCount,
          avgRating: product.avgRating,
          trendScore: product.trendScore
        }
      }));
    } catch (error) {
      console.error('Error generating trending recommendations:', error);
      return [];
    }
  }

  // Hybrid recommendations combining multiple algorithms
  async generateHybridRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    try {
      // Get multiple recommendation types with smaller limits
      const [collaborative, contentBased, trending] = await Promise.all([
        this.generateCollaborativeRecommendations(userId, Math.ceil(limit * 0.4)),
        this.generateContentBasedRecommendations(userId, Math.ceil(limit * 0.4)),
        this.generateTrendingRecommendations(userId, Math.ceil(limit * 0.3))
      ]);

      // Combine and weight the recommendations
      const combinedRecommendations = new Map<string, RecommendationResult>();

      // Add collaborative recommendations with higher weight
      collaborative.forEach(rec => {
        const existing = combinedRecommendations.get(rec.productId);
        if (existing) {
          existing.score += rec.score * 1.2;
          existing.reason += ', ' + rec.reason;
        } else {
          combinedRecommendations.set(rec.productId, {
            ...rec,
            score: rec.score * 1.2,
            recommendationType: 'personalized'
          });
        }
      });

      // Add content-based recommendations
      contentBased.forEach(rec => {
        const existing = combinedRecommendations.get(rec.productId);
        if (existing) {
          existing.score += rec.score * 1.0;
          existing.reason += ', ' + rec.reason;
        } else {
          combinedRecommendations.set(rec.productId, {
            ...rec,
            score: rec.score * 1.0,
            recommendationType: 'personalized'
          });
        }
      });

      // Add trending recommendations with lower weight
      trending.forEach(rec => {
        const existing = combinedRecommendations.get(rec.productId);
        if (existing) {
          existing.score += rec.score * 0.8;
          existing.reason += ', ' + rec.reason;
        } else {
          combinedRecommendations.set(rec.productId, {
            ...rec,
            score: rec.score * 0.8,
            recommendationType: 'personalized'
          });
        }
      });

      // Sort by combined score and return top results
      return Array.from(combinedRecommendations.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(rec => ({
          ...rec,
          reason: 'Personalized for you'
        }));
    } catch (error) {
      console.error('Error generating hybrid recommendations:', error);
      return [];
    }
  }

  // Get products frequently bought together
  async getFrequentlyBoughtTogether(
    productId: string,
    limit: number = 5
  ): Promise<RecommendationResult[]> {
    try {
      const relatedProducts = await db
        .select({
          productId: sql<string>`oi2.product_id`,
          product: products,
          frequency: sql<number>`count(*) as frequency`,
          confidence: sql<number>`
            count(*) * 1.0 / (
              select count(*) 
              from order_items oi3 
              where oi3.product_id = ${productId}
            ) as confidence`
        })
        .from(sql`order_items oi1`)
        .innerJoin(sql`order_items oi2`, sql`oi1.order_id = oi2.order_id`)
        .innerJoin(products, sql`oi2.product_id = products.id`)
        .where(
          and(
            sql`oi1.product_id = ${productId}`,
            sql`oi2.product_id != ${productId}`,
            eq(products.isActive, true)
          )
        )
        .groupBy(sql`oi2.product_id`, products.id)
        .having(sql`count(*) >= 2`) // At least bought together twice
        .orderBy(desc(sql`confidence * frequency`))
        .limit(limit);

      return relatedProducts.map(product => ({
        productId: product.productId,
        score: product.confidence * product.frequency / 100,
        reason: 'Frequently bought together',
        recommendationType: 'frequently_bought_together',
        product: product.product,
        metadata: {
          frequency: product.frequency,
          confidence: product.confidence
        }
      }));
    } catch (error) {
      console.error('Error getting frequently bought together:', error);
      return [];
    }
  }

  // Store recommendations in the database for caching
  async storeRecommendations(recommendations: InsertProductRecommendation[]) {
    try {
      if (recommendations.length === 0) return;

      await db.insert(productRecommendations).values(recommendations);
    } catch (error) {
      console.error('Error storing recommendations:', error);
      throw error;
    }
  }

  // Get cached recommendations from database
  async getCachedRecommendations(
    userId: string,
    recommendationType?: string,
    limit: number = 20
  ): Promise<ProductRecommendation[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      return await db
        .select()
        .from(productRecommendations)
        .where(
          and(
            eq(productRecommendations.userId, userId),
            recommendationType ? eq(productRecommendations.recommendationType, recommendationType) : undefined,
            gte(productRecommendations.generatedAt, oneDayAgo),
            or(
              isNull(productRecommendations.expiresAt),
              gte(productRecommendations.expiresAt, new Date())
            )
          )
        )
        .orderBy(desc(productRecommendations.score))
        .limit(limit);
    } catch (error) {
      console.error('Error getting cached recommendations:', error);
      return [];
    }
  }

  // Get user interaction history for recommendation generation
  private async getUserInteractionHistory(userId: string) {
    try {
      const [purchases, views, wishlistItems] = await Promise.all([
        // Purchase history
        db
          .select({ productId: orderItems.productId, createdAt: sql<Date>`o.created_at` })
          .from(orderItems)
          .innerJoin(sql`orders o`, sql`order_items.order_id = o.id`)
          .where(sql`o.user_id = ${userId}`)
          .orderBy(desc(sql`o.created_at`)),

        // View history
        db
          .select({ productId: productViews.productId, viewedAt: productViews.viewedAt })
          .from(productViews)
          .where(eq(productViews.userId, userId))
          .orderBy(desc(productViews.viewedAt))
          .limit(100),

        // Wishlist items
        db
          .select({ productId: wishlistItems.productId, addedAt: wishlistItems.addedAt })
          .from(wishlistItems)
          .innerJoin(userWishlists, eq(wishlistItems.wishlistId, userWishlists.id))
          .where(eq(userWishlists.userId, userId))
          .orderBy(desc(wishlistItems.addedAt))
      ]);

      return { purchases, views, wishlistItems };
    } catch (error) {
      console.error('Error getting user interaction history:', error);
      return { purchases: [], views: [], wishlistItems: [] };
    }
  }
}

export const marketplaceRecommendationService = new MarketplaceRecommendationService();