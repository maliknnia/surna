// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router, Request, Response } from "express";
import {
  universalSearch, autocomplete, reindexAll,
  getAllFlags, upsertFlag, deleteFlag, isFeatureEnabled,
  getMetrics, getAllQueueStats, getCacheStats,
  getPermissionMatrix,
  getEntitlement, isEntitlementActive,
  getTeamEntitlement, getUserEntitlement, upsertTeamEntitlement, upsertUserEntitlement,
  processStripeWebhook,
} from "../infrastructure";
import { searchLimiter } from "../infrastructure/rateLimiting";

export const infrastructureRouter = Router();

infrastructureRouter.get("/search", searchLimiter, async (req: Request, res: Response) => {
  try {
    const { q, types, sport, limit, offset } = req.query;
    if (!q || typeof q !== "string") return res.json({ hits: [], total: 0, took: 0, facets: {} });
    const result = await universalSearch(q, {
      types: types ? (types as string).split(",") : undefined,
      sport: sport as string,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.get("/search/autocomplete", searchLimiter, async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const results = await autocomplete(q, parseInt(req.query.limit as string) || 5);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.post("/search/reindex", async (req: Request, res: Response) => {
  try {
    await reindexAll();
    res.json({ message: "Reindex complete" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.get("/feature-flags", async (_req: Request, res: Response) => {
  try {
    const flags = await getAllFlags();
    res.json(flags);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.get("/feature-flags/:key", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
    const enabled = await isFeatureEnabled(req.params.key, { userId });
    res.json({ key: req.params.key, enabled });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.post("/feature-flags", async (req: Request, res: Response) => {
  try {
    const flag = await upsertFlag(req.body);
    res.json(flag);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.delete("/feature-flags/:key", async (req: Request, res: Response) => {
  try {
    await deleteFlag(req.params.key);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.get("/metrics", async (_req: Request, res: Response) => {
  const metrics = getMetrics();
  const queueStats = await getAllQueueStats();
  const cacheStats = await getCacheStats();
  res.json({ metrics, queues: queueStats, cache: cacheStats });
});

infrastructureRouter.get("/permissions", (_req: Request, res: Response) => {
  res.json(getPermissionMatrix());
});

infrastructureRouter.get("/entitlements/user/:userId", async (req: Request, res: Response) => {
  try {
    const ent = await getEntitlement(req.params.userId, "user");
    const proEnt = await getUserEntitlement(req.params.userId);
    res.json({ entitlement: ent, active: isEntitlementActive(ent), pro: proEnt });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.get("/entitlements/team/:teamId", async (req: Request, res: Response) => {
  try {
    const ent = await getTeamEntitlement(req.params.teamId);
    res.json(ent);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.post("/entitlements/team", async (req: Request, res: Response) => {
  try {
    const ent = await upsertTeamEntitlement(req.body);
    res.json(ent);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

infrastructureRouter.post("/entitlements/user", async (req: Request, res: Response) => {
  try {
    const ent = await upsertUserEntitlement(req.body);
    res.json(ent);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});
