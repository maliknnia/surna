import { Router } from "express";
import { z } from "zod";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import {
  createFreePlaySpot,
  likeFreePlaySpot,
  checkinFreePlaySpot,
  saveFreePlaySpot,
  createCommunityRoute,
  likeCommunityRoute,
  saveCommunityRoute,
  checkinCommunityRoute,
} from "../services/phase6SportService";
import { setManagerConsent } from "../services/phase6SportService";

export const sportPhase6Router = Router();

function requireUserId(req: any, res: any): string | null {
  const id = resolveRequestUserId(req) ?? authUserId(req);
  if (!id) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return id;
}

/** GET /api/referees?sport=&location= */
sportPhase6Router.get("/referees", async (req, res) => {
  try {
    const sport = typeof req.query.sport === "string" ? req.query.sport : undefined;
    const location = typeof req.query.location === "string" ? req.query.location : undefined;
    const lat = req.query.lat != null ? Number(req.query.lat) : undefined;
    const lng = req.query.lng != null ? Number(req.query.lng) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : 20;

    const { searchReferees } = await import("../services/phase8ProfileService");
    const results = await searchReferees({
      sport,
      location,
      limit,
      ...(lat != null && lng != null ? {} : {}),
    });
    res.setHeader("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    res.json({ results });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to list referees" });
  }
});

/** POST /api/spots */
sportPhase6Router.post("/spots", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        sport: z.string().min(1).max(60),
        lat: z.number(),
        lng: z.number(),
      })
      .parse(req.body);
    const spot = await createFreePlaySpot({ userId, ...body });
    res.status(201).json({ spot });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create spot" });
  }
});

/** POST /api/spots/:id/like */
sportPhase6Router.post("/spots/:id/like", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const spot = await likeFreePlaySpot(req.params.id, userId);
    res.json({ spot });
  } catch (err: unknown) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Failed to like spot" });
  }
});

/** POST /api/spots/:id/save */
sportPhase6Router.post("/spots/:id/save", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const spot = await saveFreePlaySpot(req.params.id, userId);
    res.json({ spot });
  } catch (err: unknown) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Failed to save spot" });
  }
});

/** POST /api/spots/:id/checkin */
sportPhase6Router.post("/spots/:id/checkin", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const spot = await checkinFreePlaySpot(req.params.id, userId, body.lat, body.lng);
    res.json({ spot });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid coordinates" });
    res.status(400).json({ message: err instanceof Error ? err.message : "Check-in failed" });
  }
});

/** POST /api/routes — community verified routes */
sportPhase6Router.post("/routes", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        sport: z.string().min(1).max(60),
        coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
      })
      .parse(req.body);
    const route = await createCommunityRoute({ userId, ...body });
    res.status(201).json({ route });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create route" });
  }
});

/** POST /api/routes/:id/like */
sportPhase6Router.post("/routes/:id/like", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const route = await likeCommunityRoute(req.params.id, userId);
    res.json({ route });
  } catch (err: unknown) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Failed to like route" });
  }
});

/** POST /api/routes/:id/save */
sportPhase6Router.post("/routes/:id/save", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const route = await saveCommunityRoute(req.params.id, userId);
    res.json({ route });
  } catch (err: unknown) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Failed to save route" });
  }
});

/** POST /api/routes/:id/checkin */
sportPhase6Router.post("/routes/:id/checkin", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const route = await checkinCommunityRoute(req.params.id, userId, body.lat, body.lng);
    res.json({ route });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid coordinates" });
    res.status(400).json({ message: err instanceof Error ? err.message : "Check-in failed" });
  }
});

/** POST /api/competitive-challenges/:id/manager-consent */
sportPhase6Router.post("/competitive-challenges/:id/manager-consent", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    await setManagerConsent(req.params.id, userId);
    res.json({ ok: true });
  } catch (err: unknown) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Failed to record consent" });
  }
});

export default sportPhase6Router;
