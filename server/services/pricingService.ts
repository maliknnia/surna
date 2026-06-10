// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { 
  products, 
  productPricing, 
  discountCodes, 
  discountUsage, 
  flashSales,
  type ProductPricing,
  type DiscountCode,
  type Product,
  type InsertProductPricing,
  type InsertDiscountCode,
  type InsertFlashSale
} from '@shared/schema';
import { eq, and, lte, gte, sql, isNull, or, inArray } from 'drizzle-orm';

export interface PriceCalculation {
  originalPrice: number;
  discountedPrice: number;
  discount: {
    type: string;
    value: number;
    reason: string;
  } | null;
  savings: number;
  isOnSale: boolean;
}

export interface DiscountValidation {
  isValid: boolean;
  error?: string;
  discountAmount?: number;
  finalPrice?: number;
}

export class PricingService {
  
  // Calculate final price for a product considering all applicable discounts
  async calculateProductPrice(
    productId: string, 
    userId?: string, 
    quantity: number = 1
  ): Promise<PriceCalculation> {
    try {
      // Get base product information
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));

      if (!product) {
        throw new Error('Product not found');
      }

      const originalPrice = parseFloat(product.price);
      let bestDiscountedPrice = originalPrice;
      let bestDiscount: { type: string; value: number; reason: string } | null = null;

      // Check for active product-specific pricing rules
      const now = new Date();
      const productPricingRules = await db
        .select()
        .from(productPricing)
        .where(
          and(
            eq(productPricing.productId, productId),
            eq(productPricing.isActive, true),
            or(
              isNull(productPricing.startTime),
              lte(productPricing.startTime, now)
            ),
            or(
              isNull(productPricing.endTime),
              gte(productPricing.endTime, now)
            ),
            or(
              isNull(productPricing.minQuantity),
              lte(productPricing.minQuantity, quantity)
            ),
            or(
              isNull(productPricing.maxQuantity),
              gte(productPricing.maxQuantity, quantity)
            )
          )
        );

      // Apply best product pricing rule
      for (const rule of productPricingRules) {
        // Check if user-specific discount applies
        if (rule.userSpecific && userId) {
          if (!rule.targetUserIds?.includes(userId)) {
            continue;
          }
        }

        let discountedPrice = originalPrice;
        const basePrice = parseFloat(rule.basePrice);
        const discountPercentage = parseFloat(rule.discountPercentage);

        if (rule.discountType === 'percentage') {
          discountedPrice = basePrice * (1 - discountPercentage / 100);
        } else if (rule.discountType === 'fixed') {
          discountedPrice = Math.max(0, basePrice - discountPercentage);
        }

        if (discountedPrice < bestDiscountedPrice) {
          bestDiscountedPrice = discountedPrice;
          bestDiscount = {
            type: rule.discountType,
            value: discountPercentage,
            reason: rule.userSpecific ? 'Personal discount' : 'Limited-time offer'
          };
        }
      }

      // Check for active flash sales
      const flashSaleRules = await db
        .select()
        .from(flashSales)
        .where(
          and(
            eq(flashSales.isActive, true),
            lte(flashSales.startTime, now),
            gte(flashSales.endTime, now),
            or(
              isNull(flashSales.applicableProducts),
              sql`${flashSales.applicableProducts} @> ARRAY[${productId}]`
            )
          )
        );

      // Apply best flash sale discount
      for (const sale of flashSaleRules) {
        const saleDiscountPercentage = parseFloat(sale.discountPercentage);
        const flashSalePrice = originalPrice * (1 - saleDiscountPercentage / 100);
        
        if (flashSalePrice < bestDiscountedPrice) {
          bestDiscountedPrice = flashSalePrice;
          bestDiscount = {
            type: 'percentage',
            value: saleDiscountPercentage,
            reason: `Flash Sale: ${sale.title}`
          };
        }
      }

      return {
        originalPrice,
        discountedPrice: bestDiscountedPrice,
        discount: bestDiscount,
        savings: originalPrice - bestDiscountedPrice,
        isOnSale: bestDiscountedPrice < originalPrice
      };
    } catch (error) {
      console.error('Error calculating product price:', error);
      throw error;
    }
  }

  // Validate and apply discount code to order
  async validateDiscountCode(
    code: string,
    userId: string,
    orderValue: number,
    productIds: string[]
  ): Promise<DiscountValidation> {
    try {
      const now = new Date();

      // Find the discount code
      const [discountCode] = await db
        .select()
        .from(discountCodes)
        .where(
          and(
            eq(discountCodes.code, code.toUpperCase()),
            eq(discountCodes.isActive, true),
            lte(discountCodes.validFrom, now),
            gte(discountCodes.validUntil, now)
          )
        );

      if (!discountCode) {
        return {
          isValid: false,
          error: 'Invalid or expired discount code'
        };
      }

      // Check usage limits
      if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
        return {
          isValid: false,
          error: 'Discount code has reached its usage limit'
        };
      }

      // Check per-user usage limit
      if (discountCode.maxUsesPerUser) {
        const userUsageCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(discountUsage)
          .where(
            and(
              eq(discountUsage.discountCodeId, discountCode.id),
              eq(discountUsage.userId, userId)
            )
          );

        if (userUsageCount[0]?.count >= discountCode.maxUsesPerUser) {
          return {
            isValid: false,
            error: 'You have already used this discount code'
          };
        }
      }

      // Check minimum order value
      if (discountCode.minOrderValue && orderValue < parseFloat(discountCode.minOrderValue)) {
        return {
          isValid: false,
          error: `Minimum order value of $${discountCode.minOrderValue} required`
        };
      }

      // Check applicable products/categories
      if (discountCode.applicableProducts?.length > 0) {
        const hasApplicableProduct = productIds.some(id => 
          discountCode.applicableProducts!.includes(id)
        );
        if (!hasApplicableProduct) {
          return {
            isValid: false,
            error: 'This discount code does not apply to your selected products'
          };
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      const discountValue = parseFloat(discountCode.discountValue);

      if (discountCode.discountType === 'percentage') {
        discountAmount = orderValue * (discountValue / 100);
      } else if (discountCode.discountType === 'fixed') {
        discountAmount = Math.min(discountValue, orderValue);
      } else if (discountCode.discountType === 'free_shipping') {
        // For free shipping, we'll return a symbolic amount
        discountAmount = 0; // Will be handled separately in checkout
      }

      const finalPrice = Math.max(0, orderValue - discountAmount);

      return {
        isValid: true,
        discountAmount,
        finalPrice
      };
    } catch (error) {
      console.error('Error validating discount code:', error);
      return {
        isValid: false,
        error: 'Error validating discount code'
      };
    }
  }

  // Create a new product pricing rule
  async createPricingRule(pricingData: InsertProductPricing): Promise<ProductPricing> {
    try {
      const [newPricing] = await db
        .insert(productPricing)
        .values(pricingData)
        .returning();

      return newPricing;
    } catch (error) {
      console.error('Error creating pricing rule:', error);
      throw error;
    }
  }

  // Create a new discount code
  async createDiscountCode(discountData: InsertDiscountCode): Promise<DiscountCode> {
    try {
      const [newDiscount] = await db
        .insert(discountCodes)
        .values({
          ...discountData,
          code: discountData.code.toUpperCase()
        })
        .returning();

      return newDiscount;
    } catch (error) {
      console.error('Error creating discount code:', error);
      throw error;
    }
  }

  // Create a flash sale
  async createFlashSale(flashSaleData: InsertFlashSale) {
    try {
      const [newFlashSale] = await db
        .insert(flashSales)
        .values(flashSaleData)
        .returning();

      return newFlashSale;
    } catch (error) {
      console.error('Error creating flash sale:', error);
      throw error;
    }
  }

  // Get active flash sales
  async getActiveFlashSales() {
    try {
      const now = new Date();
      return await db
        .select()
        .from(flashSales)
        .where(
          and(
            eq(flashSales.isActive, true),
            lte(flashSales.startTime, now),
            gte(flashSales.endTime, now)
          )
        );
    } catch (error) {
      console.error('Error fetching active flash sales:', error);
      throw error;
    }
  }

  // Record discount code usage
  async recordDiscountUsage(
    discountCodeId: string,
    userId: string,
    orderId: string,
    discountApplied: number
  ) {
    try {
      // Record usage
      await db.insert(discountUsage).values({
        discountCodeId,
        userId,
        orderId,
        discountApplied: discountApplied.toString()
      });

      // Update usage count
      await db
        .update(discountCodes)
        .set({
          currentUses: sql`${discountCodes.currentUses} + 1`
        })
        .where(eq(discountCodes.id, discountCodeId));
    } catch (error) {
      console.error('Error recording discount usage:', error);
      throw error;
    }
  }

  // Get user-specific discounts
  async getUserSpecificDiscounts(userId: string): Promise<ProductPricing[]> {
    try {
      const now = new Date();
      return await db
        .select()
        .from(productPricing)
        .where(
          and(
            eq(productPricing.isActive, true),
            eq(productPricing.userSpecific, true),
            sql`${productPricing.targetUserIds} @> ARRAY[${userId}]`,
            or(
              isNull(productPricing.startTime),
              lte(productPricing.startTime, now)
            ),
            or(
              isNull(productPricing.endTime),
              gte(productPricing.endTime, now)
            )
          )
        );
    } catch (error) {
      console.error('Error fetching user-specific discounts:', error);
      throw error;
    }
  }

  // Get pricing analytics
  async getPricingAnalytics(startDate?: Date, endDate?: Date) {
    try {
      const dateFilter = startDate && endDate 
        ? and(
            gte(discountUsage.usedAt, startDate),
            lte(discountUsage.usedAt, endDate)
          )
        : undefined;

      const discountStats = await db
        .select({
          totalDiscounts: sql<number>`count(*)`,
          totalSavings: sql<number>`sum(${discountUsage.discountApplied})`,
          averageDiscount: sql<number>`avg(${discountUsage.discountApplied})`
        })
        .from(discountUsage)
        .where(dateFilter);

      const topDiscountCodes = await db
        .select({
          code: discountCodes.code,
          description: discountCodes.description,
          usageCount: sql<number>`count(${discountUsage.id})`,
          totalSavings: sql<number>`sum(${discountUsage.discountApplied})`
        })
        .from(discountCodes)
        .leftJoin(discountUsage, eq(discountCodes.id, discountUsage.discountCodeId))
        .groupBy(discountCodes.id, discountCodes.code, discountCodes.description)
        .orderBy(sql`count(${discountUsage.id}) desc`)
        .limit(10);

      return {
        summary: discountStats[0],
        topDiscountCodes
      };
    } catch (error) {
      console.error('Error fetching pricing analytics:', error);
      throw error;
    }
  }
}

export const pricingService = new PricingService();