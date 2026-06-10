import { Router } from "express";
import { db } from "../db";
import { wallets, payments, orders } from "@shared/schema";
import { eq, sql, desc, gte, and } from "drizzle-orm";
import { requirePermission, getClientIp, getUserAgent, type AdminRequest } from "./admin.middleware";
import { AuditService } from "./audit.service";
import { z } from "zod";

export const adminPaymentsRouter = Router();

// ============================================================================
// WALLET EXPLORER
// ============================================================================

adminPaymentsRouter.get("/wallets/:ownerId", requirePermission('payments:read'), async (req: AdminRequest, res) => {
  try {
    const { ownerId } = req.params;
    const ownerType = req.query.ownerType as string || 'user';

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.ownerType, ownerType), eq(wallets.ownerId, ownerId)))
      .limit(1);
    
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json({ wallet });
  } catch (error: any) {
    console.error("Wallet explorer error:", error);
    res.status(500).json({ message: "Failed to fetch wallet data" });
  }
});

adminPaymentsRouter.get("/wallets", requirePermission('payments:read'), async (req: AdminRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string || "50");
    const offset = parseInt(req.query.offset as string || "0");
    const minBalance = req.query.minBalance as string || "0";

    const walletsList = await db
      .select()
      .from(wallets)
      .where(gte(wallets.balance, minBalance))
      .orderBy(desc(wallets.balance))
      .limit(limit)
      .offset(offset);

    res.json({ wallets: walletsList });
  } catch (error: any) {
    console.error("Wallets list error:", error);
    res.status(500).json({ message: "Failed to fetch wallets" });
  }
});

// ============================================================================
// PAYOUT APPROVALS
// ============================================================================

const approvePayoutSchema = z.object({
  payoutId: z.string(),
  approved: z.boolean(),
  reason: z.string().optional(),
});

adminPaymentsRouter.post("/payouts/approve", requirePermission('payouts:approve'), async (req: AdminRequest, res) => {
  try {
    const { payoutId, approved, reason } = approvePayoutSchema.parse(req.body);

    const [payout] = await db.select().from(payments).where(eq(payments.id, payoutId)).limit(1);
    if (!payout) {
      return res.status(404).json({ message: "Payout not found" });
    }

    const newStatus = approved ? 'completed' : 'failed';

    await db
      .update(payments)
      .set({ 
        status: newStatus
      })
      .where(eq(payments.id, payoutId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: approved ? 'payout.approve' : 'payout.reject',
      targetType: 'payment',
      targetId: payoutId,
      reason,
      before: { status: payout.status },
      after: { status: newStatus },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: `Payout ${approved ? 'approved' : 'rejected'} successfully` });
  } catch (error: any) {
    console.error("Approve payout error:", error);
    res.status(500).json({ message: error.message || "Failed to process payout" });
  }
});

// ============================================================================
// REFUND APPROVALS
// ============================================================================

const approveRefundSchema = z.object({
  orderId: z.string(),
  amount: z.number(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

adminPaymentsRouter.post("/refunds/approve", requirePermission('refunds:approve'), async (req: AdminRequest, res) => {
  try {
    const { orderId, amount, reason } = approveRefundSchema.parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await db
      .update(orders)
      .set({ 
        status: 'refunded',
        updatedAt: new Date() 
      })
      .where(eq(orders.id, orderId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'refund.approve',
      targetType: 'order',
      targetId: orderId,
      reason,
      before: { status: order.status },
      after: { status: 'refunded', refundAmount: amount },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { refundAmount: amount },
    });

    res.json({ message: "Refund approved successfully", refundAmount: amount });
  } catch (error: any) {
    console.error("Approve refund error:", error);
    res.status(500).json({ message: error.message || "Failed to approve refund" });
  }
});

// ============================================================================
// PAYMENT STATS
// ============================================================================

adminPaymentsRouter.get("/stats", requirePermission('payments:read'), async (req: AdminRequest, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT
        (SELECT COALESCE(SUM(balance_cents), 0) FROM ${wallets}) as total_wallet_balance,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM ${payments} WHERE status = 'completed') as total_payments,
        (SELECT COUNT(*) FROM ${payments} WHERE status = 'pending') as pending_payments,
        (SELECT COUNT(*) FROM ${orders} WHERE status = 'refunded') as total_refunds
    `);

    res.json(stats.rows[0]);
  } catch (error: any) {
    console.error("Payment stats error:", error);
    res.status(500).json({ message: "Failed to fetch payment stats" });
  }
});
