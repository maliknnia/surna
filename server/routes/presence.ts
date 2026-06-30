import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../replitAuth";
import { authUserId } from "../lib/authUser";
import { db } from "../db";
import { personPresence, users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { LocationSharingService } from "../services/locationSharingService";
import { toPublicUser } from "../lib/publicData";

export const presenceRouter = Router();

const visibilitySchema = z.enum([
  "public",
  "followers",
  "friends",
  "family",
  "team_only",
  "ghost",
]);

const updatePresenceSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().int().min(0).max(10000).optional(),
  status: z.enum(["active", "idle", "offline"]).optional().default("active"),
  visibility: visibilitySchema.optional().default("friends"),
  blurRadiusM: z.number().int().min(0).max(1000).optional().default(200),
});

function presenceUserId(req: Request, res: Response): string | null {
  const userId = authUserId(req as Parameters<typeof authUserId>[0]);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

presenceRouter.post("/update", isAuthenticated, async (req, res) => {
  try {
    const userId = presenceUserId(req, res);
    if (!userId) return;

    const data = updatePresenceSchema.parse(req.body);

    const existing = await db.select().from(personPresence).where(eq(personPresence.userId, userId)).limit(1);

    if (existing.length > 0) {
      await db
        .update(personPresence)
        .set({
          lat: data.lat.toString(),
          lng: data.lng.toString(),
          accuracyM: data.accuracyM ?? null,
          status: data.status,
          visibility: data.visibility,
          blurRadiusM: data.blurRadiusM,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(personPresence.userId, userId));
    } else {
      await db.insert(personPresence).values({
        userId,
        lat: data.lat.toString(),
        lng: data.lng.toString(),
        accuracyM: data.accuracyM ?? null,
        status: data.status,
        visibility: data.visibility,
        blurRadiusM: data.blurRadiusM,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.json({ success: true, status: data.status, visibility: data.visibility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error updating presence:", error);
    res.status(500).json({ error: "Failed to update presence" });
  }
});

presenceRouter.post("/heartbeat", isAuthenticated, async (req, res) => {
  try {
    const userId = presenceUserId(req, res);
    if (!userId) return;

    const existing = await db.select().from(personPresence).where(eq(personPresence.userId, userId)).limit(1);
    if (existing.length > 0) {
      const currentStatus = existing[0].status;
      await db
        .update(personPresence)
        .set({
          status: currentStatus === "offline" ? "active" : currentStatus,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(personPresence.userId, userId));
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in heartbeat:", error);
    res.status(500).json({ error: "Failed to process heartbeat" });
  }
});

presenceRouter.get("/me", isAuthenticated, async (req, res) => {
  try {
    const userId = presenceUserId(req, res);
    if (!userId) return;

    const [presence] = await db.select().from(personPresence).where(eq(personPresence.userId, userId)).limit(1);
    const familyIds = await LocationSharingService.getFamilyMemberIds(userId);
    res.json({
      ...(presence || { status: "offline", visibility: "ghost", blurRadiusM: 200 }),
      familyCount: familyIds.size,
    });
  } catch (error) {
    console.error("Error getting presence:", error);
    res.status(500).json({ error: "Failed to get presence" });
  }
});

/** Family list for location sharing (Snapchat-style inner circle). */
presenceRouter.get("/family", isAuthenticated, async (req, res) => {
  try {
    const userId = presenceUserId(req, res);
    if (!userId) return;

    const rows = await LocationSharingService.listFamilyMembers(userId);
    if (rows.length === 0) return res.json([]);

    const memberIds = rows.map((r) => r.memberId);
    const memberUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, memberIds));

    const byId = new Map(memberUsers.map((u) => [u.id, u]));
    res.json(
      rows
        .map((r) => {
          const u = byId.get(r.memberId);
          if (!u) return null;
          return { ...toPublicUser(u), addedAt: r.createdAt };
        })
        .filter(Boolean),
    );
  } catch (error) {
    console.error("Error listing family circle:", error);
    res.status(500).json({ error: "Failed to list family" });
  }
});

presenceRouter.post("/family", isAuthenticated, async (req, res) => {
  try {
    const userId = presenceUserId(req, res);
    if (!userId) return;

    const { memberId } = z.object({ memberId: z.string().min(1) }).parse(req.body);
    await LocationSharingService.addFamilyMember(userId, memberId);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid member" });
    if (error instanceof Error && error.message.includes("yourself")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error adding family member:", error);
    res.status(500).json({ error: "Failed to add family member" });
  }
});

presenceRouter.delete("/family/:memberId", isAuthenticated, async (req, res) => {
  try {
    const userId = presenceUserId(req, res);
    if (!userId) return;

    await LocationSharingService.removeFamilyMember(userId, req.params.memberId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing family member:", error);
    res.status(500).json({ error: "Failed to remove family member" });
  }
});
