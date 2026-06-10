import { db } from "../db";
import { sql } from "drizzle-orm";
import { cacheAside, cacheDel, cacheKey, TTL } from "./cache";

export type ProPlan = "free" | "pro" | "enterprise";

export interface ProTeamEntitlement {
  id: string;
  teamId: string;
  plan: ProPlan;
  billingOwnerId: string;
  managerIds: string[];
  maxMembers: number;
  enabledModules: string[];
  stripeSubscriptionId: string | null;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProUserEntitlement {
  id: string;
  userId: string;
  plan: ProPlan;
  maxTeams: number;
  features: Record<string, any>;
  stripeSubscriptionId: string | null;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
}

const MODULE_LIST = [
  "roster", "training", "match_day", "inventory",
  "schedule", "stats", "comms", "recruitment", "club",
] as const;

const PLAN_LIMITS: Record<ProPlan, { maxMembers: number; maxTeams: number; modules: string[] }> = {
  free: { maxMembers: 15, maxTeams: 1, modules: ["roster", "schedule"] },
  pro: { maxMembers: 100, maxTeams: 10, modules: [...MODULE_LIST] },
  enterprise: { maxMembers: -1, maxTeams: -1, modules: [...MODULE_LIST] },
};

export async function ensureProEntitlementTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pro_team_entitlements (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id VARCHAR NOT NULL UNIQUE,
      plan VARCHAR NOT NULL DEFAULT 'free',
      billing_owner_id VARCHAR NOT NULL,
      manager_ids TEXT[] DEFAULT '{}',
      max_members INTEGER DEFAULT 15,
      enabled_modules TEXT[] DEFAULT '{"roster","schedule"}',
      stripe_subscription_id VARCHAR,
      status VARCHAR DEFAULT 'active',
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_pro_team_ent ON pro_team_entitlements(team_id);
    CREATE INDEX IF NOT EXISTS idx_pro_team_billing ON pro_team_entitlements(billing_owner_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pro_user_entitlements (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL UNIQUE,
      plan VARCHAR NOT NULL DEFAULT 'free',
      max_teams INTEGER DEFAULT 1,
      features JSONB DEFAULT '{}',
      stripe_subscription_id VARCHAR,
      status VARCHAR DEFAULT 'active',
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_pro_user_ent ON pro_user_entitlements(user_id);
  `);
}

export async function getTeamEntitlement(teamId: string): Promise<ProTeamEntitlement | null> {
  return cacheAside(
    cacheKey("pro:team", teamId),
    TTL.ENTITLEMENTS,
    async () => {
      const result = await db.execute(sql`
        SELECT id, team_id AS "teamId", plan, billing_owner_id AS "billingOwnerId",
          manager_ids AS "managerIds", max_members AS "maxMembers",
          enabled_modules AS "enabledModules", stripe_subscription_id AS "stripeSubscriptionId",
          status, expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM pro_team_entitlements WHERE team_id = ${teamId}
      `);
      return (result.rows[0] as unknown as ProTeamEntitlement) || null;
    }
  );
}

/** Dev/demo: allow any signed-in user into Pro without a paid row. */
export function isProEntitlementOpenAccess(): boolean {
  return (
    process.env.PRO_ENTITLEMENT_OPEN === "1" ||
    process.env.LOCAL_AUTH_BYPASS === "1" ||
    process.env.NODE_ENV !== "production"
  );
}

/** True when the user row grants SURNA Pro product access (not the free tier). */
export function isActiveProUserEntitlement(ent: ProUserEntitlement | null): boolean {
  if (!ent) return false;
  if (ent.status !== "active") return false;
  if (ent.expiresAt && new Date(ent.expiresAt) < new Date()) return false;
  return ent.plan === "pro" || ent.plan === "enterprise";
}

export async function getUserEntitlement(userId: string): Promise<ProUserEntitlement | null> {
  return cacheAside(
    cacheKey("pro:user", userId),
    TTL.ENTITLEMENTS,
    async () => {
      const result = await db.execute(sql`
        SELECT id, user_id AS "userId", plan, max_teams AS "maxTeams", features,
          stripe_subscription_id AS "stripeSubscriptionId", status,
          expires_at AS "expiresAt", created_at AS "createdAt"
        FROM pro_user_entitlements WHERE user_id = ${userId}
      `);
      return (result.rows[0] as unknown as ProUserEntitlement) || null;
    }
  );
}

export async function upsertTeamEntitlement(data: {
  teamId: string;
  plan: ProPlan;
  billingOwnerId: string;
  managerIds?: string[];
  stripeSubscriptionId?: string;
}): Promise<ProTeamEntitlement> {
  const limits = PLAN_LIMITS[data.plan];
  const managerIds = data.managerIds || [];
  const enabledModules = limits.modules;
  const result = await db.execute(sql`
    INSERT INTO pro_team_entitlements (team_id, plan, billing_owner_id, manager_ids,
      max_members, enabled_modules, stripe_subscription_id, status, updated_at)
    VALUES (${data.teamId}, ${data.plan}, ${data.billingOwnerId},
      ${managerIds},
      ${limits.maxMembers}, ${enabledModules},
      ${data.stripeSubscriptionId || null}, 'active', now())
    ON CONFLICT (team_id) DO UPDATE SET
      plan = EXCLUDED.plan, billing_owner_id = EXCLUDED.billing_owner_id,
      manager_ids = EXCLUDED.manager_ids, max_members = EXCLUDED.max_members,
      enabled_modules = EXCLUDED.enabled_modules,
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, pro_team_entitlements.stripe_subscription_id),
      status = 'active', updated_at = now()
    RETURNING id, team_id AS "teamId", plan, billing_owner_id AS "billingOwnerId",
      manager_ids AS "managerIds", max_members AS "maxMembers",
      enabled_modules AS "enabledModules", stripe_subscription_id AS "stripeSubscriptionId",
      status, expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"
  `);
  await cacheDel(cacheKey("pro:team", data.teamId));
  return result.rows[0] as unknown as ProTeamEntitlement;
}

export async function upsertUserEntitlement(data: {
  userId: string;
  plan: ProPlan;
  stripeSubscriptionId?: string;
}): Promise<ProUserEntitlement> {
  const limits = PLAN_LIMITS[data.plan];
  const result = await db.execute(sql`
    INSERT INTO pro_user_entitlements (user_id, plan, max_teams, features, stripe_subscription_id, status)
    VALUES (${data.userId}, ${data.plan}, ${limits.maxTeams},
      ${JSON.stringify({ modules: limits.modules, maxMembers: limits.maxMembers })}::jsonb,
      ${data.stripeSubscriptionId || null}, 'active')
    ON CONFLICT (user_id) DO UPDATE SET
      plan = EXCLUDED.plan, max_teams = EXCLUDED.max_teams, features = EXCLUDED.features,
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, pro_user_entitlements.stripe_subscription_id),
      status = 'active'
    RETURNING id, user_id AS "userId", plan, max_teams AS "maxTeams", features,
      stripe_subscription_id AS "stripeSubscriptionId", status,
      expires_at AS "expiresAt", created_at AS "createdAt"
  `);
  await cacheDel(cacheKey("pro:user", data.userId));
  return result.rows[0] as unknown as ProUserEntitlement;
}

export async function revokeUserEntitlement(userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE pro_user_entitlements
    SET status = 'inactive', plan = 'free', expires_at = NULL
    WHERE user_id = ${userId}
  `);
  await cacheDel(cacheKey("pro:user", userId));
}

export function canAccessModule(ent: ProTeamEntitlement | null, module: string): boolean {
  if (!ent) return false;
  if (ent.status !== "active") return false;
  if (ent.expiresAt && new Date(ent.expiresAt) < new Date()) return false;
  return ent.enabledModules.includes(module);
}

export function isBillingOwner(ent: ProTeamEntitlement | null, userId: string): boolean {
  return ent?.billingOwnerId === userId;
}

export function isManager(ent: ProTeamEntitlement | null, userId: string): boolean {
  if (!ent) return false;
  return ent.billingOwnerId === userId || ent.managerIds?.includes(userId);
}

export { PLAN_LIMITS, MODULE_LIST };
