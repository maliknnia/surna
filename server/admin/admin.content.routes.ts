import { Router } from "express";
import { db } from "../db";
import { posts, postComments, postMedia } from "@shared/schema";
import { eq, sql, desc, and, isNull } from "drizzle-orm";
import { requirePermission, getClientIp, getUserAgent, type AdminRequest } from "./admin.middleware";
import { AuditService } from "./audit.service";
import { purgeMediaUrls } from "../features/media/cdn";
import { z } from "zod";

export const adminContentRouter = Router();

// ============================================================================
// CONTENT MODERATION - Posts, Comments, Media
// ============================================================================

const removeContentSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  hashban: z.boolean().optional(),
});

adminContentRouter.post("/posts/:postId/remove", requirePermission('content:remove'), async (req: AdminRequest, res) => {
  try {
    const { postId } = req.params;
    const { reason, hashban } = removeContentSchema.parse(req.body);

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const before = { removed: post.removed, removedReason: post.removedReason };

    await db
      .update(posts)
      .set({
        removed: true,
        removedReason: reason,
        removedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    // Pull every media URL attached to this post (both legacy fields on the
    // post row and the postMedia attachments) and purge them from the CDN
    // edge. Without this, moderated content keeps being served from the edge
    // for up to a year because of the immutable Cache-Control. Fire-and-forget
    // so a CDN outage can't block the takedown — purgeMediaUrls logs failures
    // internally.
    const attachments = await db
      .select({ mediaUrl: postMedia.mediaUrl, thumbnailUrl: postMedia.thumbnailUrl })
      .from(postMedia)
      .where(eq(postMedia.postId, postId));
    const urlsToPurge: Array<string | null | undefined> = [post.imageUrl, post.videoUrl];
    for (const a of attachments) {
      urlsToPurge.push(a.mediaUrl, a.thumbnailUrl);
    }
    void purgeMediaUrls(urlsToPurge);

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'content.post.remove',
      targetType: 'post',
      targetId: postId,
      reason,
      before,
      after: { removed: true, removedReason: reason },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { hashban },
    });

    res.json({ message: "Post removed successfully" });
  } catch (error: any) {
    console.error("Remove post error:", error);
    res.status(500).json({ message: error.message || "Failed to remove post" });
  }
});

adminContentRouter.post("/posts/:postId/restore", requirePermission('content:restore'), async (req: AdminRequest, res) => {
  try {
    const { postId } = req.params;

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    await db
      .update(posts)
      .set({
        removed: false,
        removedReason: null,
        removedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'content.post.restore',
      targetType: 'post',
      targetId: postId,
      before: { removed: post.removed },
      after: { removed: false },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Post restored successfully" });
  } catch (error: any) {
    console.error("Restore post error:", error);
    res.status(500).json({ message: "Failed to restore post" });
  }
});

adminContentRouter.post("/comments/:commentId/remove", requirePermission('content:remove'), async (req: AdminRequest, res) => {
  try {
    const { commentId } = req.params;
    const { reason } = removeContentSchema.parse(req.body);

    const [comment] = await db.select().from(postComments).where(eq(postComments.id, commentId)).limit(1);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const before = { removed: comment.removed, removedReason: comment.removedReason };

    await db
      .update(postComments)
      .set({
        removed: true,
        removedReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(postComments.id, commentId));

    await AuditService.log({
      adminId: req.admin!.id,
      action: 'content.comment.remove',
      targetType: 'comment',
      targetId: commentId,
      reason,
      before,
      after: { removed: true },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: "Comment removed successfully" });
  } catch (error: any) {
    console.error("Remove comment error:", error);
    res.status(500).json({ message: error.message || "Failed to remove comment" });
  }
});

adminContentRouter.get("/flagged-content", requirePermission('content:read'), async (req: AdminRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string || "50");
    const offset = parseInt(req.query.offset as string || "0");

    const flaggedPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.flagged, true), eq(posts.removed, false)))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const flaggedComments = await db
      .select()
      .from(postComments)
      .where(eq(postComments.flagged, true))
      .orderBy(desc(postComments.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      posts: flaggedPosts,
      comments: flaggedComments,
    });
  } catch (error: any) {
    console.error("Flagged content error:", error);
    res.status(500).json({ message: "Failed to fetch flagged content" });
  }
});
