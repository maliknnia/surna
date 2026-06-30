import { Router } from "express";
import { z } from "zod";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import {
  setProfilePath,
  updateSportIdentity,
  searchCoaches,
  searchReferees,
  searchVenues,
} from "../services/phase8ProfileService";

export const profilePhase8Router = Router();

function requireUserId(req: any, res: any): string | null {
  const id = resolveRequestUserId(req) ?? authUserId(req);
  if (!id) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return id;
}

/** POST /api/profile/path — Quick Start vs Professional Profile */
profilePhase8Router.post("/profile/path", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({
        profileType: z.enum(["normal", "professional"]),
        skipSetup: z.boolean().optional(),
      })
      .parse(req.body);
    const result = await setProfilePath(userId, body.profileType, body.skipSetup ?? body.profileType === "normal");
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to set profile path" });
  }
});

/** PUT /api/profile/sport-identity — sport-specific profile fields */
profilePhase8Router.put("/profile/sport-identity", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const body = z
      .object({
        primarySport: z.string().max(60).optional(),
        position: z.string().max(80).optional(),
        preferredFoot: z.string().max(20).optional(),
        clubHistory: z.string().max(2000).optional(),
        gaaCode: z.string().max(40).optional(),
        gaaCounty: z.string().max(80).optional(),
        gaaClub: z.string().max(120).optional(),
        heightCm: z.number().int().min(100).max(250).optional(),
        weightClass: z.string().max(40).optional(),
        fightRecordWins: z.number().int().min(0).optional(),
        fightRecordLosses: z.number().int().min(0).optional(),
        fightRecordDraws: z.number().int().min(0).optional(),
        fightRecordKos: z.number().int().min(0).optional(),
        stance: z.string().max(20).optional(),
        amateurOrPro: z.string().max(20).optional(),
        iabaNumber: z.string().max(40).optional(),
        medicalClearanceExpiry: z.string().optional(),
        gymAffiliation: z.string().max(120).optional(),
      })
      .parse(req.body);
    const result = await updateSportIdentity(userId, body);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to update sport identity" });
  }
});

/** GET /api/coaches?sport=&location= — discovery when location set; legacy list otherwise */
profilePhase8Router.get("/coaches", async (req, res) => {
  try {
    const sportRaw = typeof req.query.sport === "string" ? req.query.sport : "";
    const sportParam = sportRaw && sportRaw.toLowerCase() !== "all" ? sportRaw : undefined;
    const location = typeof req.query.location === "string" ? req.query.location.trim() : "";
    const limit = req.query.limit != null ? Number(req.query.limit) : 20;

    if (location) {
      const results = await searchCoaches({ sport: sportParam, location, limit });
      res.setHeader("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
      return res.json({ results });
    }

    const offset = req.query.offset != null ? Number(req.query.offset) : 0;
    const { storage } = await import("../storage");
    const { parseCoachProfile } = await import("@shared/coachProfile");
    const { toPublicCoachRow } = await import("../lib/publicData");
    const coaches = await storage.getCoaches(limit, offset, sportParam);
    res.setHeader("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    res.json(
      coaches.map((c) =>
        toPublicCoachRow({
          ...c,
          profile: parseCoachProfile(c.profileJson, { ...c, isVerified: !!c.isVerified }, c.user),
        }),
      ),
    );
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to search coaches" });
  }
});

/** GET /api/venues?sport=&location= */
profilePhase8Router.get("/venues", async (req, res) => {
  try {
    const sport = typeof req.query.sport === "string" ? req.query.sport : undefined;
    const location = typeof req.query.location === "string" ? req.query.location : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : 20;
    const results = await searchVenues({ sport, location, limit });
    res.setHeader("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    res.json({ results });
  } catch (err: unknown) {
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to search venues" });
  }
});

export { searchReferees };
