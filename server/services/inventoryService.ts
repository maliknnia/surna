// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { 
  products, 
  inventoryTracking,
  productSellers,
  orderItems,
  orders,
  notifications,
  type Product,
  type InventoryTracking,
  type ProductSeller,
  type InsertInventoryTracking,
  type InsertProductSeller
} from '@shared/schema';
import { eq, and, sql, desc, gte, lte, lt } from 'drizzle-orm';

export interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  lowStockThreshold: number;
  severity: 'low' | 'critical' | 'out_of_stock';
  sellerId?: string;
}

export interface InventoryUpdate {
  productId: string;
  quantityChange: number; // positive for restock, negative for sale
  reason: 'sale' | 'restock' | 'adjustment' | 'damaged' | 'returned';
  notes?: string;
}

export interface SellerAnalytics {
  totalSales: number;
  totalRevenue: number;
  activeProducts: number;
  averageRating: number;
  totalReviews: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  salesTrend: Array<{
    date: Date;
    sales: number;
    revenue: number;
  }>;
}

export class InventoryService {

  // Get current inventory status for a product
  async getProductInventory(productId: string): Promise<InventoryTracking | null> {
    try {
      const [inventory] = await db
        .select()
        .from(inventoryTracking)
        .where(eq(inventoryTracking.productId, productId));

      return inventory || null;
    } catch (error) {
      console.error('Error fetching product inventory:', error);
      throw error;
    }
  }

  // Initialize inventory tracking for a new product
  async initializeInventory(inventoryData: InsertInventoryTracking): Promise<InventoryTracking> {
    try {
      const [newInventory] = await db
        .insert(inventoryTracking)
        .values({
          ...inventoryData,
          lastUpdated: new Date()
        })
        .returning();

      return newInventory;
    } catch (error) {
      console.error('Error initializing inventory:', error);
      throw error;
    }
  }

  // Update inventory levels
  async updateInventory(update: InventoryUpdate): Promise<InventoryTracking> {
    try {
      const { productId, quantityChange, reason, notes } = update;

      // Get current inventory
      const currentInventory = await this.getProductInventory(productId);
      if (!currentInventory) {
        throw new Error('Product inventory not initialized');
      }

      const newStock = Math.max(0, currentInventory.currentStock + quantityChange);
      const newReservedStock = reason === 'sale' ? 
        Math.max(0, currentInventory.reservedStock - Math.abs(quantityChange)) :
        currentInventory.reservedStock;

      // Update inventory
      const [updatedInventory] = await db
        .update(inventoryTracking)
        .set({
          currentStock: newStock,
          reservedStock: newReservedStock,
          lastUpdated: new Date()
        })
        .where(eq(inventoryTracking.productId, productId))
        .returning();

      // Check for low stock alerts
      await this.checkLowStockAlert(updatedInventory);

      return updatedInventory;
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  // Reserve inventory for pending orders
  async reserveInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      const inventory = await this.getProductInventory(productId);
      if (!inventory) {
        return false;
      }

      const availableStock = inventory.currentStock - inventory.reservedStock;
      if (availableStock < quantity) {
        return false; // Not enough stock
      }

      await db
        .update(inventoryTracking)
        .set({
          reservedStock: inventory.reservedStock + quantity,
          lastUpdated: new Date()
        })
        .where(eq(inventoryTracking.productId, productId));

      return true;
    } catch (error) {
      console.error('Error reserving inventory:', error);
      return false;
    }
  }

  // Release reserved inventory (for cancelled orders)
  async releaseReservedInventory(productId: string, quantity: number): Promise<void> {
    try {
      await db
        .update(inventoryTracking)
        .set({
          reservedStock: sql`GREATEST(0, ${inventoryTracking.reservedStock} - ${quantity})`,
          lastUpdated: new Date()
        })
        .where(eq(inventoryTracking.productId, productId));
    } catch (error) {
      console.error('Error releasing reserved inventory:', error);
      throw error;
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(sellerId?: string): Promise<InventoryAlert[]> {
    try {
      let query = db
        .select({
          productId: products.id,
          productName: products.name,
          currentStock: inventoryTracking.currentStock,
          lowStockThreshold: inventoryTracking.lowStockThreshold,
          sellerId: productSellers.sellerId
        })
        .from(inventoryTracking)
        .innerJoin(products, eq(inventoryTracking.productId, products.id))
        .leftJoin(productSellers, eq(products.id, productSellers.sellerId))
        .where(
          and(
            eq(products.isActive, true),
            sql`${inventoryTracking.currentStock} <= ${inventoryTracking.lowStockThreshold}`,
            sellerId ? eq(productSellers.sellerId, sellerId) : undefined
          )
        );

      const results = await query.execute();

      return results.map(result => ({
        productId: result.productId,
        productName: result.productName,
        currentStock: result.currentStock,
        lowStockThreshold: result.lowStockThreshold,
        sellerId: result.sellerId || undefined,
        severity: result.currentStock === 0 ? 'out_of_stock' :
                 result.currentStock <= result.lowStockThreshold * 0.3 ? 'critical' : 'low'
      }));
    } catch (error) {
      console.error('Error getting low stock alerts:', error);
      return [];
    }
  }

  // Bulk inventory update from CSV or external source
  async bulkUpdateInventory(updates: InventoryUpdate[]): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        await this.updateInventory(update);
        successful++;
      } catch (error) {
        failed++;
        errors.push(`Product ${update.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { successful, failed, errors };
  }

  // Create or update seller profile
  async upsertSeller(sellerData: InsertProductSeller): Promise<ProductSeller> {
    try {
      const existingSeller = await db
        .select()
        .from(productSellers)
        .where(eq(productSellers.sellerId, sellerData.sellerId));

      if (existingSeller.length > 0) {
        // Update existing seller
        const [updatedSeller] = await db
          .update(productSellers)
          .set(sellerData)
          .where(eq(productSellers.sellerId, sellerData.sellerId))
          .returning();
        return updatedSeller;
      } else {
        // Create new seller
        const [newSeller] = await db
          .insert(productSellers)
          .values(sellerData)
          .returning();
        return newSeller;
      }
    } catch (error) {
      console.error('Error upserting seller:', error);
      throw error;
    }
  }

  // Get seller analytics and performance metrics
  async getSellerAnalytics(sellerId: string, startDate?: Date, endDate?: Date): Promise<SellerAnalytics> {
    try {
      const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const defaultEndDate = endDate || new Date();

      // Get seller's products
      const sellerProducts = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .innerJoin(productSellers, eq(products.id, productSellers.sellerId))
        .where(eq(productSellers.sellerId, sellerId));

      const productIds = sellerProducts.map(p => p.id);

      if (productIds.length === 0) {
        return this.getEmptySellerAnalytics();
      }

      // Get sales data
      const salesData = await db
        .select({
          totalSales: sql<number>`count(*)`,
          totalRevenue: sql<number>`sum(cast(${orderItems.price} as numeric) * ${orderItems.quantity})`,
          productId: orderItems.productId,
          productName: products.name,
          quantitySold: sql<number>`sum(${orderItems.quantity})`,
          orderDate: orders.createdAt
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            sql`${orderItems.productId} = ANY(${productIds})`,
            gte(orders.createdAt, defaultStartDate),
            lte(orders.createdAt, defaultEndDate)
          )
        )
        .groupBy(orderItems.productId, products.name, orders.createdAt)
        .execute();

      // Calculate summary metrics
      const totalSales = salesData.length;
      const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.totalRevenue || 0), 0);

      // Get inventory alerts
      const lowStockAlerts = await this.getLowStockAlerts(sellerId);
      const lowStockProducts = lowStockAlerts.filter(alert => alert.severity === 'low').length;
      const outOfStockProducts = lowStockAlerts.filter(alert => alert.severity === 'out_of_stock').length;

      // Get top selling products
      const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      salesData.forEach(sale => {
        const existing = productSalesMap.get(sale.productId);
        if (existing) {
          existing.quantity += sale.quantitySold || 0;
          existing.revenue += sale.totalRevenue || 0;
        } else {
          productSalesMap.set(sale.productId, {
            name: sale.productName,
            quantity: sale.quantitySold || 0,
            revenue: sale.totalRevenue || 0
          });
        }
      });

      const topSellingProducts = Array.from(productSalesMap.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          quantitySold: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5);

      // Get sales trend (daily aggregation)
      const salesTrend = this.aggregateSalesTrend(salesData, defaultStartDate, defaultEndDate);

      // Get seller profile for rating info
      const [sellerProfile] = await db
        .select()
        .from(productSellers)
        .where(eq(productSellers.sellerId, sellerId));

      return {
        totalSales,
        totalRevenue,
        activeProducts: sellerProducts.length,
        averageRating: parseFloat(sellerProfile?.rating || '0'),
        totalReviews: 0, // TODO: Calculate from product reviews
        lowStockProducts,
        outOfStockProducts,
        topSellingProducts,
        salesTrend
      };
    } catch (error) {
      console.error('Error getting seller analytics:', error);
      return this.getEmptySellerAnalytics();
    }
  }

  // Set restock reminder for low inventory
  async setRestockReminder(productId: string, restockDate: Date): Promise<void> {
    try {
      await db
        .update(inventoryTracking)
        .set({
          restockDate,
          lastUpdated: new Date()
        })
        .where(eq(inventoryTracking.productId, productId));
    } catch (error) {
      console.error('Error setting restock reminder:', error);
      throw error;
    }
  }

  // Get inventory value for accounting
  async getInventoryValue(sellerId?: string): Promise<{ totalValue: number; totalProducts: number; totalUnits: number }> {
    try {
      let query = db
        .select({
          totalValue: sql<number>`sum(cast(${products.price} as numeric) * ${inventoryTracking.currentStock})`,
          totalProducts: sql<number>`count(distinct ${products.id})`,
          totalUnits: sql<number>`sum(${inventoryTracking.currentStock})`
        })
        .from(inventoryTracking)
        .innerJoin(products, eq(inventoryTracking.productId, products.id))
        .where(eq(products.isActive, true));

      if (sellerId) {
        query = query
          .innerJoin(productSellers, eq(products.id, productSellers.sellerId))
          .where(
            and(
              eq(products.isActive, true),
              eq(productSellers.sellerId, sellerId)
            )
          );
      }

      const [result] = await query.execute();

      return {
        totalValue: result?.totalValue || 0,
        totalProducts: result?.totalProducts || 0,
        totalUnits: result?.totalUnits || 0
      };
    } catch (error) {
      console.error('Error calculating inventory value:', error);
      return { totalValue: 0, totalProducts: 0, totalUnits: 0 };
    }
  }

  // Private helper methods

  private async checkLowStockAlert(inventory: InventoryTracking): Promise<void> {
    if (inventory.currentStock <= inventory.lowStockThreshold) {
      // Get product and seller info
      const [productInfo] = await db
        .select({
          productName: products.name,
          sellerId: productSellers.sellerId
        })
        .from(products)
        .leftJoin(productSellers, eq(products.id, productSellers.sellerId))
        .where(eq(products.id, inventory.productId));

      if (productInfo?.sellerId) {
        // Send low stock notification to seller
        await db.insert(notifications).values({
          userId: productInfo.sellerId,
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${productInfo.productName} is running low on stock (${inventory.currentStock} units remaining)`,
          isRead: false
        });
      }
    }
  }

  private aggregateSalesTrend(
    salesData: any[], 
    startDate: Date, 
    endDate: Date
  ): Array<{ date: Date; sales: number; revenue: number }> {
    const dailySales = new Map<string, { sales: number; revenue: number }>();
    
    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailySales.set(dateStr, { sales: 0, revenue: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate sales by date
    salesData.forEach(sale => {
      const dateStr = new Date(sale.orderDate).toISOString().split('T')[0];
      const existing = dailySales.get(dateStr);
      if (existing) {
        existing.sales += 1;
        existing.revenue += sale.totalRevenue || 0;
      }
    });

    return Array.from(dailySales.entries()).map(([dateStr, data]) => ({
      date: new Date(dateStr),
      sales: data.sales,
      revenue: data.revenue
    }));
  }

  private getEmptySellerAnalytics(): SellerAnalytics {
    return {
      totalSales: 0,
      totalRevenue: 0,
      activeProducts: 0,
      averageRating: 0,
      totalReviews: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      topSellingProducts: [],
      salesTrend: []
    };
  }
}

export const inventoryService = new InventoryService();