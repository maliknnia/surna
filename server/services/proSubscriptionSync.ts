import Stripe from "stripe";
import {
  ensureProEntitlementTables,
  getUserEntitlement,
  upsertUserEntitlement,
  revokeUserEntitlement,
  isActiveProUserEntitlement,
} from "../infrastructure/proEntitlements";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

type SubscriptionWithPeriod = Stripe.Subscription & { current_period_end?: number };

function subscriptionUserId(subscription: Stripe.Subscription): string | null {
  return subscription.metadata?.userId || null;
}

function isPaidSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

export async function syncStripeSubscription(subscription: Stripe.Subscription): Promise<void> {
  await ensureProEntitlementTables().catch(() => {});
  const userId = subscriptionUserId(subscription);
  if (!userId) {
    console.warn("[pro-sync] subscription missing metadata.userId", subscription.id);
    return;
  }

  if (isPaidSubscriptionStatus(subscription.status)) {
    const periodEnd = (subscription as SubscriptionWithPeriod).current_period_end;
    const expiresAt = periodEnd ? new Date(periodEnd * 1000) : null;
    await upsertUserEntitlement({
      userId,
      plan: "pro",
      stripeSubscriptionId: subscription.id,
    });
    if (expiresAt) {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`
        UPDATE pro_user_entitlements
        SET expires_at = ${expiresAt}, status = 'active', plan = 'pro'
        WHERE user_id = ${userId}
      `);
    }
    return;
  }

  if (["canceled", "unpaid", "past_due", "incomplete_expired"].includes(subscription.status)) {
    await revokeUserEntitlement(userId);
  }
}

export async function syncCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  await ensureProEntitlementTables().catch(() => {});
  const userId = session.metadata?.userId;
  if (!userId || session.mode !== "subscription") return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return;

  const stripe = stripeClient();
  if (!stripe) {
    await upsertUserEntitlement({ userId, plan: "pro" });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncStripeSubscription(subscription);
}

export async function activateProFromCheckoutSession(
  sessionId: string,
  expectedUserId: string,
): Promise<{ active: boolean; plan: string }> {
  await ensureProEntitlementTables().catch(() => {});

  const stripe = stripeClient();
  if (!stripe) {
    await upsertUserEntitlement({ userId: expectedUserId, plan: "pro" });
    return { active: true, plan: "pro" };
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const sessionUserId = session.metadata?.userId;
  if (sessionUserId && sessionUserId !== expectedUserId) {
    throw new Error("Checkout session does not belong to this user");
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("Checkout session is not paid yet");
  }

  await syncCheckoutSessionCompleted(session);

  const ent = await getUserEntitlement(expectedUserId);
  return {
    active: isActiveProUserEntitlement(ent),
    plan: ent?.plan ?? "free",
  };
}
