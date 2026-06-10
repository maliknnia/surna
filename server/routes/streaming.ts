// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

export const streamingRouter = Router();

// Create a new live stream
streamingRouter.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).claims?.sub || (req.user as any).id;
    const { title, description, streamType, eventId, teamId } = req.body;

    const stream = await storage.createStreamSession(userId, {
      streamerId: userId,
      title,
      description: description || null,
      streamType: streamType || "event",
      eventId: eventId || null,
      teamId: teamId || null,
      thumbnailUrl: null,
    });

    res.json(stream);
  } catch (error: any) {
    console.error("Error creating stream:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get active live streams
streamingRouter.get("/active", async (req, res) => {
  try {
    const streams = await storage.getActiveStreams();
    res.json(streams);
  } catch (error: any) {
    console.error("Error getting active streams:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start a stream (change status to live)
streamingRouter.post("/:streamId/start", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).claims?.sub || (req.user as any).id;
    const { streamId } = req.params;
    
    // Always verify ownership from database
    const db = await import("../db").then(m => m.db);
    const { streamSessions } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [stream] = await db.select().from(streamSessions).where(eq(streamSessions.id, streamId));
    
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }
    
    if (stream.streamerId !== userId) {
      return res.status(403).json({ error: "Not authorized to start this stream" });
    }
    
    await storage.updateStreamStatus(streamId, "live");
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error starting stream:", error);
    res.status(500).json({ error: error.message });
  }
});

// End a stream
streamingRouter.post("/:streamId/end", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).claims?.sub || (req.user as any).id;
    const { streamId } = req.params;
    
    // Always verify ownership from database
    const db = await import("../db").then(m => m.db);
    const { streamSessions } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [stream] = await db.select().from(streamSessions).where(eq(streamSessions.id, streamId));
    
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }
    
    if (stream.streamerId !== userId) {
      return res.status(403).json({ error: "Not authorized to end this stream" });
    }
    
    await storage.updateStreamStatus(streamId, "ended");
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error ending stream:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get stream viewers
streamingRouter.get("/:streamId/viewers", async (req, res) => {
  try {
    const { streamId } = req.params;
    const viewers = await storage.getStreamViewers(streamId);
    res.json(viewers);
  } catch (error: any) {
    console.error("Error getting stream viewers:", error);
    res.status(500).json({ error: error.message });
  }
});
