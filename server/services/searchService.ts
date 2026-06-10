// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { dbRead } from '../dbRead';
import { 
  products, 
  productCategories,
  productAttributes,
  productReviews,
  productSellers,
  inventoryTracking,
  productSearches,
  type Product,
  type ProductCategory,
  type ProductAttribute,
  type InsertProductSearch
} from '@shared/schema';
import { eq, ilike, and, or, sql, desc, asc, gte, lte, inArray, isNotNull } from 'drizzle-orm';
import { cacheAside, cacheKey, TTL } from '../infrastructure/cache';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  priceRange?: { min: number; max: number; };
  brands?: string[];
  ratings?: number; // minimum rating
  inStock?: boolean;
  sportTypes?: string[];
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popularity';
  attributes?: Record<string, string[]>; // e.g., { size: ['M', 'L'], color: ['red', 'blue'] }
  sellerId?: string;
  isVerifiedSeller?: boolean;
}

export interface SearchResult {
  products: Product[];
  categories: ProductCategory[];
  brands: string[];
  totalCount: number;
  facets: {
    priceRange: { min: number; max: number; };
    availableBrands: string[];
    availableCategories: ProductCategory[];
    availableSportTypes: string[];
    availableAttributes: Record<string, string[]>;
    ratingDistribution: Record<string, number>;
  };
  suggestions?: string[];
}

export interface AutocompleteResult {
  products: Array<{ id: string; name: string; category?: string; imageUrl?: string; }>;
  categories: Array<{ id: string; name: string; slug: string; }>;
  brands: string[];
  sportTypes: string[];
}

export class SearchService {

  // Main product search with advanced filtering
  async searchProducts(
    filters: SearchFilters = {},
    limit: number = 24,
    offset: number = 0,
    userId?: string
  ): Promise<SearchResult> {
    try {
      // Track search query for analytics
      if (filters.query && userId) {
        this.trackSearch(filters.query, userId).catch(console.error);
      }

      // Build the base query
      const baseQuery = this.buildSearchQuery(filters);

      // Get total count
      const totalCountResult = await baseQuery
        .select({ count: sql<number>`count(distinct ${products.id})` })
        .execute();
      
      const totalCount = totalCountResult[0]?.count || 0;

      // Get products with pagination and sorting
      const productsQuery = this.applySorting(baseQuery, filters.sortBy || 'relevance');
      
      const searchResults = await productsQuery
        .select({
          product: products,
          avgRating: sql<number>`coalesce(avg(${productReviews.rating}), 0)`,
          reviewCount: sql<number>`count(${productReviews.id})`,
          currentStock: sql<number>`coalesce(${inventoryTracking.currentStock}, 0)`,
          sellerName: sql<string>`${productSellers.businessName}`,
          isVerifiedSeller: sql<boolean>`coalesce(${productSellers.isVerified}, false)`
        })
        .groupBy(
          products.id, 
          inventoryTracking.currentStock,
          productSellers.businessName,
          productSellers.isVerified
        )
        .limit(limit)
        .offset(offset)
        .execute();

      // Extract products with enriched data
      const enrichedProducts = searchResults.map(result => ({
        ...result.product,
        avgRating: result.avgRating,
        reviewCount: result.reviewCount,
        currentStock: result.currentStock,
        sellerName: result.sellerName,
        isVerifiedSeller: result.isVerifiedSeller
      }));

      // Get search facets
      const facets = await this.getSearchFacets(filters);

      // Get categories
      const categories = await this.getProductCategories();

      // Get available brands from current search results
      const brands = await this.getAvailableBrands(filters);

      // Get search suggestions if query provided
      const suggestions = filters.query ? await this.getSearchSuggestions(filters.query) : undefined;

      return {
        products: enrichedProducts,
        categories,
        brands,
        totalCount,
        facets,
        suggestions
      };
    } catch (error) {
      console.error('Error in product search:', error);
      throw error;
    }
  }

  // Autocomplete search for search bar
  async getAutocomplete(query: string, limit: number = 10): Promise<AutocompleteResult> {
    if (!query || query.trim().length < 2) {
      return { products: [], categories: [], brands: [], sportTypes: [] };
    }
    // Identical autocomplete inputs are extremely common — cache by
    // normalized query+limit for 60s. Result is anonymous so it's safe to
    // share across viewers.
    return cacheAside(
      cacheKey('search:autocomplete', query.trim().toLowerCase(), limit),
      TTL.SEARCH,
      () => this.getAutocompleteUncached(query, limit)
    );
  }

  private async getAutocompleteUncached(query: string, limit: number): Promise<AutocompleteResult> {
    try {
      const searchQuery = `%${query.trim().toLowerCase()}%`;

      // Get matching products
      const products = await dbRead
        .select({
          id: products.id,
          name: products.name,
          category: products.category,
          imageUrl: products.imageUrl
        })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            or(
              ilike(products.name, searchQuery),
              ilike(products.description, searchQuery)
            )
          )
        )
        .limit(limit / 2)
        .execute();

      // Get matching categories
      const categories = await dbRead
        .select({
          id: productCategories.id,
          name: productCategories.name,
          slug: productCategories.slug
        })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.isActive, true),
            ilike(productCategories.name, searchQuery)
          )
        )
        .limit(5)
        .execute();

      // Get matching brands
      const brandResults = await dbRead
        .select({ brand: products.brand })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            isNotNull(products.brand),
            ilike(products.brand, searchQuery)
          )
        )
        .groupBy(products.brand)
        .limit(5)
        .execute();
      
      const brands = brandResults.map(r => r.brand!).filter(Boolean);

      // Get matching sport types from attributes
      const sportTypeResults = await dbRead
        .select({ sportType: productAttributes.attributeValue })
        .from(productAttributes)
        .innerJoin(products, eq(productAttributes.productId, products.id))
        .where(
          and(
            eq(products.isActive, true),
            eq(productAttributes.attributeName, 'sport_type'),
            ilike(productAttributes.attributeValue, searchQuery)
          )
        )
        .groupBy(productAttributes.attributeValue)
        .limit(5)
        .execute();

      const sportTypes = sportTypeResults.map(r => r.sportType).filter(Boolean);

      return {
        products,
        categories,
        brands,
        sportTypes
      };
    } catch (error) {
      console.error('Error in autocomplete search:', error);
      return { products: [], categories: [], brands: [], sportTypes: [] };
    }
  }

  // Get popular search queries for suggestions. Aggregated over the last 30
  // days so the result barely changes minute-to-minute — safe to cache for
  // the longer LONG TTL (5min) and shave a heavy GROUP BY off every load.
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    return cacheAside(
      cacheKey('search:popular', limit),
      TTL.LONG,
      async () => {
        try {
          const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          const popularSearches = await dbRead
            .select({
              query: productSearches.searchQuery,
              count: sql<number>`count(*)`
            })
            .from(productSearches)
            .where(gte(productSearches.searchedAt, oneMonthAgo))
            .groupBy(productSearches.searchQuery)
            .orderBy(desc(sql`count(*)`))
            .limit(limit)
            .execute();

          return popularSearches.map(s => s.query);
        } catch (error) {
          console.error('Error getting popular searches:', error);
          return [];
        }
      }
    );
  }

  // Build the base search query with filters
  private buildSearchQuery(filters: SearchFilters) {
    let query = dbRead
      .select()
      .from(products)
      .leftJoin(productReviews, eq(products.id, productReviews.productId))
      .leftJoin(inventoryTracking, eq(products.id, inventoryTracking.productId))
      .leftJoin(productSellers, eq(products.id, productSellers.sellerId))
      .where(eq(products.isActive, true));

    const conditions = [eq(products.isActive, true)];

    // Text search
    if (filters.query) {
      const searchQuery = `%${filters.query.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(products.name, searchQuery),
          ilike(products.description, searchQuery),
          ilike(products.brand, searchQuery)
        )
      );
    }

    // Category filter
    if (filters.categories?.length) {
      conditions.push(inArray(products.category, filters.categories));
    }

    // Price range filter
    if (filters.priceRange) {
      if (filters.priceRange.min) {
        conditions.push(gte(sql`CAST(${products.price} AS NUMERIC)`, filters.priceRange.min));
      }
      if (filters.priceRange.max) {
        conditions.push(lte(sql`CAST(${products.price} AS NUMERIC)`, filters.priceRange.max));
      }
    }

    // Brand filter
    if (filters.brands?.length) {
      conditions.push(inArray(products.brand, filters.brands));
    }

    // Rating filter
    if (filters.ratings && filters.ratings > 0) {
      conditions.push(
        sql`${products.id} IN (
          SELECT product_id 
          FROM product_reviews 
          GROUP BY product_id 
          HAVING AVG(rating) >= ${filters.ratings}
        )`
      );
    }

    // Stock filter
    if (filters.inStock) {
      conditions.push(sql`${inventoryTracking.currentStock} > 0`);
    }

    // Seller filters
    if (filters.sellerId) {
      conditions.push(eq(productSellers.sellerId, filters.sellerId));
    }

    if (filters.isVerifiedSeller) {
      conditions.push(eq(productSellers.isVerified, true));
    }

    // Sport type filter (from attributes)
    if (filters.sportTypes?.length) {
      conditions.push(
        sql`${products.id} IN (
          SELECT product_id 
          FROM product_attributes 
          WHERE attribute_name = 'sport_type' 
          AND attribute_value = ANY(${filters.sportTypes})
        )`
      );
    }

    // Generic attributes filter
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([attributeName, values]) => {
        if (values.length > 0) {
          conditions.push(
            sql`${products.id} IN (
              SELECT product_id 
              FROM product_attributes 
              WHERE attribute_name = ${attributeName} 
              AND attribute_value = ANY(${values})
            )`
          );
        }
      });
    }

    return query.where(and(...conditions));
  }

  // Apply sorting to the query
  private applySorting(query: any, sortBy: string) {
    switch (sortBy) {
      case 'price_asc':
        return query.orderBy(asc(sql`CAST(${products.price} AS NUMERIC)`));
      case 'price_desc':
        return query.orderBy(desc(sql`CAST(${products.price} AS NUMERIC)`));
      case 'rating':
        return query.orderBy(desc(sql`coalesce(avg(${productReviews.rating}), 0)`));
      case 'newest':
        return query.orderBy(desc(products.createdAt));
      case 'popularity':
        return query.orderBy(desc(sql`count(${productReviews.id})`));
      case 'relevance':
      default:
        // For relevance, we'll use a combination of factors
        return query.orderBy(
          desc(sql`
            (coalesce(avg(${productReviews.rating}), 0) * 0.3 + 
             log(count(${productReviews.id}) + 1) * 0.7) * 
            case when ${inventoryTracking.currentStock} > 0 then 1.2 else 0.8 end
          `)
        );
    }
  }

  // Get search facets for filtering
  private async getSearchFacets(filters: SearchFilters) {
    try {
      const baseQuery = this.buildSearchQuery({ ...filters, priceRange: undefined, brands: undefined });

      // Get price range
      const priceRange = await baseQuery
        .select({
          min: sql<number>`MIN(CAST(${products.price} AS NUMERIC))`,
          max: sql<number>`MAX(CAST(${products.price} AS NUMERIC))`
        })
        .execute();

      // Get available brands
      const brandResults = await baseQuery
        .select({ brand: products.brand })
        .where(isNotNull(products.brand))
        .groupBy(products.brand)
        .execute();

      // Get available categories
      const categoryResults = await dbRead
        .select()
        .from(productCategories)
        .where(eq(productCategories.isActive, true))
        .execute();

      // Get available sport types
      const sportTypeResults = await dbRead
        .select({ sportType: productAttributes.attributeValue })
        .from(productAttributes)
        .where(eq(productAttributes.attributeName, 'sport_type'))
        .groupBy(productAttributes.attributeValue)
        .execute();

      // Get rating distribution
      const ratingDistribution = await dbRead
        .select({
          rating: sql<number>`FLOOR(${productReviews.rating})`,
          count: sql<number>`count(*)`
        })
        .from(productReviews)
        .groupBy(sql`FLOOR(${productReviews.rating})`)
        .execute();

      const ratingDist: Record<string, number> = {};
      ratingDistribution.forEach(r => {
        ratingDist[r.rating.toString()] = r.count;
      });

      return {
        priceRange: {
          min: priceRange[0]?.min || 0,
          max: priceRange[0]?.max || 1000
        },
        availableBrands: brandResults.map(b => b.brand!).filter(Boolean),
        availableCategories: categoryResults,
        availableSportTypes: sportTypeResults.map(s => s.sportType),
        availableAttributes: {}, // TODO: Implement generic attributes faceting
        ratingDistribution: ratingDist
      };
    } catch (error) {
      console.error('Error getting search facets:', error);
      return {
        priceRange: { min: 0, max: 1000 },
        availableBrands: [],
        availableCategories: [],
        availableSportTypes: [],
        availableAttributes: {},
        ratingDistribution: {}
      };
    }
  }

  // Get all product categories
  private async getProductCategories(): Promise<ProductCategory[]> {
    try {
      return await dbRead
        .select()
        .from(productCategories)
        .where(eq(productCategories.isActive, true))
        .orderBy(productCategories.displayOrder, productCategories.name)
        .execute();
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Get available brands based on current filters
  private async getAvailableBrands(filters: SearchFilters): Promise<string[]> {
    try {
      const brandsQuery = this.buildSearchQuery({ ...filters, brands: undefined });
      const brandResults = await brandsQuery
        .select({ brand: products.brand })
        .where(isNotNull(products.brand))
        .groupBy(products.brand)
        .execute();

      return brandResults.map(b => b.brand!).filter(Boolean);
    } catch (error) {
      console.error('Error getting available brands:', error);
      return [];
    }
  }

  // Get search suggestions based on query
  private async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const searchQuery = `%${query.trim().toLowerCase()}%`;

      // Get similar product names
      const productSuggestions = await dbRead
        .select({ name: products.name })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            ilike(products.name, searchQuery)
          )
        )
        .limit(5)
        .execute();

      return productSuggestions.map(p => p.name);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Track search query for analytics
  private async trackSearch(query: string, userId: string, clickedProductId?: string) {
    try {
      const searchData: InsertProductSearch = {
        userId,
        searchQuery: query,
        clickedProductId,
        searchedAt: new Date()
      };

      await db.insert(productSearches).values(searchData);
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // Record search result click for analytics
  async recordSearchClick(userId: string, query: string, productId: string) {
    try {
      await this.trackSearch(query, userId, productId);
    } catch (error) {
      console.error('Error recording search click:', error);
    }
  }

  // Get search analytics
  async getSearchAnalytics(startDate?: Date, endDate?: Date) {
    try {
      const dateFilter = startDate && endDate 
        ? and(
            gte(productSearches.searchedAt, startDate),
            lte(productSearches.searchedAt, endDate)
          )
        : undefined;

      const topSearches = await dbRead
        .select({
          query: productSearches.searchQuery,
          searchCount: sql<number>`count(*)`,
          clickCount: sql<number>`count(${productSearches.clickedProductId})`,
          clickThroughRate: sql<number>`
            case when count(*) > 0 
            then count(${productSearches.clickedProductId}) * 100.0 / count(*) 
            else 0 end`
        })
        .from(productSearches)
        .where(dateFilter)
        .groupBy(productSearches.searchQuery)
        .orderBy(desc(sql`count(*)`))
        .limit(20)
        .execute();

      const zeroResultSearches = await dbRead
        .select({
          query: productSearches.searchQuery,
          count: sql<number>`count(*)`
        })
        .from(productSearches)
        .where(
          and(
            dateFilter || sql`true`,
            eq(productSearches.resultsCount, 0)
          )
        )
        .groupBy(productSearches.searchQuery)
        .orderBy(desc(sql`count(*)`))
        .limit(10)
        .execute();

      return {
        topSearches,
        zeroResultSearches
      };
    } catch (error) {
      console.error('Error getting search analytics:', error);
      return { topSearches: [], zeroResultSearches: [] };
    }
  }
}

export const searchService = new SearchService();