import { db } from "../db";
import { sql } from "drizzle-orm";
import { cacheAside, cacheDel, cacheKey, TTL } from "./cache";

export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[];
  targetTeams: string[];
  targetRoles: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export async function ensureFeatureFlagTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      enabled BOOLEAN DEFAULT false,
      rollout_percentage INTEGER DEFAULT 0,
      target_users TEXT[] DEFAULT '{}',
      target_teams TEXT[] DEFAULT '{}',
      target_roles TEXT[] DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);
}

function hashToPercent(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

export async function isEnabled(
  flagKey: string,
  context?: { userId?: string; teamId?: string; role?: string }
): Promise<boolean> {
  const flag = await cacheAside<FeatureFlag | null>(
    cacheKey("ff", flagKey),
    TTL.SETTINGS,
    async () => {
      const result = await db.execute(sql`
        SELECT id, key, description, enabled, rollout_percentage AS "rolloutPercentage",
          target_users AS "targetUsers", target_teams AS "targetTeams",
          target_roles AS "targetRoles", metadata,
          created_at AS "createdAt", updated_at AS "updatedAt"
        FROM feature_flags WHERE key = ${flagKey} LIMIT 1
      `);
      return (result.rows[0] as unknown as FeatureFlag) || null;
    }
  );

  if (!flag) return false;
  if (!flag.enabled) return false;

  if (context?.userId && flag.targetUsers?.includes(context.userId)) return true;
  if (context?.teamId && flag.targetTeams?.includes(context.teamId)) return true;
  if (context?.role && flag.targetRoles?.includes(context.role)) return true;

  if (flag.rolloutPercentage >= 100) return true;
  if (flag.rolloutPercentage <= 0 && !flag.targetUsers?.length && !flag.targetTeams?.length && !flag.targetRoles?.length) return false;

  if (context?.userId && flag.rolloutPercentage > 0) {
    return hashToPercent(`${flagKey}:${context.userId}`) < flag.rolloutPercentage;
  }

  return flag.rolloutPercentage >= 100;
}

export async function getAllFlags(): Promise<FeatureFlag[]> {
  const result = await db.execute(sql`
    SELECT id, key, description, enabled, rollout_percentage AS "rolloutPercentage",
      target_users AS "targetUsers", target_teams AS "targetTeams",
      target_roles AS "targetRoles", metadata,
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM feature_flags ORDER BY key
  `);
  return result.rows as unknown as FeatureFlag[];
}

export async function upsertFlag(data: {
  key: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  targetUsers?: string[];
  targetTeams?: string[];
  targetRoles?: string[];
  metadata?: Record<string, any>;
}): Promise<FeatureFlag> {
  const targetUsers = data.targetUsers || [];
  const targetTeams = data.targetTeams || [];
  const targetRoles = data.targetRoles || [];
  const result = await db.execute(sql`
    INSERT INTO feature_flags (key, description, enabled, rollout_percentage, target_users, target_teams, target_roles, metadata, updated_at)
    VALUES (${data.key}, ${data.description || ""}, ${data.enabled ?? false},
      ${data.rolloutPercentage ?? 0},
      ${targetUsers},
      ${targetTeams},
      ${targetRoles},
      ${JSON.stringify(data.metadata || {})}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET
      description = COALESCE(EXCLUDED.description, feature_flags.description),
      enabled = EXCLUDED.enabled,
      rollout_percentage = EXCLUDED.rollout_percentage,
      target_users = EXCLUDED.target_users,
      target_teams = EXCLUDED.target_teams,
      target_roles = EXCLUDED.target_roles,
      metadata = EXCLUDED.metadata,
      updated_at = now()
    RETURNING id, key, description, enabled, rollout_percentage AS "rolloutPercentage",
      target_users AS "targetUsers", target_teams AS "targetTeams",
      target_roles AS "targetRoles", metadata,
      created_at AS "createdAt", updated_at AS "updatedAt"
  `);
  await cacheDel(cacheKey("ff", data.key));
  return result.rows[0] as unknown as FeatureFlag;
}

export async function deleteFlag(key: string): Promise<boolean> {
  const result = await db.execute(sql`DELETE FROM feature_flags WHERE key = ${key} RETURNING id`);
  await cacheDel(cacheKey("ff", key));
  return result.rows.length > 0;
}
