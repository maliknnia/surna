// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { z } from "zod";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { insertStorySchema } from "@shared/schema";

export const storiesRouter = Router();

// Create a new story
storiesRouter.post("/", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    
    const storyData = insertStorySchema.parse(req.body);
    const story = await storage.createStory(userId, storyData);
    
    res.status(201).json(story);
  } catch (error) {
    next(error);
  }
});

// Get stories from followed users (for stories bar)
storiesRouter.get("/", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    
    const stories = await storage.getStoriesForUser(userId);
    res.json(stories);
  } catch (error) {
    next(error);
  }
});

// Get a specific story
storiesRouter.get("/:id", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const { id } = req.params;
    
    const story = await storage.getStoryById(id, userId);
    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }
    
    res.json(story);
  } catch (error) {
    next(error);
  }
});

// Mark story as viewed
storiesRouter.post("/:id/view", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const { id } = req.params;
    
    await storage.markStoryAsViewed(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete a story
storiesRouter.delete("/:id", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const { id } = req.params;
    
    await storage.deleteStory(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get viewers of a story
storiesRouter.get("/:id/viewers", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const { id } = req.params;
    
    const viewers = await storage.getStoryViewers(id, userId);
    res.json(viewers);
  } catch (error) {
    next(error);
  }
});

// Reply to a story
storiesRouter.post("/:id/reply", isAuthenticated, async (req: any, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const userId = req.user.claims?.sub || req.user.id;
    const { id } = req.params;
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    
    const reply = await storage.replyToStory(id, userId, content);
    res.status(201).json(reply);
  } catch (error) {
    next(error);
  }
});
