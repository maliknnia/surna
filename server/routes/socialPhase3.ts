import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import {
  ensurePhase3SocialTables,
} from "../infrastructure/phase3Social";

export const socialRouter = Router();

function requireUserId(req: any, res: any): string | null {
  const id = resolveRequestUserId(req) ?? authUserId(req);
  if (!id) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return id;
}

/** GET /api/users/suggested — athletes you don't follow yet (register before /users/:id routes) */
socialRouter.get("/users/suggested", async (req, res) => {
  const viewerId = requireUserId(req, res);
  if (!viewerId) return;
  try {
    await ensurePhase3SocialTables();
    const limit = Math.min(Number(req.query.limit) || 24, 50);
    const q = await db.execute(sql`
      SELECT u.id, u.username, u.display_name, u.first_name, u.last_name,
             u.profile_image_url, u.sport, u.location
      FROM users u
      WHERE u.id != ${viewerId}
        AND u.id NOT IN (
          SELECT f.following_id FROM follows f
          WHERE f.follower_id = ${viewerId}
            AND f.following_type IN ('user', 'coach')
        )
      ORDER BY u.created_at DESC
      LIMIT ${limit}
    `);
    res.json(q.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch suggestions" });
  }
});

/** POST /api/users/:id/follow */
socialRouter.post("/users/:id/follow", async (req, res) => {
  const followerId = requireUserId(req, res);
  if (!followerId) return;
  const followingId = req.params.id;
  const followingType = (req.body?.followingType as string) || "user";
  if (followerId === followingId) {
    return res.status(400).json({ message: "Cannot follow yourself" });
  }
  try {
    await ensurePhase3SocialTables();
    await db.execute(sql`
      INSERT INTO follows (follower_id, following_id, following_type)
      VALUES (${followerId}, ${followingId}, ${followingType})
      ON CONFLICT (follower_id, following_id, following_type) DO NOTHING
    `);
    console.log("[Phase3-1] Follow:", followerId, "→", followingId, followingType);
    res.json({ following: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to follow" });
  }
});

/** DELETE /api/users/:id/unfollow */
socialRouter.delete("/users/:id/unfollow", async (req, res) => {
  const followerId = requireUserId(req, res);
  if (!followerId) return;
  const followingId = req.params.id;
  const followingType = (req.query.type as string) || "user";
  try {
    await ensurePhase3SocialTables();
    await db.execute(sql`
      DELETE FROM follows
      WHERE follower_id = ${followerId}
        AND following_id = ${followingId}
        AND following_type = ${followingType}
    `);
    console.log("[Phase3-1] Unfollow:", followerId, "→", followingId);
    res.json({ following: false });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to unfollow" });
  }
});

/** GET /api/users/:id/followers */
socialRouter.get("/users/:id/followers", async (req, res) => {
  try {
    await ensurePhase3SocialTables();
    const userId = req.params.id;
    const q = await db.execute(sql`
      SELECT u.id, u.username, u.display_name, u.first_name, u.last_name, u.profile_image_url, u.sport
      FROM follows f
      JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ${userId} AND f.following_type IN ('user', 'coach')
      ORDER BY f.created_at DESC
      LIMIT 200
    `);
    res.json(q.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch followers" });
  }
});

/** GET /api/users/:id/following */
socialRouter.get("/users/:id/following", async (req, res) => {
  try {
    await ensurePhase3SocialTables();
    const userId = req.params.id;
    const q = await db.execute(sql`
      SELECT u.id, u.username, u.display_name, u.first_name, u.last_name, u.profile_image_url, u.sport,
             f.following_type AS "followingType", f.following_id AS "followingId"
      FROM follows f
      LEFT JOIN users u ON u.id = f.following_id AND f.following_type IN ('user', 'coach')
      WHERE f.follower_id = ${userId}
      ORDER BY f.created_at DESC
      LIMIT 200
    `);
    res.json(q.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch following" });
  }
});

/** POST /api/users/:id/block */
socialRouter.post("/users/:id/block", async (req, res) => {
  const blockerId = requireUserId(req, res);
  if (!blockerId) return;
  const blockedId = req.params.id;
  if (blockerId === blockedId) {
    return res.status(400).json({ message: "Cannot block yourself" });
  }
  try {
    await ensurePhase3SocialTables();
    await db.execute(sql`
      INSERT INTO user_blocks (blocker_id, blocked_id)
      VALUES (${blockerId}, ${blockedId})
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `);
    console.log("[Phase3-3] Blocked user", blockedId, "by", blockerId);
    res.json({ blocked: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to block user" });
  }
});

/** DELETE /api/users/:id/block */
socialRouter.delete("/users/:id/block", async (req, res) => {
  const blockerId = requireUserId(req, res);
  if (!blockerId) return;
  try {
    await ensurePhase3SocialTables();
    await db.execute(sql`
      DELETE FROM user_blocks WHERE blocker_id = ${blockerId} AND blocked_id = ${req.params.id}
    `);
    res.json({ blocked: false });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to unblock user" });
  }
});

/** POST /api/reports */
socialRouter.post("/reports", async (req, res) => {
  const reporterId = requireUserId(req, res);
  if (!reporterId) return;
  const { contentType, contentId, reason, description } = req.body ?? {};
  if (!contentType || !contentId || !reason) {
    return res.status(400).json({ message: "contentType, contentId, and reason are required" });
  }
  try {
    await ensurePhase3SocialTables();
    const q = await db.execute(sql`
      INSERT INTO content_reports (reporter_id, content_type, content_id, reason, description)
      VALUES (${reporterId}, ${String(contentType)}, ${String(contentId)}, ${String(reason)}, ${description ?? null})
      RETURNING id
    `);
    console.log("[Phase3-3] Report filed:", contentType, contentId, "by", reporterId);
    res.status(201).json({ id: (q.rows[0] as { id: string }).id, ok: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to submit report" });
  }
});

export default socialRouter;
