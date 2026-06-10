import { db } from "../db";
import { sql } from "drizzle-orm";
import { cacheAside, cacheDel, cacheKey, TTL } from "./cache";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete";

export type EntitlementScope = "user" | "team";

export interface Entitlement {
  id: string;
  ownerId: string;
  ownerType: EntitlementScope;
  plan: string;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  features: Record<string, any>;
  gracePeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentEvent {
  id: string;
  entitlementId: string;
  stripeEventId: string;
  eventType: string;
  payload: Record<string, any>;
  processedAt: Date;
}

const GRACE_PERIOD_DAYS = 7;

export async function ensureEntitlementTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS entitlements (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id VARCHAR NOT NULL,
      owner_type VARCHAR NOT NULL DEFAULT 'user',
      plan VARCHAR NOT NULL DEFAULT 'free',
      status VARCHAR NOT NULL DEFAULT 'active',
      stripe_customer_id VARCHAR,
      stripe_subscription_id VARCHAR UNIQUE,
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      cancel_at_period_end BOOLEAN DEFAULT false,
      features JSONB DEFAULT '{}',
      grace_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_entitlements_owner ON entitlements(owner_id, owner_type);
    CREATE INDEX IF NOT EXISTS idx_entitlements_stripe ON entitlements(stripe_subscription_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_events (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      entitlement_id VARCHAR REFERENCES entitlements(id),
      stripe_event_id VARCHAR UNIQUE NOT NULL,
      event_type VARCHAR NOT NULL,
      payload JSONB DEFAULT '{}',
      processed_at TIMESTAMP DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_payment_events_entitlement ON payment_events(entitlement_id);
    CREATE INDEX IF NOT EXISTS idx_payment_events_stripe ON payment_events(stripe_event_id);
  `);
}

export async function getEntitlement(ownerId: string, ownerType: EntitlementScope = "user"): Promise<Entitlement | null> {
  return cacheAside(
    cacheKey("entitlement", ownerType, ownerId),
    TTL.ENTITLEMENTS,
    async () => {
      const result = await db.execute(sql`
        SELECT id, owner_id AS "ownerId", owner_type AS "ownerType", plan, status,
               stripe_customer_id AS "stripeCustomerId", stripe_subscription_id AS "stripeSubscriptionId",
               current_period_start AS "currentPeriodStart", current_period_end AS "currentPeriodEnd",
               cancel_at_period_end AS "cancelAtPeriodEnd", features,
               grace_period_end AS "gracePeriodEnd", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM entitlements WHERE owner_id = ${ownerId} AND owner_type = ${ownerType}
        ORDER BY created_at DESC LIMIT 1
      `);
      return (result.rows[0] as unknown as Entitlement) || null;
    }
  );
}

export async function upsertEntitlement(data: {
  ownerId: string;
  ownerType: EntitlementScope;
  plan: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  features?: Record<string, any>;
}): Promise<Entitlement> {
  const gracePeriodEnd = data.status === "past_due"
    ? new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    : null;

  const result = await db.execute(sql`
    INSERT INTO entitlements (owner_id, owner_type, plan, status, stripe_customer_id, stripe_subscription_id,
      current_period_start, current_period_end, cancel_at_period_end, features, grace_period_end, updated_at)
    VALUES (${data.ownerId}, ${data.ownerType}, ${data.plan}, ${data.status},
      ${data.stripeCustomerId || null}, ${data.stripeSubscriptionId || null},
      ${data.currentPeriodStart || null}, ${data.currentPeriodEnd || null},
      ${data.cancelAtPeriodEnd ?? false}, ${JSON.stringify(data.features || {})}::jsonb,
      ${gracePeriodEnd}, now())
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      plan = EXCLUDED.plan, status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      features = EXCLUDED.features,
      grace_period_end = EXCLUDED.grace_period_end,
      updated_at = now()
    RETURNING id, owner_id AS "ownerId", owner_type AS "ownerType", plan, status,
      stripe_customer_id AS "stripeCustomerId", stripe_subscription_id AS "stripeSubscriptionId",
      current_period_start AS "currentPeriodStart", current_period_end AS "currentPeriodEnd",
      cancel_at_period_end AS "cancelAtPeriodEnd", features,
      grace_period_end AS "gracePeriodEnd", created_at AS "createdAt", updated_at AS "updatedAt"
  `);

  await cacheDel(cacheKey("entitlement", data.ownerType, data.ownerId));
  return result.rows[0] as unknown as Entitlement;
}

export async function recordPaymentEvent(entitlementId: string, stripeEventId: string, eventType: string, payload: any): Promise<void> {
  await db.execute(sql`
    INSERT INTO payment_events (entitlement_id, stripe_event_id, event_type, payload)
    VALUES (${entitlementId}, ${stripeEventId}, ${eventType}, ${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (stripe_event_id) DO NOTHING
  `);
}

export async function processStripeWebhook(event: any): Promise<void> {
  const sub = event.data?.object;
  if (!sub) return;

  const statusMap: Record<string, SubscriptionStatus> = {
    "customer.subscription.created": "active",
    "customer.subscription.updated": sub?.status as SubscriptionStatus || "active",
    "customer.subscription.deleted": "canceled",
    "customer.subscription.trial_will_end": "trialing",
    "invoice.payment_failed": "past_due",
    "invoice.paid": "active",
  };

  const status = statusMap[event.type];
  if (!status) return;

  const customerId = sub.customer || sub.customer_id;
  const subscriptionId = sub.id || sub.subscription;

  const existing = await db.execute(sql`
    SELECT id, owner_id, owner_type FROM entitlements
    WHERE stripe_customer_id = ${customerId} OR stripe_subscription_id = ${subscriptionId}
    LIMIT 1
  `);

  const owner = existing.rows[0] as any;
  if (!owner) return;

  const entitlement = await upsertEntitlement({
    ownerId: owner.owner_id,
    ownerType: owner.owner_type,
    plan: sub.items?.data?.[0]?.price?.lookup_key || sub.plan?.id || "pro",
    status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : undefined,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    features: buildFeatures(sub.items?.data?.[0]?.price?.lookup_key || "pro"),
  });

  await recordPaymentEvent(entitlement.id, event.id, event.type, event.data.object);
}

function buildFeatures(plan: string): Record<string, any> {
  const features: Record<string, Record<string, any>> = {
    free: { maxTeams: 2, maxMembers: 15, analytics: false, proModules: false, prioritySupport: false },
    pro: { maxTeams: 10, maxMembers: 100, analytics: true, proModules: true, prioritySupport: false },
    enterprise: { maxTeams: -1, maxMembers: -1, analytics: true, proModules: true, prioritySupport: true },
  };
  return features[plan] || features.free;
}

export function isEntitlementActive(ent: Entitlement | null): boolean {
  if (!ent) return false;
  if (ent.status === "active" || ent.status === "trialing") return true;
  if (ent.status === "past_due" && ent.gracePeriodEnd && new Date(ent.gracePeriodEnd) > new Date()) return true;
  return false;
}

export function hasFeature(ent: Entitlement | null, feature: string): boolean {
  if (!ent || !isEntitlementActive(ent)) return false;
  return !!ent.features[feature];
}
