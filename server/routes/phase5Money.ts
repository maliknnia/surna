import { Router } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import {
  createTeamBill,
  listTeamBills,
  startBillPayment,
  confirmBillPayment,
  getUserPaymentHistory,
  getMarketplaceOrderConfirmation,
  setCoachAvailability,
  getCoachAvailabilitySlots,
  submitCoachBookingReview,
} from "../services/phase5MoneyService";
import { ensurePhase5MoneyTables } from "../infrastructure/phase5Money";

export const moneyPhase5Router = Router();

function requireUserId(req: any, res: any): string | null {
  const id = resolveRequestUserId(req) ?? authUserId(req);
  if (!id) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return id;
}

/** POST /api/teams/:id/bills */
moneyPhase5Router.post("/teams/:id/bills", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({
        title: z.string().min(1).max(200),
        totalAmount: z.number().positive(),
        splitCount: z.number().int().min(1).max(50),
        messengerGroupId: z.string().optional(),
        memberIds: z.array(z.string()).optional(),
      })
      .parse(req.body);

    let memberIds = body.memberIds ?? [];
    if (memberIds.length === 0) {
      const members = await db.execute(sql`
        SELECT user_id FROM team_members
        WHERE team_id = ${req.params.id} AND status = 'active'
        LIMIT ${body.splitCount}
      `);
      memberIds = (members.rows as { user_id: string }[]).map((m) => m.user_id);
    }

    const { bill, shareAmount } = await createTeamBill({
      teamId: req.params.id,
      createdBy: userId,
      title: body.title,
      totalAmount: body.totalAmount,
      splitCount: body.splitCount,
      memberIds,
      messengerGroupId: body.messengerGroupId,
    });

    if (body.messengerGroupId) {
      try {
        const { messengerRepo } = await import("../features/messenger/messenger.repo");
        await messengerRepo.createGroupMessage({
          group_id: body.messengerGroupId,
          sender_id: userId,
          kind: "text",
          body: JSON.stringify({
            type: "bill_card",
            billId: bill.id,
            title: body.title,
            shareAmount,
            totalAmount: body.totalAmount,
            splitCount: body.splitCount,
          }),
        });
      } catch (err) {
        console.warn("[Phase5-1] Could not post bill card to messenger:", err);
      }
    }

    res.status(201).json({ bill, shareAmount });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create bill" });
  }
});

/** GET /api/teams/:id/bills */
moneyPhase5Router.get("/teams/:id/bills", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const bills = await listTeamBills(req.params.id);
    res.json({ bills });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to list bills" });
  }
});

/** POST /api/bills/:id/pay */
moneyPhase5Router.post("/bills/:id/pay", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({ paymentIntentId: z.string().optional(), confirm: z.boolean().optional() })
      .parse(req.body ?? {});

    if (body.paymentIntentId && body.confirm) {
      const result = await confirmBillPayment(req.params.id, userId, body.paymentIntentId);
      return res.json(result);
    }

    const checkout = await startBillPayment(req.params.id, userId);
    res.json(checkout);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(400).json({ message: err instanceof Error ? err.message : "Payment failed" });
  }
});

/** GET /api/users/me/payments */
moneyPhase5Router.get("/users/me/payments", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const payments = await getUserPaymentHistory(userId);
    res.json({ payments });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load payments" });
  }
});

/** GET /api/marketplace/orders/confirmation */
moneyPhase5Router.get("/marketplace/orders/confirmation", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const paymentIntentId = req.query.payment_intent as string;
  if (!paymentIntentId) return res.status(400).json({ message: "payment_intent required" });
  try {
    const order = await getMarketplaceOrderConfirmation(userId, paymentIntentId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load order" });
  }
});

/** GET /api/coaches/:id/availability-slots */
moneyPhase5Router.get("/coaches/:id/availability-slots", async (req, res) => {
  try {
    const slots = await getCoachAvailabilitySlots(req.params.id);
    res.json({ slots });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to load availability" });
  }
});

/** PUT /api/coaches/:id/availability-slots */
moneyPhase5Router.put("/coaches/:id/availability-slots", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const { storage } = await import("../storage");
    const coach = await storage.getCoachById(req.params.id);
    if (!coach || coach.userId !== userId) {
      return res.status(403).json({ message: "Only the coach can update availability" });
    }
    const body = z
      .object({
        slots: z.array(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string(),
            endTime: z.string(),
            hourlyRate: z.number().optional(),
          }),
        ),
      })
      .parse(req.body);
    await setCoachAvailability(coach.id, body.slots);
    res.json({ ok: true, slots: body.slots });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to save availability" });
  }
});

/** POST /api/coaches/bookings/:id/review */
moneyPhase5Router.post("/coaches/bookings/:id/review", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({ rating: z.number().int().min(1).max(5), text: z.string().max(2000).optional() })
      .parse(req.body);
    const result = await submitCoachBookingReview(req.params.id, userId, body.rating, body.text);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(400).json({ message: err instanceof Error ? err.message : "Failed to submit review" });
  }
});

export default moneyPhase5Router;
