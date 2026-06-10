import { Router } from "express";
import { db } from "../db";
import { productSellers, products, orders } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requirePermission, getClientIp, getUserAgent, type AdminRequest } from "./admin.middleware";
import { AuditService } from "./audit.service";
import { z } from "zod";

export const adminMarketplaceRouter = Router();

// ============================================================================
// SHOP MODERATION
// ============================================================================

adminMarketplaceRouter.post("/shops/:shopId/verify", requirePermission('shop:verify'), async (req: AdminRequest, res) => {
  try {
    const { shopId } = req.params;

    const [shop] = await db.select().from(productSellers).where(eq(productSellers.id, shopId)).limit(1);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    await db
      .update(productSellers)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(productSellers.id, shopId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'shop.verify',
      targetType: 'shop',
      targetId: shopId,
      before: { isVerified: shop.isVerified },
      after: { isVerified: true },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Shop verified successfully" });
  } catch (error: any) {
    console.error("Verify shop error:", error);
    res.status(500).json({ message: "Failed to verify shop" });
  }
});

const suspendShopSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

adminMarketplaceRouter.post("/shops/:shopId/suspend", requirePermission('shop:remove'), async (req: AdminRequest, res) => {
  try {
    const { shopId } = req.params;
    const { reason } = suspendShopSchema.parse(req.body);

    const [shop] = await db.select().from(productSellers).where(eq(productSellers.id, shopId)).limit(1);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    await db
      .update(productSellers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(productSellers.id, shopId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'shop.suspend',
      targetType: 'shop',
      targetId: shopId,
      reason,
      before: { isActive: shop.isActive },
      after: { isActive: false },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Shop suspended successfully" });
  } catch (error: any) {
    console.error("Suspend shop error:", error);
    res.status(500).json({ message: error.message || "Failed to suspend shop" });
  }
});

// ============================================================================
// PRODUCT MODERATION
// ============================================================================

const removeProductSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

adminMarketplaceRouter.post("/products/:productId/remove", requirePermission('shop:remove'), async (req: AdminRequest, res) => {
  try {
    const { productId } = req.params;
    const { reason } = removeProductSchema.parse(req.body);

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await db.delete(products).where(eq(products.id, productId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'product.remove',
      targetType: 'product',
      targetId: productId,
      reason,
      before: product,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Product removed successfully" });
  } catch (error: any) {
    console.error("Remove product error:", error);
    res.status(500).json({ message: error.message || "Failed to remove product" });
  }
});

// ============================================================================
// ORDER MODERATION
// ============================================================================

const refundOrderSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  amount: z.number().optional(),
});

adminMarketplaceRouter.post("/orders/:orderId/refund", requirePermission('order:refund'), async (req: AdminRequest, res) => {
  try {
    const { orderId } = req.params;
    const { reason, amount } = refundOrderSchema.parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const refundAmount = amount || parseFloat(order.total || "0");

    await db
      .update(orders)
      .set({ 
        status: 'refunded',
        updatedAt: new Date() 
      })
      .where(eq(orders.id, orderId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'order.refund',
      targetType: 'order',
      targetId: orderId,
      reason,
      before: { status: order.status, total: order.total },
      after: { status: 'refunded', refundAmount },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { refundAmount },
    });

    res.json({ message: "Order refunded successfully", refundAmount });
  } catch (error: any) {
    console.error("Refund order error:", error);
    res.status(500).json({ message: error.message || "Failed to refund order" });
  }
});

adminMarketplaceRouter.get("/shops/pending", requirePermission('shop:read'), async (req: AdminRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string || "50");
    const offset = parseInt(req.query.offset as string || "0");

    const pendingShops = await db
      .select()
      .from(productSellers)
      .where(eq(productSellers.isVerified, false))
      .orderBy(desc(productSellers.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ shops: pendingShops });
  } catch (error: any) {
    console.error("Pending shops error:", error);
    res.status(500).json({ message: "Failed to fetch pending shops" });
  }
});
