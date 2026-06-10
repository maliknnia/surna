import { Router } from "express";
import { AnalyticsService, Period } from "./analytics.service";
import { z } from "zod";
import { db } from "../../db";
import { teams, teamMembers, places, events, products, users, insertAnalyticsFactSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const periodSchema = z.enum(['day', 'week', 'month', 'all']);

async function isAdmin(userId: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user?.isAdmin === true || false;
}

router.get("/user/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const period = periodSchema.parse(req.query.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    if (authId !== userId && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "You can only view your own analytics" });
    }

    const rollup = await AnalyticsService.getOrComputeUserRollup(userId, period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.get("/team/:teamId", async (req, res, next) => {
  try {
    const teamId = req.params.teamId;
    const period = periodSchema.parse(req.query.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, authId)
        )
      )
      .limit(1);

    if (!membership && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only team members can view team analytics" });
    }

    const rollup = await AnalyticsService.getOrComputeTeamRollup(teamId, period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.get("/gym/:gymId", async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const period = periodSchema.parse(req.query.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    const [gym] = await db.select().from(places).where(eq(places.id, gymId)).limit(1);
    
    if (gym?.ownerId !== authId && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only gym owners can view gym analytics" });
    }

    const rollup = await AnalyticsService.getOrComputeGymRollup(gymId, period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.get("/event/:eventId", async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const period = periodSchema.parse(req.query.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    
    if (event?.organizerId !== authId && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only event organizers can view event analytics" });
    }

    const rollup = await AnalyticsService.getOrComputeEventRollup(eventId);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.get("/marketplace", async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.query.period || 'week');
    const sellerId = req.query.sellerId as string | undefined;
    const productId = req.query.productId as string | undefined;
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    if (sellerId && sellerId !== authId && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "You can only view your own marketplace analytics" });
    }

    if (productId) {
      const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (product?.sellerId !== authId && !(await isAdmin(authId))) {
        return res.status(403).json({ message: "You can only view analytics for your own products" });
      }
    }

    const rollup = await AnalyticsService.getOrComputeMarketplaceRollup({
      sellerId,
      productId,
      period,
    });
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.get("/global", async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.query.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    if (!(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only admins can view global analytics" });
    }

    const rollup = await AnalyticsService.getOrComputeGlobalRollup(period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.post("/fact", async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    const validatedFact = insertAnalyticsFactSchema.parse(req.body);

    if (validatedFact.actorId && validatedFact.actorId !== authId) {
      const [membership] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, validatedFact.actorId),
            eq(teamMembers.userId, authId)
          )
        )
        .limit(1);

      if (!membership && !(await isAdmin(authId))) {
        return res.status(403).json({ 
          message: "You can only log facts for yourself or your teams" 
        });
      }
    }

    await AnalyticsService.logFact(validatedFact);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/compute/user/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const period = periodSchema.parse(req.body.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    if (authId !== userId && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "You can only compute your own analytics" });
    }

    const rollup = await AnalyticsService.computeUserRollup(userId, period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.post("/compute/team/:teamId", async (req, res, next) => {
  try {
    const teamId = req.params.teamId;
    const period = periodSchema.parse(req.body.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, authId)
        )
      )
      .limit(1);

    if (!membership && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only team members can compute team analytics" });
    }

    const rollup = await AnalyticsService.computeTeamRollup(teamId, period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.post("/compute/gym/:gymId", async (req, res, next) => {
  try {
    const gymId = req.params.gymId;
    const period = periodSchema.parse(req.body.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    const [gym] = await db.select().from(places).where(eq(places.id, gymId)).limit(1);
    
    if (gym?.ownerId !== authId && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only gym owners can compute gym analytics" });
    }

    const rollup = await AnalyticsService.computeGymRollup(gymId, period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.post("/compute/event/:eventId", async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const period = periodSchema.parse(req.body.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    
    if (event?.organizerId !== authId && !(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only event organizers can compute event analytics" });
    }

    const rollup = await AnalyticsService.computeEventRollup(eventId);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

router.post("/compute/global", async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.body.period || 'week');
    
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const authId = req.user.id;

    if (!(await isAdmin(authId))) {
      return res.status(403).json({ message: "Only admins can compute global analytics" });
    }

    const rollup = await AnalyticsService.computeGlobalRollup(period);
    res.json(rollup);
  } catch (error) {
    next(error);
  }
});

export default router;
