import Stripe from "stripe";
import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { users, coaches, coachBookings, payments } from "@shared/schema";
import { ensurePhase5MoneyTables } from "../infrastructure/phase5Money";

const COACH_COMMISSION_RATE = 0.15;
const TOURNAMENT_COMMISSION_RATE = 0.05;

function stripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
}

export async function createTeamBill(params: {
  teamId: string;
  createdBy: string;
  title: string;
  totalAmount: number;
  splitCount: number;
  memberIds: string[];
  messengerGroupId?: string;
}) {
  await ensurePhase5MoneyTables();
  const share = Math.round((params.totalAmount / params.splitCount) * 100) / 100;

  const inserted = await db.execute(sql`
    INSERT INTO team_bills (team_id, created_by, title, total_amount, split_count, status, messenger_group_id)
    VALUES (${params.teamId}, ${params.createdBy}, ${params.title}, ${params.totalAmount}, ${params.splitCount}, 'open', ${params.messengerGroupId ?? null})
    RETURNING *
  `);
  const bill = inserted.rows[0] as Record<string, unknown>;
  const billId = String(bill.id);

  const payers = params.memberIds.length > 0 ? params.memberIds : [params.createdBy];
  for (const uid of payers.slice(0, params.splitCount)) {
    await db.execute(sql`
      INSERT INTO team_bill_payments (bill_id, user_id, amount, status)
      VALUES (${billId}, ${uid}, ${share}, 'pending')
      ON CONFLICT (bill_id, user_id) DO NOTHING
    `);
  }

  console.log("[Phase5-1] Team bill created:", billId, params.title);
  return { bill, shareAmount: share };
}

export async function listTeamBills(teamId: string) {
  await ensurePhase5MoneyTables();
  const bills = await db.execute(sql`
    SELECT b.*,
      (SELECT COUNT(*)::int FROM team_bill_payments p WHERE p.bill_id = b.id AND p.status = 'paid') AS paid_count,
      (SELECT COUNT(*)::int FROM team_bill_payments p WHERE p.bill_id = b.id) AS payer_count
    FROM team_bills b
    WHERE b.team_id = ${teamId}
    ORDER BY b.created_at DESC
    LIMIT 100
  `);
  return bills.rows;
}

export async function startBillPayment(billId: string, userId: string) {
  await ensurePhase5MoneyTables();
  const row = await db.execute(sql`
    SELECT p.*, b.title, b.status AS bill_status
    FROM team_bill_payments p
    JOIN team_bills b ON b.id = p.bill_id
    WHERE p.bill_id = ${billId} AND p.user_id = ${userId}
    LIMIT 1
  `);
  const payment = row.rows[0] as Record<string, unknown> | undefined;
  if (!payment) throw new Error("Bill share not found for this user");
  if (payment.status === "paid") throw new Error("Already paid");

  const amountCents = Math.round(Number(payment.amount) * 100);
  const stripe = stripeClient();
  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "eur",
    automatic_payment_methods: { enabled: true },
    metadata: {
      userId,
      billId,
      paymentType: "team_bill",
    },
  });

  await db.execute(sql`
    UPDATE team_bill_payments
    SET stripe_payment_intent_id = ${pi.id}
    WHERE bill_id = ${billId} AND user_id = ${userId}
  `);

  return { clientSecret: pi.client_secret, amount: Number(payment.amount), title: payment.title };
}

export async function confirmBillPayment(billId: string, userId: string, paymentIntentId: string) {
  await ensurePhase5MoneyTables();
  const stripe = stripeClient();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") throw new Error("Payment not completed");
  if (pi.metadata?.billId !== billId || pi.metadata?.userId !== userId) {
    throw new Error("Payment does not match this bill");
  }

  await db.execute(sql`
    UPDATE team_bill_payments
    SET status = 'paid', paid_at = now(), stripe_payment_intent_id = ${paymentIntentId}
    WHERE bill_id = ${billId} AND user_id = ${userId}
  `);

  await db.insert(payments).values({
    amount: String((pi.amount ?? 0) / 100),
    currency: (pi.currency ?? "eur").toUpperCase(),
    status: "completed",
    paymentMethod: "stripe",
    transactionId: paymentIntentId,
    metadata: { kind: "team_bill", billId, userId },
  });

  const counts = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS paid
    FROM team_bill_payments WHERE bill_id = ${billId}
  `);
  const c = counts.rows[0] as { total: number; paid: number };
  if (c.paid >= c.total) {
    await db.execute(sql`UPDATE team_bills SET status = 'settled' WHERE id = ${billId}`);
  }

  console.log("[Phase5-1] Bill payment confirmed:", billId, userId);
  return { paid: true };
}

export async function getUserPaymentHistory(userId: string) {
  await ensurePhase5MoneyTables();
  const items: Array<{
    id: string;
    type: string;
    title: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }> = [];

  const marketplace = await db.execute(sql`
    SELECT o.id, o.total, o.status, o.created_at
    FROM orders o
    WHERE o.user_id = ${userId}
    ORDER BY o.created_at DESC
    LIMIT 50
  `);
  for (const r of marketplace.rows as Record<string, unknown>[]) {
    items.push({
      id: String(r.id),
      type: "marketplace",
      title: "Marketplace purchase",
      amount: Number(r.total ?? 0),
      currency: "EUR",
      status: String(r.status ?? "paid"),
      createdAt: String(r.created_at),
    });
  }

  const bills = await db.execute(sql`
    SELECT p.id, p.amount, p.status, p.paid_at, b.title
    FROM team_bill_payments p
    JOIN team_bills b ON b.id = p.bill_id
    WHERE p.user_id = ${userId} AND p.status = 'paid'
    ORDER BY p.paid_at DESC NULLS LAST
    LIMIT 50
  `);
  for (const r of bills.rows as Record<string, unknown>[]) {
    items.push({
      id: String(r.id),
      type: "team_bill",
      title: String(r.title ?? "Team split"),
      amount: Number(r.amount ?? 0),
      currency: "EUR",
      status: "paid",
      createdAt: String(r.paid_at ?? new Date().toISOString()),
    });
  }

  const coachRows = await db.execute(sql`
    SELECT cb.id, cb.amount, cb.status, cb.session_date, cb.created_at, cb.review_rating
    FROM coach_bookings cb
    WHERE cb.user_id = ${userId}
    ORDER BY cb.created_at DESC
    LIMIT 50
  `);
  for (const r of coachRows.rows as Record<string, unknown>[]) {
    items.push({
      id: String(r.id),
      type: "coach_booking",
      title: "Coach session",
      amount: Number(r.amount ?? 0),
      currency: "EUR",
      status: String(r.status ?? "pending"),
      createdAt: String(r.created_at),
      metadata: { sessionDate: r.session_date, reviewRating: r.review_rating },
    });
  }

  const tournaments = await db.execute(sql`
    SELECT te.id, te.entry_fee_cents, te.platform_fee_cents, te.status, te.created_at, te.tournament_id
    FROM tournament_entries te
    WHERE te.user_id = ${userId}
    ORDER BY te.created_at DESC
    LIMIT 50
  `);
  for (const r of tournaments.rows as Record<string, unknown>[]) {
    items.push({
      id: String(r.id),
      type: "tournament_entry",
      title: "Tournament entry",
      amount: Number(r.entry_fee_cents ?? 0) / 100,
      currency: "EUR",
      status: String(r.status ?? "pending"),
      createdAt: String(r.created_at),
      metadata: { tournamentId: r.tournament_id, platformFee: Number(r.platform_fee_cents ?? 0) / 100 },
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  console.log("[Phase5-2] Payment history for", userId, items.length, "items");
  return items.slice(0, 100);
}

export async function fulfillMarketplaceOrderFulfilled(stripePaymentIntentId: string, userId: string) {
  const { fulfillMarketplacePayment } = await import("../features/marketplace/marketplace.repo");
  const result = await fulfillMarketplacePayment(stripePaymentIntentId, userId);
  if (!result) return null;

  await db.execute(sql`
    UPDATE orders SET status = 'fulfilled', updated_at = NOW()
    WHERE id = ${result.orderId} AND status IN ('paid', 'pending')
  `);

  console.log("[Phase5-3] Marketplace order fulfilled:", result.orderId);
  return result;
}

export async function getMarketplaceOrderConfirmation(userId: string, paymentIntentId: string) {
  const q = await db.execute(sql`
    SELECT o.id, o.total AS total_amount, o.status, o.created_at,
      (SELECT json_agg(json_build_object(
        'title', COALESCE(oi.title, p.title, 'Item'),
        'qty', COALESCE(oi.quantity, 1),
        'price', oi.price
      ))
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = o.id) AS items
    FROM orders o
    WHERE o.user_id = ${userId}
      AND o.shipping_address->>'paymentIntentId' = ${paymentIntentId}
    LIMIT 1
  `);
  return (q.rows[0] as Record<string, unknown>) ?? null;
}

export async function setCoachAvailability(
  coachId: string,
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string; hourlyRate?: number }>,
) {
  await ensurePhase5MoneyTables();
  await db.execute(sql`DELETE FROM coach_availability WHERE coach_id = ${coachId}`);
  for (const s of slots) {
    await db.execute(sql`
      INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, hourly_rate)
      VALUES (${coachId}, ${s.dayOfWeek}, ${s.startTime}, ${s.endTime}, ${s.hourlyRate ?? null})
    `);
  }
  console.log("[Phase5-4] Coach availability saved:", coachId, slots.length, "slots");
}

export async function getCoachAvailabilitySlots(coachId: string) {
  await ensurePhase5MoneyTables();
  const q = await db.execute(sql`
    SELECT id, day_of_week, start_time, end_time, hourly_rate, is_active
    FROM coach_availability WHERE coach_id = ${coachId} AND is_active = true
    ORDER BY day_of_week, start_time
  `);
  return q.rows;
}

export function applyCoachCommission(grossAmount: number): { platformFee: number; coachPayout: number } {
  const platformFee = Math.round(grossAmount * COACH_COMMISSION_RATE * 100) / 100;
  const coachPayout = Math.round((grossAmount - platformFee) * 100) / 100;
  return { platformFee, coachPayout };
}

export async function recordCoachBookingCommission(bookingId: string, grossAmount: number) {
  const { platformFee, coachPayout } = applyCoachCommission(grossAmount);
  await db
    .update(coachBookings)
    .set({
      platformFee: platformFee.toFixed(2),
      coachPayout: coachPayout.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(coachBookings.id, bookingId));
  console.log("[Phase5-4] Coach commission recorded:", bookingId, { platformFee, coachPayout });
  return { platformFee, coachPayout };
}

export async function submitCoachBookingReview(
  bookingId: string,
  userId: string,
  rating: number,
  text?: string,
) {
  const [booking] = await db.select().from(coachBookings).where(eq(coachBookings.id, bookingId)).limit(1);
  if (!booking || booking.userId !== userId) throw new Error("Booking not found");
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    throw new Error("Can only review confirmed sessions");
  }
  await db
    .update(coachBookings)
    .set({
      status: "completed",
      reviewRating: rating,
      reviewText: text ?? null,
      updatedAt: new Date(),
    })
    .where(eq(coachBookings.id, bookingId));
  console.log("[Phase5-4] Coach review submitted:", bookingId);
  return { ok: true };
}

export function applyTournamentCommission(feeCents: number): { platformFeeCents: number; netCents: number } {
  const platformFeeCents = Math.floor(feeCents * TOURNAMENT_COMMISSION_RATE);
  return { platformFeeCents, netCents: feeCents - platformFeeCents };
}

export async function recordTournamentEntry(params: {
  tournamentId: string;
  teamId: string;
  userId: string;
  entryFeeCents: number;
  paymentIntentId?: string;
}) {
  await ensurePhase5MoneyTables();
  const { platformFeeCents } = applyTournamentCommission(params.entryFeeCents);
  const inserted = await db.execute(sql`
    INSERT INTO tournament_entries (tournament_id, team_id, user_id, entry_fee_cents, platform_fee_cents, payment_intent_id, status)
    VALUES (${params.tournamentId}, ${params.teamId}, ${params.userId}, ${params.entryFeeCents}, ${platformFeeCents}, ${params.paymentIntentId ?? null}, ${params.paymentIntentId ? "paid" : "pending"})
    ON CONFLICT (tournament_id, team_id) DO UPDATE SET
      payment_intent_id = COALESCE(EXCLUDED.payment_intent_id, tournament_entries.payment_intent_id),
      entry_fee_cents = EXCLUDED.entry_fee_cents,
      platform_fee_cents = EXCLUDED.platform_fee_cents,
      status = EXCLUDED.status
    RETURNING *
  `);
  console.log("[Phase5-5] Tournament entry recorded:", params.tournamentId, platformFeeCents, "platform fee cents");
  return inserted.rows[0];
}
