import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { placeBookings, places, users } from "@shared/schema";
import { storage } from "../storage";
import { ensurePlaceMembershipPlans } from "../features/places/places.compat";
import { BadRequest, NotFound } from "../core/errors";
import type { PlaceMembershipPlan } from "@shared/schema";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("placeholder")) return null;
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

function checkoutMode(plan: PlaceMembershipPlan): "payment" | "subscription" {
  const interval = plan.billingInterval ?? "monthly";
  return interval === "monthly" || interval === "annual" ? "subscription" : "payment";
}

function lineItemForPlan(
  placeName: string,
  plan: PlaceMembershipPlan,
): Stripe.Checkout.SessionCreateParams.LineItem {
  if (plan.stripePriceId) {
    return { price: plan.stripePriceId, quantity: 1 };
  }

  const amount = Math.round(parseFloat(String(plan.price)) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw BadRequest("Plan price must be greater than zero for online checkout");
  }

  const recurring =
    plan.billingInterval === "annual"
      ? { interval: "year" as const }
      : plan.billingInterval === "monthly"
        ? { interval: "month" as const }
        : undefined;

  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: amount,
      product_data: {
        name: `${placeName} — ${plan.name}`,
        description: plan.description ?? undefined,
      },
      ...(recurring ? { recurring } : {}),
    },
  };
}

export async function createPlaceMembershipCheckout(params: {
  placeId: string;
  planId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string; bookingId: string }> {
  const stripe = stripeClient();
  if (!stripe) {
    throw BadRequest("Online payments are not configured — use Enquire to join instead");
  }

  await ensurePlaceMembershipPlans();

  const plan = await storage.getPlaceMembershipPlan(params.planId, params.placeId);
  if (!plan || !plan.isActive) {
    throw NotFound("Membership plan not found");
  }

  const [place] = await db.select().from(places).where(eq(places.id, params.placeId)).limit(1);
  if (!place) throw NotFound("Place not found");
  if ((place.bookingMode ?? "request") !== "membership") {
    throw BadRequest("This venue does not sell memberships online");
  }

  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, params.userId)).limit(1);

  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 1);

  const booking = await storage.createPlaceBooking(params.userId, {
    userId: params.userId,
    placeId: params.placeId,
    membershipPlanId: plan.id,
    bookingType: "membership",
    title: `${place.name} — ${plan.name}`,
    description: plan.description ?? undefined,
    startTime: now,
    endTime: end,
    status: "pending",
    paymentStatus: "unpaid",
    price: plan.price != null ? String(plan.price) : undefined,
  });

  const mode = checkoutMode(plan);
  const successUrl = params.successUrl.includes("session_id=")
    ? params.successUrl
    : `${params.successUrl}${params.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}&place_id=${params.placeId}`;

  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ["card"],
    line_items: [lineItemForPlan(place.name, plan)],
    success_url: successUrl,
    cancel_url: params.cancelUrl,
    customer_email: user?.email ?? undefined,
    metadata: {
      type: "place_membership",
      placeId: params.placeId,
      planId: plan.id,
      userId: params.userId,
      bookingId: booking.id,
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  await storage.updatePlaceBooking(booking.id, {
    stripeCheckoutSessionId: session.id,
  });

  return { url: session.url, sessionId: session.id, bookingId: booking.id };
}

export async function fulfillPlaceMembershipCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const md = session.metadata ?? {};
  if (md.type !== "place_membership" || !md.bookingId) return;

  if (session.payment_status !== "paid" && session.status !== "complete") return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const [existing] = await db
    .select()
    .from(placeBookings)
    .where(eq(placeBookings.id, md.bookingId))
    .limit(1);

  if (!existing) {
    console.warn("[place-membership] booking missing for checkout", md.bookingId);
    return;
  }

  if (existing.paymentStatus === "paid" && existing.status === "confirmed") {
    return;
  }

  await storage.updatePlaceBooking(md.bookingId, {
    status: "confirmed",
    paymentStatus: "paid",
    stripeCheckoutSessionId: session.id,
    stripeSubscriptionId: subscriptionId ?? undefined,
  });

  console.log("[place-membership] fulfilled booking", md.bookingId, session.id);
}

export async function activatePlaceMembershipFromCheckout(
  sessionId: string,
  expectedUserId: string,
  expectedBookingId?: string,
): Promise<{ confirmed: boolean; placeId?: string; bookingId?: string }> {
  const stripe = stripeClient();
  if (!stripe) {
    throw BadRequest("Payments not configured");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const md = session.metadata ?? {};
  if (md.type !== "place_membership") {
    throw BadRequest("Not a venue membership checkout");
  }

  if (md.userId && md.userId !== expectedUserId) {
    throw BadRequest("Checkout session does not belong to this user");
  }

  if (expectedBookingId && md.bookingId && md.bookingId !== expectedBookingId) {
    throw BadRequest("Booking mismatch for this checkout");
  }

  await fulfillPlaceMembershipCheckout(session);

  const [booking] = await db
    .select()
    .from(placeBookings)
    .where(eq(placeBookings.id, md.bookingId ?? expectedBookingId ?? ""))
    .limit(1);

  return {
    confirmed: booking?.paymentStatus === "paid",
    placeId: md.placeId ?? booking?.placeId,
    bookingId: booking?.id,
  };
}

export function isPlaceMembershipCheckoutAvailable(): boolean {
  return stripeClient() != null;
}
