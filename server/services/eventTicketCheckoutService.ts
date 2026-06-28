import Stripe from "stripe";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { BadRequest, NotFound } from "../core/errors";
import * as repo from "../features/events/events.repo";
import { rsvpAfterTicketPayment } from "../features/events/events.service";
import { getEventTicketPrice } from "@shared/eventTicketPricing";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("placeholder")) return null;
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

export function isEventTicketCheckoutAvailable(): boolean {
  return stripeClient() != null;
}

export async function createEventTicketOrder(
  eventId: string,
  userId: string,
  amountCents: number,
  sessionId?: string,
) {
  await repo.ensureEventTicketOrdersTable();
  const q = await db.execute(sql`
    INSERT INTO event_ticket_orders (event_id, user_id, amount_cents, stripe_checkout_session_id, status)
    VALUES (${eventId}, ${userId}, ${amountCents}, ${sessionId ?? null}, 'pending')
    RETURNING *;
  `);
  return q.rows[0] as { id: string };
}

export async function createEventTicketCheckout(params: {
  eventId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string; orderId: string }> {
  const stripe = stripeClient();
  if (!stripe) {
    throw BadRequest("Online ticket sales are not configured yet");
  }

  await repo.ensureEventsCompatTables();
  await repo.ensureEventTicketOrdersTable();

  const ev = await repo.getEvent(params.eventId);
  if (!ev) throw NotFound("Event not found");

  const price = getEventTicketPrice(ev as Record<string, unknown>);
  if (price == null) {
    throw BadRequest("This event does not sell paid tickets — RSVP for free instead");
  }

  if ((ev as { status?: string }).status && (ev as { status?: string }).status !== "active") {
    throw BadRequest("Event is not accepting ticket sales");
  }

  const capacity = (ev as { capacity?: number }).capacity;
  if (capacity) {
    const going = await repo.countGoing(params.eventId);
    if (going >= capacity) {
      throw BadRequest("Event is sold out");
    }
  }

  const existingRsvp = await repo.getUserRSVP(params.eventId, params.userId);
  if (existingRsvp?.status === "going") {
    throw BadRequest("You already have a ticket for this event");
  }

  const amountCents = Math.round(price * 100);
  const title = String((ev as { title?: string }).title ?? "Event ticket");

  const order = await createEventTicketOrder(params.eventId, params.userId, amountCents);

  const successUrl = params.successUrl.includes("session_id=")
    ? params.successUrl
    : `${params.successUrl}${params.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}&event_id=${params.eventId}&order_id=${order.id}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `${title} — ticket`,
            description: "One entry · scan at the door",
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      type: "event_ticket",
      eventId: params.eventId,
      userId: params.userId,
      orderId: order.id,
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  await db.execute(sql`
    UPDATE event_ticket_orders
       SET stripe_checkout_session_id = ${session.id}
     WHERE id = ${order.id};
  `);

  return { url: session.url, sessionId: session.id, orderId: order.id };
}

export async function fulfillEventTicketCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const md = session.metadata ?? {};
  if (md.type !== "event_ticket" || !md.eventId || !md.userId || !md.orderId) return;
  if (session.payment_status !== "paid" && session.status !== "complete") return;

  await repo.ensureEventTicketOrdersTable();

  const orderQ = await db.execute(sql`
    SELECT * FROM event_ticket_orders WHERE id = ${md.orderId} LIMIT 1;
  `);
  const order = orderQ.rows[0] as { id: string; status?: string; event_id?: string; user_id?: string } | undefined;
  if (!order) {
    console.warn("[event-ticket] order missing for checkout", md.orderId);
    return;
  }

  if (order.status === "paid") return;

  await db.execute(sql`
    UPDATE event_ticket_orders
       SET status = 'paid',
           paid_at = COALESCE(paid_at, NOW()),
           stripe_checkout_session_id = ${session.id},
           stripe_payment_intent_id = ${typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null}
     WHERE id = ${order.id};
  `);

  await rsvpAfterTicketPayment(md.eventId, md.userId, order.id);

  try {
    const amountCents = session.amount_total ?? 0;
    const { AnalyticsService } = await import("../features/analytics/analytics.service");
    await AnalyticsService.logFact({
      kind: "event_ticket_purchase",
      actorType: "user",
      actorId: md.userId,
      targetType: "event",
      targetId: md.eventId,
      amountCents,
      currency: "EUR",
      meta: { orderId: order.id, sessionId: session.id },
    });
  } catch (err) {
    console.warn("[event-ticket] analytics skipped:", err);
  }

  console.log("[event-ticket] fulfilled order", order.id, session.id);
}

export async function activateEventTicketFromCheckout(
  sessionId: string,
  expectedUserId: string,
  expectedEventId?: string,
  expectedOrderId?: string,
): Promise<{ confirmed: boolean; eventId?: string; orderId?: string; ticket?: Record<string, unknown> }> {
  const stripe = stripeClient();
  if (!stripe) throw BadRequest("Payments not configured");

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const md = session.metadata ?? {};
  if (md.type !== "event_ticket") {
    throw BadRequest("Not an event ticket checkout");
  }
  if (md.userId && md.userId !== expectedUserId) {
    throw BadRequest("Checkout session does not belong to this user");
  }
  if (expectedEventId && md.eventId && md.eventId !== expectedEventId) {
    throw BadRequest("Event mismatch for this checkout");
  }
  if (expectedOrderId && md.orderId && md.orderId !== expectedOrderId) {
    throw BadRequest("Order mismatch for this checkout");
  }

  await fulfillEventTicketCheckout(session);

  const eventId = md.eventId ?? expectedEventId;
  const orderId = md.orderId ?? expectedOrderId;

  const orderQ = await db.execute(sql`
    SELECT status FROM event_ticket_orders WHERE id = ${orderId ?? ""} LIMIT 1;
  `);
  const paid = (orderQ.rows[0] as { status?: string } | undefined)?.status === "paid";

  let ticket: Record<string, unknown> | undefined;
  if (paid && eventId) {
    const { getMyEventTicket } = await import("../features/events/events.tickets");
    ticket = (await getMyEventTicket(eventId, expectedUserId)) ?? undefined;
  }

  return { confirmed: paid, eventId, orderId, ticket };
}
