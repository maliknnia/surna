import type { RequestHandler } from "express";
import {
  ensureProEntitlementTables,
  getUserEntitlement,
  isActiveProUserEntitlement,
  isProEntitlementOpenAccess,
} from "../infrastructure/proEntitlements";
import { resolveProUserId } from "../routes/proAuth";

/**
 * Same Pro paywall as `/api/pro/*` (after entitlement/public tournament routes).
 * Use on any Pro-named surface mounted outside `proRouter`.
 */
export const requireActivePro: RequestHandler = async (req, res, next) => {
  if (isProEntitlementOpenAccess()) return next();
  const userId = resolveProUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    await ensureProEntitlementTables().catch(() => {});
    const ent = await getUserEntitlement(userId);
    if (!isActiveProUserEntitlement(ent)) {
      return res.status(403).json({
        error: "Pro subscription required",
        code: "PRO_REQUIRED",
      });
    }
    next();
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Entitlement check failed" });
  }
};
