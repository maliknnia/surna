import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { ModerationService } from "./services/moderationService";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertPostSchema, 
  insertTeamSchema, 
  insertMessageSchema, 
  insertEventSchema,
  updateUserProfileSchema,
  usernameSchema,
  users,
  posts,
  postComments,
  teams,
  teamMembers,
  events,
  eventParticipants,
  payments,
  orders,
  orderItems,
  insertPaymentSchema,
  insertOrderSchema,
  messages,
  notifications,
  badgeDefinitions,
  userBadges,
  userLevels,
  userStreaks,
  pointTransactions,
  products,
  userWishlists,
  wishlistItems,
  productReviews,
  productQuestions,
  productAnswers,
  insertPushTokenSchema,
  streamSessions,
  insertStreamSessionSchema,
  insertPlaceSchema,
  insertPlacePhotoSchema,
  insertPlaceReviewSchema,
  insertPlaceBookingSchema,
  insertPlacePostSchema,
  places,
  coaches,
  coachBookings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count, asc, lt, ilike, ne, inArray } from "drizzle-orm";
import { createPerUserLimiter } from "./middleware/rateLimiter";
import { validateBody } from "./middleware/validate";
import { z } from "zod";
import { registerMediaRoutes } from "./media/mediaRoutes";
import { setupWebSocketServer, broadcastLiveUpdate, getConnectionStats } from "./realtime/socketServer";
import { initializeNotificationService, queueNotification, getNotificationStats, subscribeUserToPush, unsubscribeUserFromPush } from "./notifications/pushService";
// import { initializeScheduledJobs } from './analytics/scheduledJobs';
// import { analyticsMiddleware, sessionTrackingMiddleware } from './middleware/analyticsMiddleware';
// Stage 6: Security imports
import { setupSecurityMiddleware, loginLimiter, sensitiveOperationsLimiter, passwordChangeLimiter, adminOperationsLimiter, dataExportLimiter, ipBlockingMiddleware } from "./security/securityMiddleware";
import { requirePermission, requireRole, Permission, UserRole, requireParentalConsent } from "./security/roleBasedAccess";
import { logUserAction, logAdminAction, logSecurityEvent, AuditEventType, auditMiddleware } from "./security/auditLogging";
import { parentalConsentService, requireParentalConsentMiddleware } from "./security/parentalConsent";
import { complianceService } from "./security/complianceReporting";
import { recommendationService } from "./services/recommendationService";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerFeatureRouters } from "./features";
import { deriveImageVariants } from "./features/media/variants";
import { formatApiComment, formatApiCommentFromJoin, type ApiComment } from "./lib/commentFormat";
import { authMiddleware } from "./middleware/auth";
import { adminRouter } from "./admin/admin.routes";
import { errorHandler } from "./middleware/errorHandler";
import { insertUserInteractionSchema, insertRecommendationFeedbackSchema, users as usersTable } from "@shared/schema";
import { parseCoachProfile, type CoachProfileExtras } from "@shared/coachProfile";
import { eq as eqDb, and as andDb } from "drizzle-orm";
import { teamManagementService } from "./services/teamManagementService";
import { eventManagementService } from "./services/eventManagementService";
import { communicationService } from "./services/communicationService";
import { analyticsService } from "./services/analyticsService";
import { calendarService } from "./services/calendarService";
import { pricingService } from "./services/pricingService";
import { marketplaceRecommendationService } from "./services/marketplaceRecommendationService";
import { searchService } from "./services/searchService";
import { inventoryService } from "./services/inventoryService";
// Stage 27: Advanced Security imports
import { securityDashboardRoutes } from "./security/securityDashboard";
import { MFAService } from "./security/mfaService";
import { PasswordPolicyService, defaultPasswordPolicy } from "./security/passwordPolicy";
import { GDPRComplianceService, CCPAComplianceService, GDPRRequestType } from "./security/gdprCompliance";
import { BackupRecoveryService } from "./security/backupRecovery";
import { securityHeaders, enforceHTTPS, sanitizeInput, apiSecurityMiddleware, securityMonitoring } from "./security/securityHeaders";
// Stage 28: Gamification imports
import { GamificationService } from "./gamification/gamificationService";
import { ChallengesService } from "./gamification/challengesService";
import { RewardsService } from "./gamification/rewardsService";
import {
  mergeAvailability,
  generateBookableSlots,
  slotIsValid,
} from "./lib/coachAvailability";
import {
  availabilityLabelsToWeekly,
  buildProfileFromApplication,
  parseCertifications,
  shouldAutoVerifyCoach,
} from "./lib/coachApply";
import { enrichUserRow, mergeUserProfile } from "./lib/userProfile";
import { toPublicCoachRow, toPublicUser } from "./lib/publicData";
import { sanitizePlainText } from "./lib/sanitizeContent";
import { parseUserProfile, profileCompletionPercent } from "@shared/userProfile";
import { gearProfileSchema, mergeGearProfile } from "@shared/gearProfile";
import { messengerRepo } from "./features/messenger/messenger.repo";
import { authUserId } from "./lib/authUser";
import { csrfProtection } from "./middleware/csrfMiddleware";
import { requireEmailVerified } from "./middleware/requireEmailVerified";

async function ensureUserProfileColumn() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_json jsonb DEFAULT '{}'::jsonb`);
}

async function ensureCoachWeeklyAvailabilityColumn() {
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS weekly_availability jsonb`);
}

async function ensureCoachProfileColumn() {
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS profile_json jsonb DEFAULT '{}'::jsonb`);
}

let coachProfileColumnReady: Promise<void> | null = null;
function ensureCoachProfileColumnOnce(): Promise<void> {
  if (!coachProfileColumnReady) {
    coachProfileColumnReady = ensureCoachProfileColumn().catch((err) => {
      coachProfileColumnReady = null;
      throw err;
    });
  }
  return coachProfileColumnReady;
}

function enrichCoachRow<T extends { id: string; specialties?: string[] | null; experience?: string | null; certifications?: string[] | null; hourlyRate?: string | null; bio?: string | null; profileJson?: unknown; isVerified?: boolean | null; user: { sport?: string | null; profileImageUrl?: string | null } }>(
  row: T,
) {
  const enriched = {
    ...row,
    profile: parseCoachProfile(row.profileJson, { ...row, isVerified: !!row.isVerified }, row.user),
  };
  return toPublicCoachRow(enriched);
}

// Stripe is only required for payment routes; allow local dev without keys.
const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "sk_test_local_dev_placeholder_not_valid_for_charges");
if (!stripeSecretKey) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY (required in production)");
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
});

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sessionUserId(req: any): string | undefined {
  return (
    authUserId(req) ??
    req.session?.localUser?.dbUser?.id ??
    req.session?.localUser?.claims?.sub
  );
}

// CSRF — shared middleware also applied globally in app.ts for all /api mutating routes

// Rate limiters
const likeLimiter = createPerUserLimiter({ windowMs: 60_000, max: 30 });
const commentLimiter = createPerUserLimiter({ windowMs: 60_000, max: 20 });

// Stage 2: Simple caching layer (Redis-ready)
const cache = new Map<string, { data: any; expires: number }>();
const cacheInflight = new Map<string, Promise<unknown>>();

function withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && cached.expires > now) {
    return Promise.resolve(cached.data as T);
  }

  const pending = cacheInflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = fn()
    .then((result) => {
      cache.set(key, { data: result, expires: Date.now() + ttl * 1000 });
      cacheInflight.delete(key);
      return result;
    })
    .catch((err) => {
      cacheInflight.delete(key);
      throw err;
    });

  cacheInflight.set(key, p);
  return p;
}

// Stage 2: Monitoring counters
let requestCount = 0;
let errorCount = 0;

export async function registerRoutes(app: Express, io?: any): Promise<Server> {
  await ensureCoachProfileColumnOnce().catch((err) => {
    console.warn("[coaches] profile_json column ensure skipped:", errMsg(err));
  });

  // Stage 6: Security middleware first (disabled for performance)
  // setupSecurityMiddleware(app);
  // app.use(ipBlockingMiddleware);
  // app.use(auditMiddleware());
  
  // Auth middleware
  await setupAuth(app);
  
  // JWT Auth middleware (for Package #1: Auth module)
  app.use(authMiddleware());
  
  // Stage 5: Analytics middleware (disabled for performance)
  // app.use(analyticsMiddleware);
  // app.use(sessionTrackingMiddleware);
  // Temporarily disabled: app.use(endSessionMiddleware);
  // Temporarily disabled: app.use(realTimeEngagementMiddleware);
  // Temporarily disabled: app.use(loginTrackingMiddleware);
  
  // Stage 4: Initialize real-time services (disabled for performance)
  // await initializeNotificationService();
  
  // Stage 5: Initialize analytics scheduled jobs (disabled for performance)
  // initializeScheduledJobs();
  
  // Stage 8: Initialize gamification data (disabled temporarily due to startup conflicts)
  // const { initializeGamificationData } = await import("./gamificationInit");
  // await initializeGamificationData();
  try {
    await RewardsService.initializeRewardCatalog();
  } catch (error) {
    console.error("Failed to seed reward catalog:", error);
  }
  
  // Media job queue + legacy upload pipeline (feature router handles init/complete attach)
  registerMediaRoutes(app);

  // Referrals, campaigns, and growth analytics
  try {
    const { registerMarketingRoutes } = await import("./routes/marketingRoutes");
    registerMarketingRoutes(app);
  } catch (error) {
    console.error("Failed to load marketing routes:", error);
  }

  // Admin moderation — canonical handlers in server/admin/admin.routes.ts (+ admin.legacy.routes.ts)

  // Stage 13: Payment Integration routes
  try {
    const { registerPaymentRoutes } = await import("./routes/paymentRoutes");
    registerPaymentRoutes(app);
  } catch (error) {
    console.error('Failed to load payment routes:', error);
  }

  // Stage 13: Location services routes
  try {
    const { registerLocationRoutes } = await import("./routes/locationRoutes");
    registerLocationRoutes(app);
  } catch (error) {
    console.error('Failed to load location routes:', error);
  }

  // Stage 13: Analytics tracking routes
  try {
    registerAnalyticsRoutes(app);
  } catch (error) {
    console.error('Failed to load analytics routes:', error);
  }

  // Stage 13: Webhook integration routes
  try {
    const { registerWebhookRoutes } = await import("./routes/webhookRoutes");
    registerWebhookRoutes(app);
  } catch (error) {
    console.error('Failed to load webhook routes:', error);
  }

  // Package #1: Auth module routes (JWT-based authentication)
  try {
    const express = await import('express');
    const api = express.Router();
    registerFeatureRouters(api, io);
    app.use("/api", api);
  } catch (error) {
    console.error('Failed to load JWT auth routes:', error);
  }

  // Phase 3: follows, blocks, reports (register before legacy duplicate handlers)
  try {
    const { socialRouter } = await import("./routes/socialPhase3");
    app.use("/api", socialRouter);
  } catch (error) {
    console.error("Failed to load Phase 3 social routes:", error);
  }

  // Phase 4: points, badges, leaderboards, streaks, weekly challenges
  try {
    const { competitiveRouter } = await import("./routes/competitivePhase4");
    app.use("/api", competitiveRouter);
  } catch (error) {
    console.error("Failed to load Phase 4 competitive routes:", error);
  }

  // Phase 5: team bills, payments history, marketplace fulfillment, coach/tournament money
  try {
    const { moneyPhase5Router } = await import("./routes/phase5Money");
    app.use("/api", moneyPhase5Router);
  } catch (error) {
    console.error("Failed to load Phase 5 money routes:", error);
  }

  try {
    const { sportPhase6Router } = await import("./routes/phase6Sport");
    app.use("/api", sportPhase6Router);
  } catch (error) {
    console.error("Failed to load Phase 6 sport routes:", error);
  }

  try {
    const { healthPhase7Router } = await import("./routes/phase7Health");
    app.use("/api", healthPhase7Router);
  } catch (error) {
    console.error("Failed to load Phase 7 health routes:", error);
  }

  try {
    const { profilePhase8Router } = await import("./routes/phase8Profile");
    app.use("/api", profilePhase8Router);
  } catch (error) {
    console.error("Failed to load Phase 8 profile routes:", error);
  }

  try {
    const { mobilePhase9Router } = await import("./routes/phase9Mobile");
    app.use("/api", mobilePhase9Router);
  } catch (error) {
    console.error("Failed to load Phase 9 mobile routes:", error);
  }

  // Package #13: Admin Control System routes
  try {
    const { ensureAdminDashboardSchema } = await import("./admin/ensureAdminDashboardSchema");
    const { ensureComplianceRequestsSchema } = await import("./security/ensureComplianceSchema");
    void ensureAdminDashboardSchema().catch((err) => {
      console.error("[boot] Admin dashboard schema migration failed", err);
    });
    void ensureComplianceRequestsSchema().catch((err) => {
      console.error("[boot] Compliance requests schema migration failed", err);
    });
    app.use("/api/admin", adminRouter);
  } catch (error) {
    console.error('Failed to load admin routes:', error);
  }

  // Infrastructure API routes (search, feature flags, entitlements, metrics)
  try {
    const { infrastructureRouter } = await import("./routes/infrastructure");
    app.use("/api/infra", infrastructureRouter);
  } catch (error) {
    console.error('Failed to load infrastructure routes:', error);
  }

  // Mount Marketplace & Events routers — already registered via registerFeatureRouters(api)
  // (duplicate mounts here would shadow handlers; keep single source in features/index.ts)

  // Package #4: Mount Teams router
  try {
    const teamsRouter = (await import("./features/teams/teams.router")).default;
    app.use("/api/teams", teamsRouter);
  } catch (error) {
    console.error('Failed to load teams routes:', error);
  }

  // My Hub Places: mounted before the legacy `/api/places/:id` handler so
  // static `/me/owned` and `/:id/status` paths match first.
  try {
    const placesRouter = (await import("./features/places/places.router")).default;
    app.use("/api/places", placesRouter);
  } catch (error) {
    console.error('Failed to load places router:', error);
  }

  // Mount Map aggregator router
  try {
    const { mapRouter } = await import("./routes/map");
    app.use("/api/map", mapRouter);
    const { presenceRouter } = await import("./routes/presence");
    app.use("/api/presence", presenceRouter);
  } catch (error) {
    console.error('Failed to load map routes:', error);
  }

  // Mount Instant Teams routes
  try {
    const { instantTeamsRouter } = await import("./routes/instantTeams");
    app.use("/api/instant-teams", instantTeamsRouter);
  } catch (error) {
    console.error('Failed to load instant teams routes:', error);
  }

  // Mount SURNA Pro routes
  try {
    const { proRouter } = await import("./routes/pro");
    app.use("/api/pro", proRouter);
  } catch (error) {
    console.error('Failed to load pro routes:', error);
  }

  // Mount SURNA Pro Workflow routes (approvals + activity)
  try {
    const { proWorkflowRouter } = await import("./routes/proWorkflow");
    app.use("/api/pro-workflow", proWorkflowRouter);
  } catch (error) {
    console.error('Failed to load pro workflow routes:', error);
  }

  // Mount Wallpaper routes
  try {
    const { wallpaperRouter } = await import("./routes/wallpaper");
    app.use("/api/wallpaper", wallpaperRouter);
  } catch (error) {
    console.error('Failed to load wallpaper routes:', error);
  }

  // Mount Stories routes
  try {
    const { storiesRouter } = await import("./routes/stories");
    app.use("/api/stories", storiesRouter);
  } catch (error) {
    console.error('Failed to load stories routes:', error);
  }

  // Mount Streaming routes
  try {
    const { streamingRouter } = await import("./routes/streaming");
    app.use("/api/streaming", streamingRouter);
  } catch (error) {
    console.error('Failed to load streaming routes:', error);
  }

  // Places API Routes
  
  // Create new place
  app.post("/api/places", isAuthenticated, validateBody(insertPlaceSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { ensurePlacesBookingColumns } = await import("./features/places/places.compat");
      const { defaultBookingModeForCategory } = await import("@shared/placeBooking");
      await ensurePlacesBookingColumns();
      const payload = { ...req.body };
      if (!payload.bookingMode && payload.category) {
        payload.bookingMode = defaultBookingModeForCategory(String(payload.category));
      }
      const place = await storage.createPlace(userId, payload);
      res.status(201).json(place);
    } catch (error: unknown) {
      console.error("Error creating place:", error);
      res.status(500).json({ message: "Failed to create place" });
    }
  });

  // Attach `_thumb` / `_medium` (and modern format) sibling URLs for the
  // place's profile and cover photos so list cards and the venue grid use
  // the small variant while detail headers/galleries use the larger one.
  // Returns the row unchanged when the stored URL doesn't match the
  // resize worker's naming pattern.
  const withPlaceImageVariants = <T extends Record<string, unknown> | null | undefined>(p: T): T => {
    if (!p) return p;
    const profileImageUrl = (p as Record<string, unknown>).profileImageUrl as string | null | undefined;
    const coverImageUrl   = (p as Record<string, unknown>).coverImageUrl   as string | null | undefined;
    const profile = deriveImageVariants(profileImageUrl);
    const cover   = deriveImageVariants(coverImageUrl);
    // Places have two images (avatar-style profile + wide cover). We expose
    // entity-prefixed variants for both AND mirror the place's primary image
    // (profileImageUrl) onto the canonical `thumbUrl`/`mediumUrl` contract so
    // generic image consumers don't need to know about the place schema.
    const primary = profile ?? cover;
    return {
      ...(p as Record<string, unknown>),
      ...(profile && {
        profileImageThumbUrl: profile.thumbUrl,
        profileImageMediumUrl: profile.mediumUrl,
        profileImageThumbWebpUrl: profile.thumbWebpUrl,
        profileImageMediumWebpUrl: profile.mediumWebpUrl,
        profileImageThumbAvifUrl: profile.thumbAvifUrl,
        profileImageMediumAvifUrl: profile.mediumAvifUrl,
      }),
      ...(cover && {
        coverImageThumbUrl: cover.thumbUrl,
        coverImageMediumUrl: cover.mediumUrl,
        coverImageThumbWebpUrl: cover.thumbWebpUrl,
        coverImageMediumWebpUrl: cover.mediumWebpUrl,
        coverImageThumbAvifUrl: cover.thumbAvifUrl,
        coverImageMediumAvifUrl: cover.mediumAvifUrl,
      }),
      ...(primary && {
        thumbUrl: primary.thumbUrl,
        mediumUrl: primary.mediumUrl,
        thumbWebpUrl: primary.thumbWebpUrl,
        mediumWebpUrl: primary.mediumWebpUrl,
        thumbAvifUrl: primary.thumbAvifUrl,
        mediumAvifUrl: primary.mediumAvifUrl,
      }),
    } as T;
  };

  // Get all places with filters
  app.get("/api/places", async (req, res) => {
    try {
      const { sport, city, minRating, limit, offset } = req.query;
      const lim = limit ? parseInt(limit as string) : 20;
      const off = offset ? parseInt(offset as string) : 0;
      const cacheKey = `places_${sport ?? ""}_${city ?? ""}_${minRating ?? ""}_${lim}_${off}`;

      const places = await withCache(cacheKey, 30, async () => {
        const filters: Record<string, string | number> = {};
        if (sport) filters.sport = sport as string;
        if (city) filters.city = city as string;
        if (minRating) filters.minRating = parseFloat(minRating as string);
        return storage.getPlaces(filters, lim, off);
      });

      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
      res.json((places as any[]).map(withPlaceImageVariants));
    } catch (error: unknown) {
      console.error("Error fetching places:", error);
      res.status(500).json({ message: "Failed to fetch places" });
    }
  });

  // Search places
  app.get("/api/places/search", async (req, res) => {
    try {
      const { q, sport, city, limit } = req.query;
      const filters: any = {};
      
      if (sport) filters.sport = sport as string;
      if (city) filters.city = city as string;
      
      const places = await storage.searchPlaces(
        q as string || "",
        filters,
        limit ? parseInt(limit as string) : 20
      );
      
      res.json((places as any[]).map(withPlaceImageVariants));
    } catch (error: unknown) {
      console.error("Error searching places:", error);
      res.status(500).json({ message: "Failed to search places" });
    }
  });

  // Get user's bookings
  app.get("/api/places/bookings/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { limit, offset } = req.query;
      
      const bookings = await storage.getUserBookings(
        userId,
        limit ? parseInt(limit as string) : 20,
        offset ? parseInt(offset as string) : 0
      );
      
      res.json(bookings);
    } catch (error: unknown) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get place details
  app.get("/api/places/:id", async (req, res) => {
    try {
      const place = await storage.getPlace(req.params.id);
      
      if (!place) {
        return res.status(404).json({ message: "Place not found" });
      }
      
      res.json(withPlaceImageVariants(place as any));
    } catch (error: unknown) {
      console.error("Error fetching place:", error);
      res.status(500).json({ message: "Failed to fetch place" });
    }
  });

  // Update place
  app.put("/api/places/:id", isAuthenticated, validateBody(insertPlaceSchema.partial()), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const place = await storage.updatePlace(req.params.id, userId, req.body);
      
      if (!place) {
        return res.status(404).json({ message: "Place not found or unauthorized" });
      }
      
      res.json(place);
    } catch (error: unknown) {
      console.error("Error updating place:", error);
      res.status(500).json({ message: "Failed to update place" });
    }
  });

  // Delete place (owner only)
  app.delete("/api/places/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const deleted = await storage.deletePlace(req.params.id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Place not found or unauthorized" });
      }
      
      res.json({ success: true, message: "Place deleted successfully" });
    } catch (error: unknown) {
      console.error("Error deleting place:", error);
      res.status(500).json({ message: "Failed to delete place" });
    }
  });

  // Add place photo
  app.post("/api/places/:id/photos", isAuthenticated, validateBody(insertPlacePhotoSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const photo = await storage.addPlacePhoto(req.params.id, { ...req.body, uploadedBy: userId });
      res.status(201).json(photo);
    } catch (error: unknown) {
      console.error("Error adding place photo:", error);
      res.status(500).json({ message: "Failed to add photo" });
    }
  });

  // Get place photos
  app.get("/api/places/:id/photos", async (req, res) => {
    try {
      const photos = await storage.getPlacePhotos(req.params.id);
      res.json(photos);
    } catch (error: unknown) {
      console.error("Error fetching place photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  // Delete place photo
  app.delete("/api/places/photos/:photoId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const deleted = await storage.deletePlacePhoto(req.params.photoId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found or unauthorized" });
      }
      
      res.json({ success: true, message: "Photo deleted successfully" });
    } catch (error: unknown) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Follow/unfollow place (toggle)
  app.post("/api/places/:id/follow", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const placeId = req.params.id;
      
      const isFollowing = await storage.isFollowingPlace(placeId, userId);
      
      if (isFollowing) {
        await storage.unfollowPlace(placeId, userId);
        res.json({ following: false, message: "Unfollowed place" });
      } else {
        await storage.followPlace(placeId, userId);
        res.json({ following: true, message: "Followed place" });
      }
    } catch (error: unknown) {
      console.error("Error toggling place follow:", error);
      res.status(500).json({ message: "Failed to toggle follow" });
    }
  });

  // Get place followers
  app.get("/api/places/:id/followers", async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const followers = await storage.getPlaceFollowers(
        req.params.id,
        limit ? parseInt(limit as string) : 20,
        offset ? parseInt(offset as string) : 0
      );
      res.json(followers.map((u) => toPublicUser(u)));
    } catch (error: unknown) {
      console.error("Error fetching place followers:", error);
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  // Add place review
  app.post("/api/places/:id/reviews", isAuthenticated, validateBody(insertPlaceReviewSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const review = await storage.addPlaceReview(req.params.id, userId, req.body);
      res.status(201).json(review);
    } catch (error: unknown) {
      console.error("Error adding review:", error);
      res.status(500).json({ message: "Failed to add review" });
    }
  });

  // Update place review
  app.put("/api/places/reviews/:reviewId", isAuthenticated, validateBody(insertPlaceReviewSchema.partial()), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const review = await storage.updatePlaceReview(req.params.reviewId, userId, req.body);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found or unauthorized" });
      }
      
      res.json(review);
    } catch (error: unknown) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Get place reviews
  app.get("/api/places/:id/reviews", async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const reviews = await storage.getPlaceReviews(
        req.params.id,
        limit ? parseInt(limit as string) : 20,
        offset ? parseInt(offset as string) : 0
      );
      res.json(reviews);
    } catch (error: unknown) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Delete review
  app.delete("/api/places/reviews/:reviewId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const deleted = await storage.deleteReview(req.params.reviewId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Review not found or unauthorized" });
      }
      
      res.json({ success: true, message: "Review deleted successfully" });
    } catch (error: unknown) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Create place booking
  app.post("/api/places/:id/bookings", isAuthenticated, validateBody(insertPlaceBookingSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const placeId = req.params.id;
      const startTime = new Date(req.body.startTime);
      const endTime = new Date(req.body.endTime);
      if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        return res.status(400).json({ message: "Invalid start or end time" });
      }

      const { assertSlotAvailable } = await import("./services/placeAvailabilityService");
      await assertSlotAvailable(placeId, startTime, endTime);

      const [placeRow] = await db.select().from(places).where(eq(places.id, placeId)).limit(1);
      if (!placeRow) {
        return res.status(404).json({ message: "Place not found" });
      }
      const bookingMode = (placeRow as { bookingMode?: string }).bookingMode ?? "request";
      if (bookingMode === "none") {
        return res.status(400).json({ message: "This venue does not accept online bookings" });
      }

      const slotPrice = (placeRow as { slotPrice?: string | null }).slotPrice;
      const status = bookingMode === "slots" ? "confirmed" : "pending";
      const booking = await storage.createPlaceBooking(userId, {
        ...req.body,
        placeId,
        status,
        price: req.body.price ?? (slotPrice != null ? String(slotPrice) : undefined),
      });
      const { bookingScanTokenForRow } = await import("./services/placeBookingCheckInService");
      const scanToken = bookingScanTokenForRow(booking);
      res.status(201).json(scanToken ? { ...booking, scanToken } : booking);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create booking";
      const isClient =
        message.includes("available") ||
        message.includes("Invalid") ||
        message.includes("does not accept");
      console.error("Error creating booking:", error);
      res.status(isClient ? 409 : 500).json({ message });
    }
  });

  // Get place bookings (owner only)
  app.get("/api/places/:id/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { limit, offset } = req.query;
      
      const bookings = await storage.getPlaceBookings(
        req.params.id,
        userId,
        limit ? parseInt(limit as string) : 20,
        offset ? parseInt(offset as string) : 0
      );
      
      res.json(bookings);
    } catch (error: unknown) {
      console.error("Error fetching place bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Update booking status (place owner or booking user only)
  app.put("/api/places/bookings/:id", isAuthenticated, validateBody(insertPlaceBookingSchema.partial()), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const existing = await storage.getPlaceBookingById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const [place] = await db.select().from(places).where(eq(places.id, existing.placeId)).limit(1);
      const isOwner = place?.ownerId === userId;
      const isBooker = existing.userId === userId;
      if (!isOwner && !isBooker) {
        return res.status(403).json({ message: "Not authorized to update this booking" });
      }
      const booking = await storage.updatePlaceBooking(req.params.id, req.body);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(booking);
    } catch (error: unknown) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Cancel booking
  app.post("/api/places/bookings/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { reason } = req.body;
      
      const cancelled = await storage.cancelBooking(req.params.id, userId, reason);
      
      if (!cancelled) {
        return res.status(404).json({ message: "Booking not found or unauthorized" });
      }
      
      res.json({ success: true, message: "Booking cancelled successfully" });
    } catch (error: unknown) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Create place post
  app.post("/api/places/:id/posts", isAuthenticated, validateBody(insertPlacePostSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const post = await storage.createPlacePost(req.params.id, userId, req.body);
      res.status(201).json(post);
    } catch (error: unknown) {
      console.error("Error creating place post:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create post" });
    }
  });

  // Get place posts
  app.get("/api/places/:id/posts", async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const posts = await storage.getPlacePosts(
        req.params.id,
        limit ? parseInt(limit as string) : 20,
        offset ? parseInt(offset as string) : 0
      );
      res.json(posts);
    } catch (error: unknown) {
      console.error("Error fetching place posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/place-posts/:id/like", isAuthenticated, likeLimiter, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const placePostId = req.params.id;
      const alreadyLiked = await storage.isPlacePostLiked(userId, placePostId);
      if (alreadyLiked) {
        await storage.unlikePlacePost(userId, placePostId);
        res.json({ liked: false });
      } else {
        await storage.likePlacePost(userId, placePostId);
        res.json({ liked: true });
      }
    } catch (error: unknown) {
      console.error("Error liking place post:", error);
      res.status(500).json({ message: "Failed to like place post" });
    }
  });

  app.post("/api/place-posts/:id/comment", isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const content = String(req.body?.content || "").trim();
      if (!content) return res.status(400).json({ message: "content is required" });
      const comment = await storage.addPlacePostComment(req.params.id, userId, content);
      res.status(201).json(comment);
    } catch (error: unknown) {
      console.error("Error commenting on place post:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });
  // Stage 16: Security & Privacy routes
  try {
    const { default: securityRoutes } = await import("./security/securityRoutes");
    app.use("/api/security", securityRoutes);
  } catch (error) {
    console.error('Failed to load security routes:', error);
  }

  // Stage 27: Advanced Security Dashboard routes
  app.get("/api/security/metrics", isAuthenticated, requireRole(UserRole.ADMIN), securityDashboardRoutes.getMetrics);
  app.get("/api/security/alerts", isAuthenticated, requireRole(UserRole.ADMIN), securityDashboardRoutes.getAlerts);
  app.get("/api/security/health", isAuthenticated, requireRole(UserRole.ADMIN), securityDashboardRoutes.getSystemHealth);
  app.post("/api/security/audit", isAuthenticated, requireRole(UserRole.ADMIN), securityDashboardRoutes.runSecurityAudit);
  app.post("/api/security/backup/test", isAuthenticated, requireRole(UserRole.ADMIN), securityDashboardRoutes.testDisasterRecovery);

  // Multi-factor authentication routes
  app.post("/api/auth/mfa/setup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userEmail = req.user.email;
      const setup = await MFAService.generateTOTPSetup(userId, userEmail);
      res.json(setup);
    } catch (error: unknown) {
      console.error("Error setting up MFA:", error);
      res.status(500).json({ error: "Failed to setup MFA" });
    }
  });

  app.post("/api/auth/mfa/verify", isAuthenticated, async (req: any, res) => {
    try {
      const { token, secret, method = 'totp' } = req.body;
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      let verification;
      if (method === 'totp') {
        verification = MFAService.verifyTOTP(token, secret);
      } else if (method === 'sms') {
        verification = MFAService.verifySMSCode(userId, token);
      } else {
        return res.status(400).json({ error: 'Invalid MFA method' });
      }

      if (verification.isValid) {
        req.session.mfaVerified = true;
        res.json({ success: true, message: 'MFA verified successfully' });
      } else {
        res.status(400).json({ 
          error: 'Invalid MFA code',
          remainingAttempts: verification.remainingAttempts
        });
      }
    } catch (error: unknown) {
      console.error("Error verifying MFA:", error);
      res.status(500).json({ error: "Failed to verify MFA" });
    }
  });

  // Password strength validation
  app.post("/api/auth/password/validate", async (req, res) => {
    try {
      const { password, personalInfo } = req.body;
      const personalStrings: string[] = personalInfo
        ? (Object.values(personalInfo).filter((v): v is string => typeof v === "string"))
        : [];
      const validation = PasswordPolicyService.validatePasswordStrength(
        password,
        defaultPasswordPolicy,
        personalStrings
      );
      res.json(validation);
    } catch (error: unknown) {
      console.error("Error validating password:", error);
      res.status(500).json({ error: "Failed to validate password" });
    }
  });

  // GDPR compliance routes
  app.post("/api/gdpr/request", isAuthenticated, dataExportLimiter, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { requestType, requestData } = req.body;
      
      if (!Object.values(GDPRRequestType).includes(requestType)) {
        return res.status(400).json({ error: 'Invalid request type' });
      }

      const request = await GDPRComplianceService.submitGDPRRequest(userId, requestType, requestData);
      res.json(request);
    } catch (error: unknown) {
      console.error("Error submitting GDPR request:", error);
      res.status(500).json({ error: "Failed to submit GDPR request" });
    }
  });

  app.get("/api/gdpr/export/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const requestUserId = req.params.userId;
      const currentUserId = sessionUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Users can only download their own data
      if (requestUserId !== currentUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const dataPackage = await GDPRComplianceService.generateDataExport(requestUserId);
      res.json(dataPackage);
    } catch (error: unknown) {
      console.error("Error generating data export:", error);
      res.status(500).json({ error: "Failed to generate data export" });
    }
  });

  // Backup management routes (admin only)
  app.post("/api/admin/backup/create", isAuthenticated, requireRole(UserRole.ADMIN), adminOperationsLimiter, async (req, res) => {
    try {
      const backupConfig = req.body;
      const backup = await BackupRecoveryService.createDatabaseBackup(backupConfig);
      res.json(backup);
    } catch (error: unknown) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/admin/backup/stats", isAuthenticated, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const stats = await BackupRecoveryService.getBackupStatistics();
      res.json(stats);
    } catch (error: unknown) {
      console.error("Error getting backup stats:", error);
      res.status(500).json({ error: "Failed to get backup statistics" });
    }
  });
  
  // Stage 2: Health check and monitoring endpoints
  app.get("/health", async (req, res) => {
    try {
      const startTime = Date.now();
      await db.execute(sql`SELECT 1`);
      const dbResponseTime = Date.now() - startTime;
      
      const memUsage = process.memoryUsage();
      const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
      
      res.status(200).json({
        status: errorRate > 5 ? 'degraded' : 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: { status: 'connected', responseTime: dbResponseTime },
        memory: { used: Math.round(memUsage.heapUsed / 1024 / 1024) },
        requests: { total: requestCount, errors: errorCount, errorRate }
      });
    } catch (error: unknown) {
      errorCount++;
      res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
    }
  });

  app.get("/metrics", (req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
      requests_total: requestCount,
      errors_total: errorCount,
      uptime_seconds: process.uptime(),
      memory_usage_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      cache_size: cache.size,
      timestamp: Date.now()
    });
  });

  // Request counting middleware
  app.use((req, res, next) => {
    requestCount++;
    next();
  });
  
  // CSRF token endpoint (must be after auth setup)
  app.get("/api/csrf-token", isAuthenticated, (req: any, res) => {
    csrfProtection(req, res, () => {
      res.json({ csrfToken: req.csrfToken() });
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const email =
        req.user.email ||
        req.user.claims?.email ||
        (process.env.LOCAL_AUTH_BYPASS === "1" ? process.env.LOCAL_DEV_USER_EMAIL || "dev@surna.local" : undefined);

      let dbUser = await storage.getUser(userId).catch(() => undefined);
      if (!dbUser && email) {
        dbUser = await storage.getUserByEmail(email).catch(() => undefined);
      }
      if (dbUser) {
        return res.json(dbUser);
      }

      // Last resort: session stub (dev / first paint before DB row exists)
      res.json({
        id: userId,
        email: email ?? null,
        firstName: req.user.firstName || req.user.claims?.first_name || null,
        lastName: req.user.lastName || req.user.claims?.last_name || null,
        profileImageUrl: req.user.profileImageUrl || req.user.claims?.profile_image_url || "/avatars/me.png",
        emailVerified: req.user.emailVerified ?? true,
      });
    } catch (error: unknown) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Stage 9: AI & Smart Recommendations API Routes
  
  // Get personalized recommendations for user
  app.get('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const includeTypes = req.query.types ? 
        Array.isArray(req.query.types) ? req.query.types : [req.query.types] : 
        ['post', 'event', 'team', 'coach'];
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const algorithm = req.query.algorithm || 'hybrid';
      const refreshCache = req.query.refresh === 'true';

      const recommendations = await recommendationService.getRecommendations(userId, {
        includeTypes,
        limit,
        algorithm: algorithm as any,
        refreshCache
      });

      // Cache response for 5 minutes
      res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
      res.json(recommendations);
    } catch (error: unknown) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Track user interaction for ML learning
  app.post('/api/interactions', isAuthenticated, validateBody(insertUserInteractionSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const interactionData = {
        ...req.body,
        userId
      };

      await recommendationService.trackInteraction(interactionData);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error tracking interaction:", error);
      res.status(500).json({ message: "Failed to track interaction" });
    }
  });

  // Provide feedback on recommendations
  app.post('/api/recommendations/feedback', isAuthenticated, validateBody(insertRecommendationFeedbackSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const feedbackData = {
        ...req.body,
        userId
      };

      // Note: This would typically update the recommendation feedback table
      // For now, we'll just track it as an interaction
      await recommendationService.trackInteraction({
        userId,
        targetType: 'recommendation',
        targetId: feedbackData.recommendationId,
        interactionType: feedbackData.feedbackType,
        weight: feedbackData.explicitRating ? String(feedbackData.explicitRating / 5) : "1.0",
        metadata: { feedback: true, comments: feedbackData.comments }
      });

      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error processing recommendation feedback:", error);
      res.status(500).json({ message: "Failed to process feedback" });
    }
  });

  // Get recommended posts with full content
  app.get('/api/recommendations/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const limit = Math.min(Number(req.query.limit) || 10, 20);
      const algorithm = req.query.algorithm || 'hybrid';

      const recommendations = await recommendationService.getRecommendations(userId, {
        includeTypes: ['post'],
        limit,
        algorithm: algorithm as any
      });

      // Fetch full post details for recommended posts
      const postIds = recommendations.posts.map(r => r.contentId);
      if (postIds.length === 0) {
        return res.json({ items: [], algorithm: recommendations.algorithm });
      }

      const postsData = await db
        .select({
          post: posts,
          author: users,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(sql`${posts.id} = ANY(${postIds})`);

      // Merge recommendation data with post content
      const enrichedPosts = postsData.map(postData => {
        const recommendation = recommendations.posts.find(r => r.contentId === postData.post.id);
        return {
          ...postData.post,
          author: postData.author,
          recommendationScore: recommendation?.score || 0,
          recommendationReasons: recommendation?.reasons || []
        };
      });

      // Sort by recommendation score
      enrichedPosts.sort((a, b) => b.recommendationScore - a.recommendationScore);

      res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
      res.json({ 
        items: enrichedPosts, 
        algorithm: recommendations.algorithm,
        generatedAt: recommendations.generatedAt
      });
    } catch (error: unknown) {
      console.error("Error fetching recommended posts:", error);
      res.status(500).json({ message: "Failed to fetch recommended posts" });
    }
  });

  // Get recommended events with full content
  app.get('/api/recommendations/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const limit = Math.min(Number(req.query.limit) || 10, 20);
      const algorithm = req.query.algorithm || 'hybrid';

      const recommendations = await recommendationService.getRecommendations(userId, {
        includeTypes: ['event'],
        limit,
        algorithm: algorithm as any
      });

      // Fetch full event details for recommended events
      const eventIds = recommendations.events.map(r => r.contentId);
      if (eventIds.length === 0) {
        return res.json({ items: [], algorithm: recommendations.algorithm });
      }

      const eventsData = await db
        .select({
          event: events,
          organizer: users,
        })
        .from(events)
        .innerJoin(users, eq(events.organizerId, users.id))
        .where(sql`${events.id} = ANY(${eventIds})`);

      // Merge recommendation data with event content
      const enrichedEvents = eventsData.map(eventData => {
        const recommendation = recommendations.events.find(r => r.contentId === eventData.event.id);
        return {
          ...eventData.event,
          organizer: eventData.organizer,
          recommendationScore: recommendation?.score || 0,
          recommendationReasons: recommendation?.reasons || []
        };
      });

      // Sort by recommendation score
      enrichedEvents.sort((a, b) => b.recommendationScore - a.recommendationScore);

      res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
      res.json({ 
        items: enrichedEvents, 
        algorithm: recommendations.algorithm,
        generatedAt: recommendations.generatedAt
      });
    } catch (error: unknown) {
      console.error("Error fetching recommended events:", error);
      res.status(500).json({ message: "Failed to fetch recommended events" });
    }
  });

  // Social feed enhancement routes
  
  // Suggested users — canonical handler in server/routes/socialPhase3.ts (mounted before this block).

  // Get trending hashtags - Stage 2 cached
  app.get('/api/hashtags/trending', async (req: any, res) => {
    try {
      const trendingHashtags = await withCache('trending_hashtags', 120, async () => {
        // Cached for 2 minutes - trending data changes slowly
        return [
          { id: '1', tag: 'basketball', usageCount: 145, trendingScore: '95.5', isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', tag: 'workout', usageCount: 123, trendingScore: '88.2', isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '3', tag: 'training', usageCount: 98, trendingScore: '82.1', isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '4', tag: 'teamwork', usageCount: 87, trendingScore: '75.3', isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '5', tag: 'fitness', usageCount: 76, trendingScore: '69.8', isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '6', tag: 'soccer', usageCount: 65, trendingScore: '62.4', isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '7', tag: 'motivation', usageCount: 54, trendingScore: '58.7', isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '8', tag: 'champions', usageCount: 43, trendingScore: '45.2', isActive: true, createdAt: new Date(), updatedAt: new Date() }
        ];
      });
      
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      res.json(trendingHashtags);
    } catch (error: unknown) {
      errorCount++;
      console.error("Error fetching trending hashtags:", error);
      res.status(500).json({ message: "Failed to fetch trending hashtags" });
    }
  });


  // Share post — see CSRF-protected handler below (storage.sharePost)

  // Special setup route for first-time users (no CSRF needed)
  app.put('/api/user/setup', isAuthenticated, validateBody(updateUserProfileSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { username, displayName, sportsPreferences } = req.body;
      
      // If username is provided, check if it's already taken by another user
      if (username) {
        const existingUser = await db.select()
          .from(users)
          .where(and(
            eq(users.username, username),
            sql`${users.id} != ${userId}`
          ))
          .limit(1);
          
        if (existingUser.length > 0) {
          return res.status(409).json({ 
            message: "Username already taken", 
            field: "username" 
          });
        }
      }
      
      // Update user profile
      const updateData: any = {};
      if (username !== undefined) updateData.username = username;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (req.body.location !== undefined) updateData.location = req.body.location;
      if (req.body.skillLevel !== undefined) updateData.skillLevel = req.body.skillLevel;

      await ensureUserProfileColumn();
      const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const currentProfile = parseUserProfile(existing?.profileJson, existing);
      const nextProfile = mergeUserProfile(currentProfile, {
        ...(sportsPreferences !== undefined && Array.isArray(sportsPreferences) && sportsPreferences.length > 0
          ? { sports: sportsPreferences }
          : {}),
        profileSetupCompletedAt: new Date().toISOString(),
      });
      updateData.profileJson = nextProfile;
      if (sportsPreferences?.length) {
        updateData.primarySport = sportsPreferences[0];
        updateData.sport = sportsPreferences[0];
      }
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
        
      res.json(updatedUser);
    } catch (error: unknown) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // User profile routes
  app.put('/api/user/profile', isAuthenticated, csrfProtection, validateBody(updateUserProfileSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { username, displayName, ...otherFields } = req.body;
      
      // If username is provided, check if it's already taken by another user
      if (username) {
        const existingUser = await db.select()
          .from(users)
          .where(and(
            eq(users.username, username),
            sql`${users.id} != ${userId}`
          ))
          .limit(1);
          
        if (existingUser.length > 0) {
          return res.status(409).json({ 
            message: "Username already taken", 
            field: "username" 
          });
        }
      }
      
      // Update user profile
      const updateData: any = {};
      if (username !== undefined) updateData.username = username;
      if (displayName !== undefined) updateData.displayName = displayName;
      Object.assign(updateData, otherFields);
      
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
        
      res.json(updatedUser);
    } catch (error: unknown) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Check username availability
  app.get('/api/user/check-username/:username', isAuthenticated, async (req: any, res) => {
    try {
      const { username } = req.params;
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Validate username format
      try {
        usernameSchema.parse(username);
      } catch (validationError: any) {
        return res.status(400).json({ 
          available: false, 
          message: validationError.errors?.[0]?.message || "Invalid username format" 
        });
      }
      
      // Check if username exists (excluding current user)
      const existingUser = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.username, username),
          sql`${users.id} != ${userId}`
        ))
        .limit(1);
        
      const available = existingUser.length === 0;
      
      res.json({ 
        available,
        message: available ? "Username is available" : "Username is already taken"
      });
    } catch (error: unknown) {
      console.error("Error checking username:", error);
      res.status(500).json({ message: "Failed to check username" });
    }
  });

  app.get('/api/posts/recent', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 15, 30);
      const rows = await withCache(`posts_recent_${limit}`, 30, async () => {
        const result = await db.execute(sql`
        SELECT p.id, p.author_id, p.content, p.image_url, p.media_type, p.sport, p.likes_count, p.comments_count, p.created_at,
               u.id as author_id_ref, u.display_name as author_display_name, u.first_name as author_first_name, u.profile_image_url as author_profile_image_url, u.username as author_username
        FROM posts p
        INNER JOIN users u ON p.author_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `);
        return result.rows || [];
      });

      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json((rows as any[]).map((r: any) => ({
        id: r.id,
        authorId: r.author_id,
        content: r.content,
        imageUrl: r.image_url,
        mediaType: r.media_type,
        sport: r.sport,
        likesCount: r.likes_count,
        commentsCount: r.comments_count,
        createdAt: r.created_at,
        author: {
          id: r.author_id_ref,
          displayName: r.author_display_name,
          firstName: r.author_first_name,
          profileImageUrl: r.author_profile_image_url,
          username: r.author_username,
        },
      })));
    } catch (error: unknown) {
      console.error("Error fetching recent posts:", error);
      res.status(500).json({ message: "Failed to fetch recent posts" });
    }
  });

  // Personalized feed (alias for keyset pagination used by home + feed)
  app.get('/api/posts/feed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : undefined;
      const result = await storage.getFeedPostsKeyset(userId, limit, cursor);
      res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=300');
      res.json({
        items: result.items,
        nextCursor: result.nextCursor,
        totalCount: result.items.length,
      });
    } catch (error: unknown) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // Ultra-fast feed endpoint with keyset pagination and caching
  app.get('/api/posts/feed-keyset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : undefined;
      
      // Use optimized keyset pagination
      const result = await storage.getFeedPostsKeyset(userId, limit, cursor);
      
      // Set aggressive caching headers for performance
      res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=300');
      res.setHeader('X-Performance', 'ultra-fast-feed');
      
      res.json({
        items: result.items,
        nextCursor: result.nextCursor,
        totalCount: result.items.length
      });
    } catch (error: unknown) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // Post routes with cursor-based pagination
  app.get('/api/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

      const whereCondition = cursor 
        ? and(eq(posts.authorId, userId), lt(posts.createdAt, cursor))
        : eq(posts.authorId, userId);

      const rows = await db
        .select({
          post: posts,
          author: users,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(whereCondition)
        .orderBy(desc(posts.createdAt))
        .limit(limit + 1);

      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? rows[limit].post.createdAt : null;
      
      res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
      res.json({ items, nextCursor });
    } catch (error: unknown) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post('/api/posts', isAuthenticated, requireEmailVerified, csrfProtection, validateBody(insertPostSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const postData = {
        ...req.body,
        content: typeof req.body.content === "string" ? sanitizePlainText(req.body.content) : req.body.content,
      };
      
      const post = await storage.createPost(userId, postData);
      res.json(post);
    } catch (error: unknown) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.patch('/api/posts/:id', isAuthenticated, csrfProtection, validateBody(z.object({
    content: z.string().min(1).max(5000).optional(),
    sport: z.string().max(64).nullable().optional(),
    location: z.string().max(256).nullable().optional(),
  }).refine((data) => data.content !== undefined || data.sport !== undefined || data.location !== undefined, {
    message: "At least one field is required",
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const post = await storage.updatePost(userId, req.params.id, req.body);
      if (!post) {
        return res.status(404).json({ message: "Post not found or not editable" });
      }
      res.json(post);
    } catch (error: unknown) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete('/api/posts/:id', isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const deleted = await storage.deletePost(userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Post not found or not deletable" });
      }
      res.json({ ok: true });
    } catch (error: unknown) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  app.post('/api/posts/:id/like', isAuthenticated, likeLimiter, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const postId = req.params.id;
      const liked = await storage.likePost(userId, postId);
      res.json({ liked });
    } catch (error: unknown) {
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  app.post('/api/posts/:id/unlike', isAuthenticated, likeLimiter, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const postId = req.params.id;
      const unliked = await storage.unlikePost(userId, postId);
      res.json({ unliked });
    } catch (error: unknown) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Failed to unlike post" });
    }
  });

  app.post("/api/content/report", isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { contentType, contentId, reason, description, reportedUserId } = req.body || {};
      if (!contentType || !contentId || !reason) {
        return res.status(400).json({ message: "contentType, contentId, and reason are required" });
      }
      const flagged = await ModerationService.flagContent(userId, {
        contentType: String(contentType),
        contentId: String(contentId),
        reason: String(reason),
        description: description ? String(description) : undefined,
        reportedUserId: reportedUserId ? String(reportedUserId) : undefined,
      });
      res.json({ ok: true, id: flagged?.id });
    } catch (error: unknown) {
      console.error("Error reporting content:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  app.post('/api/posts/:postId/comment', isAuthenticated, commentLimiter, csrfProtection, validateBody(z.object({ content: z.string().min(1) })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const content = sanitizePlainText(String(req.body.content || ""));
      const { postId } = req.params;

      const comment = await storage.addComment(postId, userId, content);
      res.json(comment);
    } catch (error: unknown) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  app.post('/api/comments/:commentId/reply', isAuthenticated, commentLimiter, csrfProtection, validateBody(z.object({ content: z.string().min(1) })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { commentId } = req.params;
      const content = sanitizePlainText(String(req.body.content || ""));

      const comment = await storage.addCommentReply(commentId, userId, content);
      res.json(comment);
    } catch (error: unknown) {
      console.error("Error adding comment reply:", error);
      res.status(500).json({ message: "Failed to add comment reply" });
    }
  });

  app.put('/api/comments/:commentId', isAuthenticated, commentLimiter, csrfProtection, validateBody(z.object({ content: z.string().min(1) })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { commentId } = req.params;
      const { content } = req.body;
      
      const success = await storage.editComment(commentId, userId, content);
      if (!success) {
        return res.status(403).json({ message: "Not authorized to edit this comment" });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error editing comment:", error);
      res.status(500).json({ message: "Failed to edit comment" });
    }
  });

  app.delete('/api/comments/:commentId', isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { commentId } = req.params;
      
      const success = await storage.deleteComment(commentId, userId);
      if (!success) {
        return res.status(403).json({ message: "Not authorized to delete this comment" });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  app.get('/api/comments/:commentId/replies', async (req, res) => {
    try {
      const { commentId } = req.params;
      const replies = await storage.getCommentReplies(commentId);
      res.json(replies);
    } catch (error: unknown) {
      console.error("Error fetching comment replies:", error);
      res.status(500).json({ message: "Failed to fetch comment replies" });
    }
  });

  app.post('/api/posts/:postId/share', isAuthenticated, csrfProtection, validateBody(z.object({ shareType: z.string().optional() })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { postId } = req.params;
      const { shareType } = req.body;
      
      await storage.sharePost(userId, postId, shareType);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error sharing post:", error);
      res.status(500).json({ message: "Failed to share post" });
    }
  });

  app.post('/api/posts/:postId/save', isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { postId } = req.params;
      
      await storage.savePost(userId, postId);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error saving post:", error);
      res.status(500).json({ message: "Failed to save post" });
    }
  });

  app.delete('/api/posts/:postId/save', isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { postId } = req.params;
      
      await storage.unsavePost(userId, postId);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error unsaving post:", error);
      res.status(500).json({ message: "Failed to unsave post" });
    }
  });

  app.get('/api/posts/saved', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const collectionName = req.query.collection as string | undefined;
      
      const savedPosts = await storage.getSavedPosts(userId, collectionName);
      res.json(savedPosts);
    } catch (error: unknown) {
      console.error("Error fetching saved posts:", error);
      res.status(500).json({ message: "Failed to fetch saved posts" });
    }
  });

  // Team routes — canonical handlers live in server/features/teams/teams.router.ts
  // (mounted at /api/teams before this block; duplicates here were dead code).

  // Coaches — canonical handler in server/routes/phase8Profile.ts (mounted before this block).

  // Message routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error: unknown) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/messages/:otherUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { otherUserId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

      const whereCondition = cursor 
        ? and(
            or(
              and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
              and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
            ),
            lt(messages.createdAt, cursor)
          )
        : or(
            and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
            and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
          );

      const rows = await db
        .select({
          message: messages,
          sender: users,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(whereCondition)
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1);

      const items = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? rows[limit].message.createdAt : null;
      
      res.json({ items, nextCursor });
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, requireEmailVerified, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const messageData = insertMessageSchema.parse(req.body);
      
      const message = await storage.sendMessage(userId, messageData);
      res.json(message);
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Legacy toggle follow — superseded by POST /api/users/:id/follow + DELETE /api/users/:id/unfollow
  // (Phase 3 social router registered first)

  // NOTE: Events endpoints moved to events feature module
  // app.get('/api/events', async (req, res) => {
  //   try {
  //     const limit = parseInt(req.query.limit as string) || 20;
  //     const offset = parseInt(req.query.offset as string) || 0;
  //     
  //     const events = await storage.getEvents(limit, offset);
  //     res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
  //     res.json(events);
  //   } catch (error) {
  //     console.error("Error fetching events:", error);
  //     res.status(500).json({ message: "Failed to fetch events" });
  //   }
  // });

  // app.post('/api/events', isAuthenticated, async (req: any, res) => {
  //   try {
  //     const userId = req.user.id;
  //     const eventData = insertEventSchema.parse(req.body);
  //     
  //     const event = await storage.createEvent(userId, eventData);
  //     res.json(event);
  //   } catch (error) {
  //     console.error("Error creating event:", error);
  //     res.status(500).json({ message: "Failed to create event" });
  //   }
  // });

  // Legacy join — use POST /api/events/:id/rsvp (canonical events.router.ts)
  /*
  app.post('/api/events/:eventId/join', isAuthenticated, requireEmailVerified, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { eventId } = req.params;
      
      const isRegistered = await storage.isEventRegistered(eventId, userId);
      
      if (isRegistered) {
        return res.status(400).json({ message: "Already registered for this event" });
      }
      
      await storage.joinEvent(eventId, userId);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error joining event:", error);
      res.status(500).json({ message: "Failed to join event" });
    }
  });
  */

  // Phase 4: Live Streaming routes
  app.post('/api/streams/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const streamData = insertStreamSessionSchema.parse({
        ...req.body,
        streamerId: userId,
        status: 'live',
        startedAt: new Date(),
      });

      const [stream] = await db.insert(streamSessions).values(streamData).returning();
      res.json(stream);
    } catch (error: unknown) {
      console.error("Error creating stream:", error);
      res.status(500).json({ message: "Failed to create stream" });
    }
  });

  app.get('/api/streams/:id', async (req, res) => {
    try {
      const [stream] = await db
        .select()
        .from(streamSessions)
        .where(eq(streamSessions.id, req.params.id))
        .limit(1);

      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }

      res.json(stream);
    } catch (error: unknown) {
      console.error("Error fetching stream:", error);
      res.status(500).json({ message: "Failed to fetch stream" });
    }
  });

  app.post('/api/streams/:id/end', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const [stream] = await db
        .update(streamSessions)
        .set({
          status: 'ended',
          endedAt: new Date(),
        })
        .where(
          and(
            eq(streamSessions.id, req.params.id),
            eq(streamSessions.streamerId, userId)
          )
        )
        .returning();

      if (!stream) {
        return res.status(404).json({ message: "Stream not found or unauthorized" });
      }

      res.json(stream);
    } catch (error: unknown) {
      console.error("Error ending stream:", error);
      res.status(500).json({ message: "Failed to end stream" });
    }
  });

  app.get('/api/streams/active', async (req, res) => {
    try {
      const activeStreams = await db
        .select({
          stream: streamSessions,
          streamer: users,
        })
        .from(streamSessions)
        .innerJoin(users, eq(streamSessions.streamerId, users.id))
        .where(eq(streamSessions.status, 'live'))
        .orderBy(desc(streamSessions.startedAt))
        .limit(20);

      res.json(activeStreams);
    } catch (error: unknown) {
      console.error("Error fetching active streams:", error);
      res.status(500).json({ message: "Failed to fetch active streams" });
    }
  });

  const SEARCH_CATEGORY_SPORTS: Record<string, string> = {
    football: "Football",
    gaa: "GAA",
    rugby: "Rugby",
    basketball: "Basketball",
    cricket: "Cricket",
    cycling: "Cycling",
    running: "Running",
  };

  async function searchTeamsWithMemberCount(whereClause: any, limit: number) {
    return db
      .select({
        id: teams.id,
        name: teams.name,
        sport: teams.sport,
        description: teams.description,
        logo: teams.logo,
        createdAt: teams.createdAt,
        memberCount: sql<number>`coalesce(count(${teamMembers.id}), 0)::int`,
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(whereClause)
      .groupBy(teams.id)
      .limit(limit);
  }

  app.get("/api/search/trending", async (_req, res) => {
    try {
      const terms = await withCache("search_trending_terms", 120, async () => [
        "basketball",
        "5-a-side",
        "GAA training",
        "rugby league",
        "park run",
        "coaches near me",
      ]);
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      res.json({ terms });
    } catch (error: unknown) {
      console.error("Error fetching trending searches:", error);
      res.status(500).json({ message: "Failed to fetch trending searches" });
    }
  });

  app.get("/api/ads/search-placement", async (_req, res) => {
    try {
      const ad = await withCache("search_placement_ad", 300, async () => ({
        id: "search-ad-1",
        brandName: "SURNA Pro",
        title: "Gear up for your next match",
        imageUrl:
          "https://images.unsplash.com/photo-1519861151114-85af1c2c7b8b?w=200&h=200&fit=crop",
        ctaUrl: "/marketplace",
        ctaLabel: "Learn More",
      }));
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      res.json({ ad });
    } catch (error: unknown) {
      console.error("Error fetching search ad:", error);
      res.json({ ad: null });
    }
  });

  app.get("/api/recommendations/undiscovered", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      const sportPref = (req.query.sport as string) || user?.sport || undefined;
      const limit = Math.min(Number(req.query.limit) || 12, 24);

      const recommendations = await recommendationService.getRecommendations(userId, {
        includeTypes: ["event", "team", "coach"],
        limit,
        algorithm: "hybrid",
      });

      const items: Array<{
        id: string;
        type: "event" | "team" | "coach";
        title: string;
        subtitle?: string;
        imageUrl?: string | null;
        sport?: string | null;
      }> = [];

      const eventIds = recommendations.events.map((r) => r.contentId);
      if (eventIds.length > 0) {
        const rows = await db.select().from(events).where(inArray(events.id, eventIds)).limit(limit);
        for (const ev of rows) {
          if (sportPref && ev.sport && ev.sport.toLowerCase() !== sportPref.toLowerCase()) continue;
          items.push({
            id: ev.id,
            type: "event",
            title: ev.title,
            subtitle: ev.location || ev.sport || undefined,
            imageUrl: null,
            sport: ev.sport,
          });
        }
      }

      const teamIds = recommendations.teams.map((r) => r.contentId);
      if (teamIds.length > 0) {
        const rows = await db.select().from(teams).where(inArray(teams.id, teamIds)).limit(limit);
        for (const t of rows) {
          if (sportPref && t.sport && t.sport.toLowerCase() !== sportPref.toLowerCase()) continue;
          items.push({
            id: t.id,
            type: "team",
            title: t.name,
            subtitle: t.sport || undefined,
            imageUrl: t.logo,
            sport: t.sport,
          });
        }
      }

      const coachIds = recommendations.coaches.map((r) => r.contentId);
      if (coachIds.length > 0) {
        const coachRows = await storage.getCoaches(limit, 0, sportPref);
        for (const c of coachRows) {
          if (coachIds.includes(c.id)) {
            items.push({
              id: c.id,
              type: "coach",
              title: `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim() || "Coach",
              subtitle: c.user.sport || c.specialties?.[0] || undefined,
              imageUrl: c.user.profileImageUrl,
              sport: c.user.sport,
            });
          }
        }
      }

      res.setHeader("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
      res.json({ items: items.slice(0, limit), sport: sportPref ?? null });
    } catch (error: unknown) {
      console.error("Error fetching undiscovered recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Search routes
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const { q: queryRaw, type, sport: sportParam, category, location } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;
      const userId = sessionUserId(req);
      const query = typeof queryRaw === "string" ? queryRaw.trim() : "";
      const categorySport =
        typeof category === "string" ? SEARCH_CATEGORY_SPORTS[category] : undefined;
      const effectiveSport = (sportParam as string) || categorySport;

      const results: any = {
        users: [],
        teams: [],
        events: [],
        coaches: [],
        places: [],
        products: [],
        challenges: [],
      };

      const isBrowse = Boolean(category) && query.length < 2;
      if (!isBrowse && query.length < 2) {
        return res.json(results);
      }

      const likeQuery = isBrowse ? "" : query;
      const nameMatch = likeQuery
        ? sql`LOWER(${users.firstName} || ' ' || ${users.lastName}) LIKE LOWER(${`%${likeQuery}%`})`
        : sql`true`;

      const shouldFetch = (section: string) => !type || type === section || type === "all";

      if (category === "coaches" || (shouldFetch("coaches") && (likeQuery || effectiveSport))) {
        const coachList = await storage.getCoaches(limit, 0, effectiveSport);
        results.coaches = coachList
          .filter((c) => {
            if (!likeQuery) return true;
            const name = `${c.user.firstName || ""} ${c.user.lastName || ""}`.toLowerCase();
            return name.includes(likeQuery.toLowerCase());
          })
          .map((c) => ({
            id: c.id,
            userId: c.userId,
            hourlyRate: c.hourlyRate,
            profileImageUrl: c.user.profileImageUrl,
            sport: c.user.sport,
            firstName: c.user.firstName,
            lastName: c.user.lastName,
            displayName: c.user.displayName,
          }));
      }

      if (category === "marketplace" || (shouldFetch("products") && likeQuery)) {
        const productSearch = await searchService.searchProducts(
          { query: likeQuery || undefined, sportTypes: effectiveSport ? [effectiveSport] : undefined },
          limit,
          0,
          userId,
        );
        results.products = productSearch.products;
      }

      if (category === "instant-join") {
        const instantTeams = await storage.getInstantTeams(
          effectiveSport ? { sport: effectiveSport, status: "active" } : { status: "active" },
        );
        results.teams = instantTeams.slice(0, limit).map((t: any) => ({
          id: t.id,
          name: t.name,
          sport: t.sport,
          description: t.description,
          imageUrl: t.imageUrl,
          memberCount: t.playersJoined ?? 0,
          isInstant: true,
        }));
        return res.json(results);
      }

      if (category === "challenges") {
        const { challengesRepo } = await import("./features/challenges/challenges.repo");
        let matches = await challengesRepo.getMatches({
          status: "pending,invited,accepted,live,disputed",
          visibility: "public",
          sport: effectiveSport,
          limit: limit * 2,
        });
        if (likeQuery) {
          const q = likeQuery.toLowerCase();
          matches = matches.filter((m) => m.title?.toLowerCase().includes(q));
        }
        results.challenges = matches.slice(0, limit).map((m: any) => {
          const loc = m.location && typeof m.location === "object" ? m.location : null;
          return {
            id: m.id,
            title: m.title,
            sport: m.sport,
            type: m.type,
            status: m.status,
            timeStart: m.timeStart ?? null,
            location: loc?.address ?? null,
          };
        });
        return res.json(results);
      }

      if (!type || type === "users" || type === "all") {
        const userConditions = [nameMatch];
        if (effectiveSport) {
          userConditions.push(sql`LOWER(${users.sport}) = LOWER(${effectiveSport})`);
        }
        const usersResult = await db
          .select()
          .from(users)
          .where(and(...userConditions))
          .limit(limit);
        results.users = usersResult.map((u) => toPublicUser(u));
      }

      if (
        category === "teams" ||
        !type ||
        type === "teams" ||
        type === "all" ||
        effectiveSport
      ) {
        const teamConditions: any[] = [];
        if (likeQuery) {
          teamConditions.push(sql`LOWER(${teams.name}) LIKE LOWER(${`%${likeQuery}%`})`);
        }
        if (effectiveSport) {
          teamConditions.push(eq(teams.sport, effectiveSport));
        }
        if (teamConditions.length > 0) {
          results.teams = await searchTeamsWithMemberCount(and(...teamConditions), limit);
        } else if (category === "teams") {
          results.teams = await searchTeamsWithMemberCount(sql`true`, limit);
        }
      }

      if (category === "events" || !type || type === "events" || type === "all" || effectiveSport) {
        const eventConditions: any[] = [];
        if (likeQuery) {
          eventConditions.push(
            or(
              sql`LOWER(${events.title}) LIKE LOWER(${`%${likeQuery}%`})`,
              sql`LOWER(${events.location}) LIKE LOWER(${`%${likeQuery}%`})`,
            )!,
          );
        }
        if (effectiveSport) {
          eventConditions.push(eq(events.sport, effectiveSport));
        }
        if (location) {
          eventConditions.push(sql`LOWER(${events.location}) LIKE LOWER(${`%${location}%`})`);
        }
        if (eventConditions.length > 0) {
          results.events = await db
            .select()
            .from(events)
            .where(and(...eventConditions))
            .limit(limit);
        } else if (category === "events") {
          results.events = await db.select().from(events).limit(limit);
        }
      }

      if (category === "places" || shouldFetch("places")) {
        if (likeQuery || effectiveSport || category === "places") {
          results.places = await storage.searchPlaces(
            likeQuery,
            effectiveSport ? { sport: effectiveSport } : undefined,
            limit,
          );
        }
      }

      let routes: unknown[] = [];
      if (query.length >= 2) {
        const like = `%${query.toLowerCase()}%`;
        const routesQ = await db.execute(sql`
          SELECT id, title, sport, location, starts_at AS "startsAt"
          FROM events
          WHERE route_coordinates IS NOT NULL
            AND jsonb_array_length(route_coordinates) > 1
            AND (LOWER(title) LIKE ${like} OR LOWER(COALESCE(sport, '')) LIKE ${like})
          LIMIT ${limit}
        `);
        routes = routesQ.rows;
      }

      const { getBlockedUserIds } = await import("./infrastructure/phase3Social");
      const blockedIds = userId ? await getBlockedUserIds(userId) : new Set<string>();
      if (blockedIds.size > 0) {
        results.users = (results.users ?? []).filter((u: { id: string }) => !blockedIds.has(u.id));
        results.coaches = (results.coaches ?? []).filter(
          (c: { userId?: string; id: string }) => !blockedIds.has(c.userId || c.id),
        );
      }
      res.json({
        ...results,
        players: results.users,
        venues: results.places,
        routes,
      });
    } catch (error: unknown) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });
  
  // Player directory (query params) — must be registered before /api/users/:id
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims?.sub || req.user.id;
      const sport = typeof req.query.sport === "string" ? req.query.sport : undefined;
      const position = typeof req.query.position === "string" ? req.query.position : undefined;
      const location = typeof req.query.location === "string" ? req.query.location : undefined;
      const limit = Math.min(parseInt(String(req.query.limit || "30"), 10) || 30, 100);
      const filters: any[] = [eq(users.banned, false), ne(users.id, currentUserId)];
      if (sport) filters.push(ilike(users.sport, `%${sport}%`));
      if (position) filters.push(ilike(users.position, `%${position}%`));
      if (location) filters.push(ilike(users.location, `%${location}%`));
      const rows = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          sport: users.sport,
          position: users.position,
          skillLevel: users.skillLevel,
          location: users.location,
          bio: users.bio,
        })
        .from(users)
        .where(and(...filters))
        .limit(limit);
      res.json(rows);
    } catch (error: unknown) {
      console.error("Error in /api/users search:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // User profile routes
  app.get('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = sessionUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if current user is following this user
      const isFollowing = await storage.isFollowing(currentUserId, userId);
      
      // Get real user stats
      const [followersCount, followingCount, postsCount] = await Promise.all([
        storage.getFollowersCount(userId),
        storage.getFollowingCount(userId),
        storage.getPostsCount(userId)
      ]);
      
      const userWithStats = enrichUserRow({
        ...user,
        isFollowing,
        followersCount,
        followingCount,
        postsCount,
      } as any);
      userWithStats.profileCompletion = profileCompletionPercent(user, userWithStats.profile);

      if (currentUserId !== userId && userWithStats.profile?.gearProfile) {
        userWithStats.profile = { ...userWithStats.profile, gearProfile: undefined };
      }

      if (currentUserId !== userId) {
        try {
          const { recordProfileView } = await import("./services/phase8ProfileService");
          await recordProfileView(userId, currentUserId);
        } catch (viewErr) {
          console.warn("[Phase8-3] Profile view tracking skipped:", viewErr);
        }
      }

      res.json(userWithStats);
    } catch (error: unknown) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  const userProfilePatchSchema = z.object({
    tagline: z.string().max(200).optional(),
    bio: z.string().max(4000).optional(),
    location: z.string().max(200).optional(),
    displayName: z.string().max(80).optional(),
    primarySport: z.string().max(60).optional(),
    position: z.string().max(80).optional(),
    skillLevel: z.string().max(40).optional(),
    availability: z.string().max(200).optional(),
    lookingFor: z.string().max(200).optional(),
    interests: z.array(z.string().max(60)).max(24).optional(),
    sports: z.array(z.string().max(60)).max(12).optional(),
    activities: z.array(z.string().max(80)).max(16).optional(),
    lookingForTags: z.array(z.string().max(40)).max(8).optional(),
    favoriteTeams: z.array(z.string().max(80)).max(12).optional(),
    highlights: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().max(200),
          description: z.string().max(1000).optional(),
          year: z.string().max(20).optional(),
          emoji: z.string().max(8).optional(),
        }),
      )
      .max(20)
      .optional(),
    socialLinks: z
      .array(z.object({ platform: z.string().max(40), url: z.string().url().max(500) }))
      .max(6)
      .optional(),
    media: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(["image", "video"]),
          url: z.string().url().max(2000),
          title: z.string().max(200).optional(),
        }),
      )
      .max(12)
      .optional(),
    markSetupComplete: z.boolean().optional(),
    onboardingSkipped: z.boolean().optional(),
    gearProfile: gearProfileSchema.optional(),
    weightClass: z.string().max(40).optional(),
    fightRecordWins: z.number().int().min(0).optional(),
    fightRecordLosses: z.number().int().min(0).optional(),
    fightRecordDraws: z.number().int().min(0).optional(),
    fightRecordKos: z.number().int().min(0).optional(),
    stance: z.string().max(40).optional(),
    amateurOrPro: z.enum(["amateur", "pro"]).optional(),
    iabaNumber: z.string().max(40).optional(),
    medicalClearanceExpiry: z.string().datetime().optional().or(z.string().max(40)),
    gymAffiliation: z.string().max(200).optional(),
  });

  app.get("/api/users/me/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await ensureUserProfileColumn();
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const enriched = enrichUserRow(user as any);
      enriched.profileCompletion = profileCompletionPercent(user, enriched.profile);
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching me profile:", error);
      res.status(500).json({ message: "Failed to load profile" });
    }
  });

  app.get("/api/user/map-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { MapPreferencesService } = await import("./services/mapPreferencesService");
      const settings = await MapPreferencesService.getMapSettings(userId);
      res.json(settings);
    } catch (error: unknown) {
      console.error("Error fetching map preferences:", error);
      res.status(500).json({ message: "Failed to fetch map preferences" });
    }
  });

  app.patch("/api/user/map-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { MapPreferencesService } = await import("./services/mapPreferencesService");
      const settings = await MapPreferencesService.patchMapSettings(userId, req.body ?? {});
      res.json(settings);
    } catch (error: unknown) {
      console.error("Error updating map preferences:", error);
      res.status(500).json({ message: "Failed to update map preferences" });
    }
  });

  app.get("/api/user/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { UserPrivacySettingsService } = await import("./services/userPrivacySettingsService");
      const settings = await UserPrivacySettingsService.getSettings(userId);
      res.json(settings);
    } catch (error: unknown) {
      console.error("Error fetching user privacy:", error);
      res.status(500).json({ message: "Failed to fetch privacy settings" });
    }
  });

  app.patch("/api/user/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { UserPrivacySettingsService } = await import("./services/userPrivacySettingsService");
      const settings = await UserPrivacySettingsService.patchSettings(userId, req.body ?? {});
      res.json({ success: true, settings });
    } catch (error: unknown) {
      console.error("Error updating user privacy:", error);
      res.status(500).json({ message: "Failed to update privacy settings" });
    }
  });

  app.get("/api/attendees/:entityType/:entityId", async (req: any, res) => {
    try {
      const { AttendeeService } = await import("./services/attendeeService");
      const entityType = String(req.params.entityType);
      const entityId = String(req.params.entityId);
      const limit = Math.min(parseInt(String(req.query.limit || "4"), 10) || 4, 10);
      const preview = await AttendeeService.getPreview(entityType as any, entityId, limit);
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
      res.json(preview);
    } catch (error: unknown) {
      console.error("Error fetching attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.patch("/api/users/me/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await ensureUserProfileColumn();
      const patch = userProfilePatchSchema.parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const currentProfile = parseUserProfile((user as any).profileJson, user);
      const profilePatch: Partial<typeof currentProfile> = {};
      if (patch.tagline !== undefined) profilePatch.tagline = patch.tagline;
      if (patch.interests !== undefined) profilePatch.interests = patch.interests;
      if (patch.sports !== undefined) profilePatch.sports = patch.sports;
      if (patch.activities !== undefined) profilePatch.activities = patch.activities;
      if (patch.highlights !== undefined) profilePatch.highlights = patch.highlights;
      if (patch.lookingForTags !== undefined) profilePatch.lookingFor = patch.lookingForTags;
      if (patch.favoriteTeams !== undefined) profilePatch.favoriteTeams = patch.favoriteTeams;
      if (patch.socialLinks !== undefined) profilePatch.socialLinks = patch.socialLinks;
      if (patch.media !== undefined) profilePatch.media = patch.media;
      if (patch.onboardingSkipped !== undefined) profilePatch.onboardingSkipped = patch.onboardingSkipped;
      if (patch.gearProfile !== undefined) {
        profilePatch.gearProfile = mergeGearProfile(currentProfile.gearProfile, patch.gearProfile);
      }
      if (patch.markSetupComplete) {
        profilePatch.profileSetupCompletedAt = new Date().toISOString();
      }

      const nextProfile = mergeUserProfile(currentProfile, profilePatch);
      const userUpdates: Record<string, unknown> = { updatedAt: new Date(), profileJson: nextProfile };
      if (patch.bio !== undefined) userUpdates.bio = patch.bio;
      if (patch.location !== undefined) userUpdates.location = patch.location;
      if (patch.displayName !== undefined) userUpdates.displayName = patch.displayName;
      if (patch.primarySport !== undefined) {
        userUpdates.primarySport = patch.primarySport;
        userUpdates.sport = patch.primarySport;
      }
      if (patch.position !== undefined) userUpdates.position = patch.position;
      if (patch.skillLevel !== undefined) userUpdates.skillLevel = patch.skillLevel;
      if (patch.availability !== undefined) userUpdates.availability = patch.availability;
      if (patch.lookingFor !== undefined) userUpdates.lookingFor = patch.lookingFor;
      if (patch.weightClass !== undefined) userUpdates.weightClass = patch.weightClass;
      if (patch.fightRecordWins !== undefined) userUpdates.fightRecordWins = patch.fightRecordWins;
      if (patch.fightRecordLosses !== undefined) userUpdates.fightRecordLosses = patch.fightRecordLosses;
      if (patch.fightRecordDraws !== undefined) userUpdates.fightRecordDraws = patch.fightRecordDraws;
      if (patch.fightRecordKos !== undefined) userUpdates.fightRecordKos = patch.fightRecordKos;
      if (patch.stance !== undefined) userUpdates.stance = patch.stance;
      if (patch.amateurOrPro !== undefined) userUpdates.amateurOrPro = patch.amateurOrPro;
      if (patch.iabaNumber !== undefined) userUpdates.iabaNumber = patch.iabaNumber;
      if (patch.medicalClearanceExpiry !== undefined) {
        userUpdates.medicalClearanceExpiry = new Date(patch.medicalClearanceExpiry);
      }
      if (patch.gymAffiliation !== undefined) userUpdates.gymAffiliation = patch.gymAffiliation;
      if (patch.gearProfile?.heightCm !== undefined) {
        userUpdates.heightCm = patch.gearProfile.heightCm;
      }

      const [updated] = await db.update(users).set(userUpdates).where(eq(users.id, userId)).returning();
      const enriched = enrichUserRow(updated as any);
      enriched.profileCompletion = profileCompletionPercent(updated, enriched.profile);
      res.json(enriched);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", details: error.errors });
      }
      console.error("Error patching user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get user followers
  // Followers/following — handled by Phase 3 social router
  
  // Individual post details
  app.get('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const postId = req.params.id;
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const [postData] = await db
        .select({
          post: posts,
          author: users,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.id, postId));
      
      if (!postData) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const isLiked = await storage.isPostLiked(userId, postId);
      const savedByMe = await storage.isPostSaved(userId, postId);
      
      // Get comments for the post
      const comments = await db
        .select({
          comment: postComments,
          author: users,
        })
        .from(postComments)
        .innerJoin(users, eq(postComments.authorId, users.id))
        .where(eq(postComments.postId, postId))
        .orderBy(asc(postComments.createdAt));

      // Look up the worker-generated media variants (small `_thumb`, large
      // `_medium`, plus the WebP/AVIF siblings) so the post detail surface
      // can render the bigger image while feed cards keep using the small
      // variant. Falls back to the post's raw `image_url` for legacy posts
      // that pre-date the resize worker.
      const mediaRow = await db.execute(sql`
        SELECT thumb_url        AS "thumbUrl",
               medium_url       AS "mediumUrl",
               thumb_webp_url   AS "thumbWebpUrl",
               medium_webp_url  AS "mediumWebpUrl",
               thumb_avif_url   AS "thumbAvifUrl",
               medium_avif_url  AS "mediumAvifUrl"
        FROM media
        WHERE post_id = ${postId} AND status = 'ready'
        ORDER BY created_at DESC
        LIMIT 1;
      `).then(r => r.rows[0] as any).catch(() => null);

      const variants = mediaRow ?? deriveImageVariants(postData.post.imageUrl) ?? {};

      const postWithDetails = {
        ...postData.post,
        // Explicit thumb/medium fields per the surface-aware thumbnail spec.
        // `imageUrl` is preserved unchanged for backward compatibility.
        thumbUrl:        variants.thumbUrl ?? postData.post.imageUrl ?? undefined,
        mediumUrl:       variants.mediumUrl ?? postData.post.imageUrl ?? undefined,
        thumbWebpUrl:    variants.thumbWebpUrl,
        mediumWebpUrl:   variants.mediumWebpUrl,
        thumbAvifUrl:    variants.thumbAvifUrl,
        mediumAvifUrl:   variants.mediumAvifUrl,
        author: postData.author,
        likedByMe: isLiked,
        savedByMe,
        isLiked,
        comments: comments.map(({ comment, author }) => ({ ...comment, author }))
      };
      
      res.json(postWithDetails);
    } catch (error: unknown) {
      console.error("Error fetching post details:", error);
      res.status(500).json({ message: "Failed to fetch post details" });
    }
  });

  // Event details — handled by /api/events feature router (registerFeatureRouters)

  // Enhanced Event Management Routes
  app.get("/api/events/:id/enhanced-details", async (req, res) => {
    try {
      const event = await eventManagementService.getEventDetails(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error: unknown) {
      console.error("Error fetching enhanced event details:", error);
      res.status(500).json({ message: "Failed to fetch event details" });
    }
  });

  // Legacy RSVP — superseded by server/features/events/events.router.ts
  /*
  app.post("/api/events/:id/rsvp", isAuthenticated, async (req: any, res) => {
    try {
      const { status, notes } = req.body; // 'attending', 'not_attending', 'maybe'
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const result = await eventManagementService.rsvpToEvent(
        req.params.id,
        userId,
        status,
        notes
      );
      
      res.json({ message: "RSVP updated successfully", result });
    } catch (error: unknown) {
      console.error("Error updating RSVP:", error);
      res.status(400).json({ message: errMsg(error) });
    }
  });
  */

  // Create event with recurring pattern
  app.post("/api/events/recurring", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { eventData, recurrence } = req.body;
      
      // Set organizer ID
      eventData.organizerId = userId;
      
      const event = await eventManagementService.createEvent(eventData, recurrence);
      res.json({ message: "Recurring event created successfully", event });
    } catch (error: unknown) {
      console.error("Error creating recurring event:", error);
      res.status(500).json({ message: "Failed to create recurring event" });
    }
  });

  // Create event update/announcement
  app.post("/api/events/:id/updates", isAuthenticated, async (req: any, res) => {
    try {
      const { title, content, type, priority } = req.body;
      const authorId = req.user?.claims?.sub;
      
      const update = await eventManagementService.createEventUpdate(
        req.params.id,
        authorId,
        title,
        content,
        type,
        priority
      );
      
      res.json({ message: "Event update created successfully", update });
    } catch (error: unknown) {
      console.error("Error creating event update:", error);
      res.status(403).json({ message: errMsg(error) });
    }
  });

  // Check in participant
  app.post("/api/events/:id/checkin/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const organizerId = req.user?.claims?.sub;
      
      const result = await eventManagementService.checkInParticipant(
        req.params.id,
        req.params.userId,
        organizerId
      );
      
      res.json({ message: "Participant checked in successfully", result });
    } catch (error: unknown) {
      console.error("Error checking in participant:", error);
      res.status(403).json({ message: errMsg(error) });
    }
  });

  // Skill-based team matching
  app.post("/api/events/:id/match-teams", isAuthenticated, async (req: any, res) => {
    try {
      const { criteria } = req.body;
      
      const teams = await eventManagementService.matchParticipantsBySkill(
        req.params.id,
        criteria
      );
      
      res.json({ message: "Teams matched successfully", teams });
    } catch (error: unknown) {
      console.error("Error matching teams:", error);
      res.status(500).json({ message: "Failed to match teams" });
    }
  });

  // Get organizer events with analytics
  app.get("/api/organizer/events", isAuthenticated, async (req: any, res) => {
    try {
      const organizerId = req.user?.claims?.sub;
      const events = await eventManagementService.getOrganizerEvents(organizerId);
      res.json(events);
    } catch (error: unknown) {
      console.error("Error fetching organizer events:", error);
      res.status(500).json({ message: "Failed to fetch organizer events" });
    }
  });

  // Update event analytics
  app.post("/api/events/:id/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const analytics = await eventManagementService.updateEventAnalytics(req.params.id);
      res.json({ message: "Analytics updated successfully", analytics });
    } catch (error: unknown) {
      console.error("Error updating event analytics:", error);
      res.status(500).json({ message: "Failed to update analytics" });
    }
  });

  // Communication & Notification Routes
  app.get("/api/teams/:id/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { channelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const messages = await communicationService.getChannelMessages(
        channelId,
        userId,
        limit,
        offset
      );
      
      res.json(messages);
    } catch (error: unknown) {
      console.error("Error fetching channel messages:", error);
      res.status(403).json({ message: errMsg(error) });
    }
  });

  // Send message to team channel
  app.post("/api/teams/:id/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { content, messageType, priority } = req.body;
      const senderId = req.user?.claims?.sub;
      const { channelId } = req.params;
      
      const message = await communicationService.sendChannelMessage(
        channelId,
        senderId,
        content,
        messageType,
        priority
      );
      
      res.json({ message: "Message sent successfully", data: message });
    } catch (error: unknown) {
      console.error("Error sending channel message:", error);
      res.status(403).json({ message: errMsg(error) });
    }
  });

  // Edit channel message
  app.put("/api/channels/messages/:messageId", isAuthenticated, async (req: any, res) => {
    try {
      const { content } = req.body;
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const result = await communicationService.editChannelMessage(
        req.params.messageId,
        userId,
        content
      );
      
      res.json({ message: "Message updated successfully", result });
    } catch (error: unknown) {
      console.error("Error editing message:", error);
      res.status(403).json({ message: errMsg(error) });
    }
  });

  // Delete channel message
  app.delete("/api/channels/messages/:messageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const result = await communicationService.deleteChannelMessage(
        req.params.messageId,
        userId
      );
      
      res.json({ message: "Message deleted successfully", result });
    } catch (error: unknown) {
      console.error("Error deleting message:", error);
      res.status(403).json({ message: errMsg(error) });
    }
  });

  // Notification feed + read routes: features/notifications router (mounted on /api at boot).
  // Send manual notification (admin only)
  app.post("/api/notifications/send", isAuthenticated, requireRole(UserRole.ADMIN), async (req: any, res) => {
    try {
      const { targetUserId, type, title, message, data } = req.body;
      
      const notification = await communicationService.sendNotification({
        userId: targetUserId,
        type,
        title,
        message,
        data
      });
      
      res.json({ message: "Notification sent successfully", notification });
    } catch (error: unknown) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Advanced Analytics Routes
  app.get("/api/analytics/teams/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { timeframe } = req.query;
      const analytics = await analyticsService.getTeamAnalytics(req.params.id, timeframe);
      res.json(analytics);
    } catch (error: unknown) {
      console.error("Error fetching team analytics:", error);
      res.status(500).json({ message: "Failed to fetch team analytics" });
    }
  });

  // Get event analytics
  app.get("/api/analytics/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const analytics = await analyticsService.getEventAnalytics(req.params.id);
      res.json(analytics);
    } catch (error: unknown) {
      console.error("Error fetching event analytics:", error);
      res.status(500).json({ message: "Failed to fetch event analytics" });
    }
  });

  // Get platform analytics (admin only)
  app.get("/api/analytics/platform", isAuthenticated, requireRole(UserRole.ADMIN), async (req: any, res) => {
    try {
      const { timeframe } = req.query;
      const analytics = await analyticsService.getPlatformAnalytics(timeframe);
      res.json(analytics);
    } catch (error: unknown) {
      console.error("Error fetching platform analytics:", error);
      res.status(500).json({ message: "Failed to fetch platform analytics" });
    }
  });

  // Compare teams
  app.post("/api/analytics/teams/compare", isAuthenticated, async (req: any, res) => {
    try {
      const { teamIds, metric } = req.body;
      const comparison = await analyticsService.compareTeams(teamIds, metric);
      res.json(comparison);
    } catch (error: unknown) {
      console.error("Error comparing teams:", error);
      res.status(500).json({ message: "Failed to compare teams" });
    }
  });

  // Get event trends for organizer
  app.get("/api/analytics/events/trends", isAuthenticated, async (req: any, res) => {
    try {
      const organizerId = req.user?.claims?.sub;
      const { timeframe } = req.query;
      const trends = await analyticsService.getEventTrends(organizerId, timeframe);
      res.json(trends);
    } catch (error: unknown) {
      console.error("Error fetching event trends:", error);
      res.status(500).json({ message: "Failed to fetch event trends" });
    }
  });

  // Calendar Integration Routes
  app.get("/api/calendar/export/ical", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { timeframe } = req.query;
      const icalData = await calendarService.exportUserEventsToICal(userId, timeframe);
      
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="surna-schedule.ics"');
      res.send(icalData);
    } catch (error: unknown) {
      console.error("Error exporting calendar:", error);
      res.status(500).json({ message: "Failed to export calendar" });
    }
  });

  // Export team calendar
  app.get("/api/calendar/teams/:id/export/ical", isAuthenticated, async (req: any, res) => {
    try {
      const { timeframe } = req.query;
      const icalData = await calendarService.exportTeamEventsToICal(req.params.id, timeframe);
      
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="team-events.ics"');
      res.send(icalData);
    } catch (error: unknown) {
      console.error("Error exporting team calendar:", error);
      res.status(500).json({ message: "Failed to export team calendar" });
    }
  });

  // Generate external calendar URLs
  app.post("/api/calendar/events/:id/external-urls", isAuthenticated, async (req: any, res) => {
    try {
      // Get event details
      const event = await db.select()
        .from(events)
        .where(eq(events.id, req.params.id))
        .limit(1);

      if (!event[0]) {
        return res.status(404).json({ message: "Event not found" });
      }

      const calendarEvent = {
        id: event[0].id,
        title: event[0].title,
        description: event[0].description || '',
        startDate: event[0].startDate,
        endDate: event[0].endDate || undefined,
        location: event[0].location || '',
        sport: event[0].sport || ''
      };

      const urls = {
        google: calendarService.generateGoogleCalendarUrl(calendarEvent),
        outlook: calendarService.generateOutlookCalendarUrl(calendarEvent),
        ical: `/api/events/${event[0].id}/ical`
      };

      res.json(urls);
    } catch (error: unknown) {
      console.error("Error generating calendar URLs:", error);
      res.status(500).json({ message: "Failed to generate calendar URLs" });
    }
  });

  // Get upcoming events for user
  app.get("/api/calendar/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { hours } = req.query;
      const upcoming = await calendarService.getUpcomingEvents(userId, parseInt(hours as string) || 24);
      res.json(upcoming);
    } catch (error: unknown) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  // Create calendar webhook
  app.post("/api/calendar/webhooks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { webhookUrl, events: eventTypes } = req.body;
      
      const webhook = await calendarService.createCalendarWebhook(userId, webhookUrl, eventTypes);
      res.json({ message: "Webhook created successfully", webhook });
    } catch (error: unknown) {
      console.error("Error creating calendar webhook:", error);
      res.status(500).json({ message: "Failed to create calendar webhook" });
    }
  });
  
  // Rating system
  app.post('/api/users/:id/rate', isAuthenticated, csrfProtection, validateBody(z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().optional()
  })), async (req: any, res) => {
    try {
      const raterId = sessionUserId(req);
      if (!raterId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { id: ratedUserId } = req.params;
      const { rating, comment } = req.body;
      
      // TODO: Implement rating system in storage
      // For now, just return success
      res.json({ success: true, rating, comment });
    } catch (error: unknown) {
      console.error("Error rating user:", error);
      res.status(500).json({ message: "Failed to rate user" });
    }
  });
  
  // Performance routes
  app.get('/api/user/performance', async (req, res) => {
    try {
      // For now, return mock performance data when not authenticated
      const mockPerformance = {
        level: 1,
        totalPoints: 33,
        pointsToNextLevel: 67,
        sport: 'general',
        metrics: {
          totalPoints: 33,
          eventsAttended: 0,
          teamsJoined: 1,
          challengesCompleted: 0,
          currentLevel: 1,
          workouts: 12,
          calories: 2456,
          minutes: 387
        },
        recentTransactions: [],
        availableRewards: []
      };
      res.json(mockPerformance);
    } catch (error: unknown) {
      console.error("Error fetching user performance:", error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.post('/api/user/redeem', isAuthenticated, csrfProtection, validateBody(z.object({
    rewardId: z.string()
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { rewardId } = req.body;
      
      const success = await storage.redeemReward(userId, rewardId);
      if (success) {
        res.json({ success: true, message: "Reward redeemed successfully!" });
      } else {
        res.status(400).json({ success: false, message: "Unable to redeem reward. Check points or availability." });
      }
    } catch (error: unknown) {
      console.error("Error redeeming reward:", error);
      res.status(500).json({ message: "Failed to redeem reward" });
    }
  });

  app.post('/api/user/points/add', isAuthenticated, csrfProtection, validateBody(z.object({
    points: z.number().min(1),
    reason: z.string(),
    description: z.string().optional()
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { points, reason, description } = req.body;

      const [callerUser] = await db.select({ isAdmin: usersTable.isAdmin, adminRole: usersTable.adminRole }).from(usersTable).where(eqDb(usersTable.id, userId));
      if (!callerUser?.isAdmin && !callerUser?.adminRole) {
        return res.status(403).json({ message: "Admin access required to add points" });
      }

      await storage.addPoints(userId, points, reason, description);
      res.json({ success: true, message: `Added ${points} points` });
    } catch (error: unknown) {
      console.error("Error adding points:", error);
      res.status(500).json({ message: "Failed to add points" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const { amount, currency = "usd", paymentType, description, metadata } = req.body;
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          userId,
          paymentType: paymentType || "one_time",
          ...metadata
        },
      });

      // Store payment record in database
      const [payment] = await db.insert(payments).values({
        amount: amount.toString(),
        currency,
        paymentMethod: "stripe",
        transactionId: paymentIntent.id,
        metadata,
        status: "pending"
      }).returning();

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id
      });
    } catch (error: unknown) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + errMsg(error) });
    }
  });

  app.post("/api/create-subscription", isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);

      if (!user || !user.email) {
        return res.status(400).json({ message: "User email required for subscription" });
      }

      // Check if user already has a Stripe customer
      // Note: stripeCustomerId field not in current schema
      // Using a simple approach without metadata for now
      let customerId: string | null = null; // Will create new customer
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.displayName || `${user.firstName} ${user.lastName}`,
          metadata: { userId }
        });
        customerId = customer.id;

        // Update user with Stripe customer ID
        // Note: stripeCustomerId field not in current schema
        // Store in user metadata instead if needed
      }

      // For now, create a simple subscription setup intent
      // In production, you'd have actual price IDs from Stripe dashboard
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId!,
        usage: 'off_session',
      });

      res.json({ 
        clientSecret: setupIntent.client_secret,
        customerId 
      });
    } catch (error: unknown) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Error creating subscription: " + errMsg(error) });
    }
  });

  app.post("/api/webhook/stripe", (_req, res) => {
    // Unverified legacy endpoint — disabled to prevent forged payment updates.
    res.status(410).json({
      message: "This webhook endpoint is disabled. Configure STRIPE_WEBHOOK_SECRET and use /api/webhooks/stripe.",
    });
  });

  // Get user's payment history
  app.get("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get user payments through orders relationship
      const userPayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          currency: payments.currency,
          status: payments.status,
          paymentMethod: payments.paymentMethod,
          transactionId: payments.transactionId,
          createdAt: payments.createdAt
        })
        .from(payments)
        .innerJoin(orders, eq(payments.orderId, orders.id))
        .where(eq(orders.userId, userId))
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(userPayments);
    } catch (error: unknown) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Order tracking (buyer/seller visibility)
  app.get("/api/orders/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));
      res.json({ orders: rows });
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/messenger/link-preview", isAuthenticated, async (req: any, res) => {
    try {
      const rawUrl = String(req.body?.url || "");
      if (!rawUrl) return res.status(400).json({ message: "url is required" });
      const parsed = new URL(rawUrl);
      res.json({
        url: parsed.toString(),
        title: parsed.hostname,
        description: `Preview from ${parsed.hostname}`,
        image: null,
      });
    } catch {
      res.status(400).json({ message: "Invalid URL" });
    }
  });

  app.post("/api/orders/create-from-payment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { paymentIntentId } = req.body || {};
      if (!paymentIntentId) return res.status(400).json({ message: "paymentIntentId required" });

      const { fulfillMarketplaceOrderFulfilled, getMarketplaceOrderConfirmation } = await import(
        "./services/phase5MoneyService"
      );
      const result = await fulfillMarketplaceOrderFulfilled(paymentIntentId, userId);
      if (!result) return res.status(404).json({ message: "Could not fulfill order" });

      const order = await getMarketplaceOrderConfirmation(userId, paymentIntentId);
      res.status(201).json({ orderId: result.orderId, order, fulfilled: true });
    } catch (error) {
      console.error("Error creating order from payment:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const allowed = ["pending", "confirmed", "dispatched", "delivered"];
      const status = String(req.body?.status || "");
      if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
      const [updated] = await db
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(orders.id, req.params.id), eq(orders.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Order not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Marketplace: Brand registration payment
  app.post("/api/marketplace/brand-registration", isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const { brandName, description } = req.body;
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (!brandName) {
        return res.status(400).json({ message: "Brand name is required" });
      }
      
      // Create payment intent for brand registration (e.g., $50 fee)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 5000, // $50 in cents
        currency: "usd",
        metadata: {
          type: "brand_registration",
          userId: userId,
          brandName: brandName,
          description: description || ""
        }
      });
      
      // Store payment record in database
      const [payment] = await db.insert(payments).values({
        amount: "50.00",
        currency: "usd",
        paymentMethod: "stripe",
        transactionId: paymentIntent.id,
        metadata: { brandName, description, userId, paymentType: "brand_registration" },
        status: "pending"
      }).returning();
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
        amount: 50,
        description: `Brand registration fee for ${brandName}`
      });
    } catch (error: unknown) {
      console.error("Error creating brand registration payment:", error);
      res.status(500).json({ message: "Error creating brand registration payment: " + errMsg(error) });
    }
  });

  // Marketplace: Product listing payment
  app.post("/api/marketplace/product-listing", isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const { productName, price, category } = req.body;
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (!productName) {
        return res.status(400).json({ message: "Product name is required" });
      }
      
      // Create payment intent for product listing (e.g., $10 fee)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000, // $10 in cents
        currency: "usd",
        metadata: {
          type: "product_listing",
          userId: userId,
          productName: productName,
          category: category || "",
          productPrice: price?.toString() || ""
        }
      });
      
      // Store payment record in database
      const [payment] = await db.insert(payments).values({
        amount: "10.00",
        currency: "usd",
        paymentMethod: "stripe",
        transactionId: paymentIntent.id,
        metadata: { productName, category, productPrice: price, userId, paymentType: "product_listing" },
        status: "pending"
      }).returning();
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
        amount: 10,
        description: `Product listing fee for ${productName}`
      });
    } catch (error: unknown) {
      console.error("Error creating product listing payment:", error);
      res.status(500).json({ message: "Error creating product listing payment: " + errMsg(error) });
    }
  });

  app.post('/api/user/points/remove', isAuthenticated, csrfProtection, validateBody(z.object({
    points: z.number().min(1),
    reason: z.string(),
    description: z.string().optional()
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { points, reason, description } = req.body;
      
      const [callerUserRemove] = await db.select({ isAdmin: usersTable.isAdmin, adminRole: usersTable.adminRole }).from(usersTable).where(eqDb(usersTable.id, userId));
      if (!callerUserRemove?.isAdmin && !callerUserRemove?.adminRole) {
        return res.status(403).json({ message: "Admin access required to remove points" });
      }

      await storage.removePoints(userId, points, reason, description);
      res.json({ success: true, message: `Removed ${points} points` });
    } catch (error: unknown) {
      console.error("Error removing points:", error);
      res.status(500).json({ message: "Failed to remove points" });
    }
  });

  // Enhanced coach routes — public read for discovery & demo profiles
  app.get('/api/coaches/:id', async (req: any, res) => {
    try {
      const coachId = req.params.id;
      await ensureCoachProfileColumnOnce();
      const coach = await storage.getCoachById(coachId);
      
      if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
      }
      
      res.json(enrichCoachRow(coach));
    } catch (error: unknown) {
      console.error("Error fetching coach:", error);
      res.status(500).json({ message: "Failed to fetch coach" });
    }
  });

  app.get("/api/coaches/:id/availability", async (req: any, res) => {
    try {
      await ensureCoachWeeklyAvailabilityColumn();
      await ensureCoachProfileColumnOnce();
      const coachId = req.params.id;
      const coach = await storage.getCoachById(coachId);
      if (!coach) return res.status(404).json({ message: "Coach not found" });
      const profile = parseCoachProfile(coach.profileJson, coach, coach.user);
      const weekly = mergeAvailability((coach as { weeklyAvailability?: unknown }).weeklyAvailability);
      const defaultDuration = profile.sessionDurations?.[0] ?? 60;
      const slots = generateBookableSlots(weekly, 14, defaultDuration);
      res.json({
        weekly,
        slots,
        hourlyRate: coach.hourlyRate,
        sessionDurations: profile.sessionDurations ?? [60],
        pricingPlans: profile.pricingPlans ?? [],
        bookingMode: profile.bookingMode ?? "hourly_slots",
      });
    } catch (error: unknown) {
      console.error("Error fetching coach availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.get("/api/coaches/me/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await ensureCoachWeeklyAvailabilityColumn();
      await ensureCoachProfileColumnOnce();
      const [row] = await db.select().from(coaches).where(eq(coaches.userId, userId)).limit(1);
      if (!row) return res.status(404).json({ message: "Coach profile not found" });
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const profile = parseCoachProfile(row.profileJson, row, user);
      res.json({
        coach: row,
        profile,
        weeklyAvailability: mergeAvailability(row.weeklyAvailability as unknown),
      });
    } catch (error: unknown) {
      console.error("Error fetching coach me:", error);
      res.status(500).json({ message: "Failed to load coach profile" });
    }
  });

  const coachApplySchema = z.object({
    phone: z.string().min(6).max(40),
    experience: z.string().min(1).max(20),
    certifications: z.string().max(4000).optional(),
    primarySports: z.array(z.string().min(1).max(60)).min(1).max(3),
    specializations: z.array(z.string().max(80)).max(12).optional(),
    skillLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]),
    hourlyRate: z.number().min(0).max(9999),
    availability: z.array(z.string().max(80)).min(1),
    sessionTypes: z.array(z.string().max(80)).min(1),
    maxStudents: z.number().int().min(1).max(500).optional(),
    bio: z.string().min(20).max(4000),
    achievements: z.string().max(4000).optional(),
    teachingPhilosophy: z.string().max(4000).optional(),
    socialMedia: z.string().max(1000).optional(),
    backgroundCheckConsent: z.boolean(),
    marketingConsent: z.boolean().optional(),
    paymentMethod: z.string().min(1).max(60),
    demoVideoUrl: z.string().url().max(2000).optional().or(z.literal("")),
    idDocumentProvided: z.boolean().optional(),
    certificationDocsProvided: z.boolean().optional(),
    verificationNotes: z.string().max(2000).optional(),
  });

  app.post("/api/coaches/apply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await ensureCoachWeeklyAvailabilityColumn();
      await ensureCoachProfileColumnOnce();

      const body = coachApplySchema.parse(req.body);
      if (!body.backgroundCheckConsent) {
        return res.status(400).json({ message: "Background check consent is required for coach verification" });
      }

      const [existing] = await db.select().from(coaches).where(eq(coaches.userId, userId)).limit(1);
      if (existing?.isVerified) {
        return res.status(400).json({ message: "You already have a verified coach profile", coachId: existing.id });
      }

      const weeklyAvailability = availabilityLabelsToWeekly(body.availability);
      const certs = parseCertifications(body.certifications || "");
      const specialties = body.primarySports;
      const autoVerify = shouldAutoVerifyCoach();
      const isVerified = autoVerify;
      const tempId = existing?.id || "new";
      const profileJson = buildProfileFromApplication(
        {
          ...body,
          certifications: body.certifications || "",
          achievements: body.achievements || "",
          teachingPhilosophy: body.teachingPhilosophy || "",
          socialMedia: body.socialMedia || "",
          specializations: body.specializations || [],
          demoVideoUrl: body.demoVideoUrl || undefined,
        },
        tempId,
      );
      if (isVerified && profileJson.verification) {
        profileJson.verification.status = "verified";
        profileJson.verification.reviewedAt = new Date().toISOString();
      }

      let coachRow;
      if (existing) {
        [coachRow] = await db
          .update(coaches)
          .set({
            specialties,
            experience: body.experience.replace(/\D/g, "") || body.experience,
            certifications: certs,
            hourlyRate: body.hourlyRate.toFixed(2),
            weeklyAvailability,
            bio: body.bio,
            profileJson,
            isVerified,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(coaches.id, existing.id))
          .returning();
      } else {
        [coachRow] = await db
          .insert(coaches)
          .values({
            userId,
            specialties,
            experience: body.experience.replace(/\D/g, "") || body.experience,
            certifications: certs,
            hourlyRate: body.hourlyRate.toFixed(2),
            weeklyAvailability,
            bio: body.bio,
            profileJson,
            isVerified,
            isActive: true,
          })
          .returning();
      }

      const primarySport = specialties[0];
      if (primarySport) {
        await db
          .update(users)
          .set({ sport: primarySport, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      for (const key of [...cache.keys()]) {
        if (key.startsWith("coaches_")) cache.delete(key);
      }

      const full = await storage.getCoachById(coachRow.id);
      if (!full) return res.status(500).json({ message: "Failed to load created coach" });

      res.status(existing ? 200 : 201).json({
        coach: enrichCoachRow(full),
        verificationStatus: isVerified ? "verified" : "pending",
        message: isVerified
          ? "Your coach profile is live with verified status."
          : "Application submitted. We will review your credentials within 24–48 hours. You can edit your profile while you wait.",
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid application data", details: error.errors });
      }
      console.error("Coach apply error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to submit application" });
    }
  });

  const coachProfilePatchSchema = z.object({
    tagline: z.string().max(200).optional(),
    teachingPhilosophy: z.string().max(4000).optional(),
    bio: z.string().max(4000).optional(),
    hourlyRate: z.number().min(0).max(9999).optional(),
    bookingMode: z.enum(["hourly_slots", "plans_only", "message_first"]).optional(),
    sessionDurations: z.array(z.number().int().min(30).max(240)).max(5).optional(),
    sessionTypes: z.array(z.string().max(80)).max(12).optional(),
    maxStudents: z.number().int().min(1).max(500).optional(),
    languages: z.array(z.string().max(40)).max(8).optional(),
    achievements: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().max(200),
          year: z.string().max(20).optional(),
          description: z.string().max(1000).optional(),
        }),
      )
      .max(20)
      .optional(),
    pricingPlans: z
      .array(
        z.object({
          id: z.string(),
          label: z.string().max(120),
          description: z.string().max(500).optional(),
          priceEur: z.number().min(0).optional(),
          period: z.enum(["session", "hour", "month", "package", "contact"]),
          durationMinutes: z.number().int().min(15).max(480).optional(),
          sessionsIncluded: z.number().int().min(1).optional(),
          highlighted: z.boolean().optional(),
        }),
      )
      .max(8)
      .optional(),
    media: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(["video", "image"]),
          url: z.string().url().max(2000),
          title: z.string().max(200).optional(),
          thumbnailUrl: z.string().url().max(2000).optional(),
        }),
      )
      .max(12)
      .optional(),
    socialLinks: z
      .array(z.object({ platform: z.string().max(40), url: z.string().url().max(500) }))
      .max(6)
      .optional(),
  });

  app.patch("/api/coaches/me/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await ensureCoachProfileColumnOnce();
      const patch = coachProfilePatchSchema.parse(req.body);
      const [row] = await db.select().from(coaches).where(eq(coaches.userId, userId)).limit(1);
      if (!row) return res.status(404).json({ message: "Coach profile not found" });

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const current = parseCoachProfile(row.profileJson, row, user);
      const nextProfile: CoachProfileExtras = {
        ...current,
        ...patch,
        achievements: patch.achievements ?? current.achievements,
        pricingPlans: patch.pricingPlans ?? current.pricingPlans,
        media: patch.media ?? current.media,
        socialLinks: patch.socialLinks ?? current.socialLinks,
        sessionTypes: patch.sessionTypes ?? current.sessionTypes,
        languages: patch.languages ?? current.languages,
        sessionDurations: patch.sessionDurations ?? current.sessionDurations,
      };

      const coachUpdates: Record<string, unknown> = { updatedAt: new Date(), profileJson: nextProfile };
      if (patch.bio !== undefined) coachUpdates.bio = patch.bio;
      if (patch.hourlyRate !== undefined) coachUpdates.hourlyRate = patch.hourlyRate.toFixed(2);

      await db.update(coaches).set(coachUpdates as any).where(eq(coaches.id, row.id));
      const updated = await storage.getCoachById(row.id);
      if (!updated) return res.status(404).json({ message: "Coach not found" });
      res.json(enrichCoachRow(updated));
    } catch (error: unknown) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid profile data" });
      console.error("Error updating coach profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/coaches/me/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await ensureCoachWeeklyAvailabilityColumn();
      const parsed = z
        .record(
          z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]),
          z.object({
            enabled: z.boolean(),
            ranges: z.array(z.object({ start: z.string(), end: z.string() })),
          })
        )
        .safeParse(req.body?.weeklyAvailability ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid weeklyAvailability payload" });
      }
      const [row] = await db.select().from(coaches).where(eq(coaches.userId, userId)).limit(1);
      if (!row) return res.status(404).json({ message: "Coach profile not found" });
      const base = mergeAvailability(row.weeklyAvailability as unknown);
      const merged = { ...base, ...parsed.data };
      await db
        .update(coaches)
        .set({ weeklyAvailability: merged, updatedAt: new Date() })
        .where(eq(coaches.id, row.id));

      try {
        const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
        const hourly = row.hourlyRate ? Number(row.hourlyRate) : undefined;
        const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string; hourlyRate?: number }> = [];
        for (const [day, cfg] of Object.entries(merged)) {
          const c = cfg as { enabled?: boolean; ranges?: { start: string; end: string }[] };
          if (!c?.enabled || !c.ranges?.length) continue;
          const dow = dayMap[day];
          if (dow === undefined) continue;
          for (const r of c.ranges) {
            slots.push({ dayOfWeek: dow, startTime: r.start, endTime: r.end, hourlyRate: hourly });
          }
        }
        const { setCoachAvailability } = await import("./services/phase5MoneyService");
        await setCoachAvailability(row.id, slots);
      } catch (syncErr) {
        console.warn("[Phase5-4] coach_availability sync skipped:", syncErr);
      }

      res.json({ ok: true, weeklyAvailability: merged });
    } catch (error: unknown) {
      console.error("Error updating coach availability:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.post(
    "/api/coaches/:id/bookings/checkout",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const userId = sessionUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const coachId = req.params.id;
        const { sessionStart, durationMinutes } = z
          .object({
            sessionStart: z.string().min(1),
            durationMinutes: z.number().min(30).max(240),
          })
          .parse(req.body);

        await ensureCoachWeeklyAvailabilityColumn();
        const coach = await storage.getCoachById(coachId);
        if (!coach) return res.status(404).json({ message: "Coach not found" });
        if (coach.userId === userId) {
          return res.status(400).json({ message: "You cannot book your own coach profile" });
        }

        const weekly = mergeAvailability((coach as { weeklyAvailability?: unknown }).weeklyAvailability);
        if (!slotIsValid(sessionStart, durationMinutes, weekly)) {
          return res.status(400).json({ message: "Selected time is not available" });
        }

        const rate = parseFloat(coach.hourlyRate || "0");
        if (!rate || rate <= 0) {
          return res.status(400).json({ message: "This coach has no hourly rate set" });
        }
        const amount = Math.round(rate * (durationMinutes / 60) * 100) / 100;

        const [booking] = await db
          .insert(coachBookings)
          .values({
            userId,
            coachId: coach.id,
            sessionDate: new Date(sessionStart),
            duration: durationMinutes,
            amount: amount.toFixed(2),
            status: "pending",
          })
          .returning();

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: "eur",
          automatic_payment_methods: { enabled: true },
          metadata: {
            userId,
            coachBookingId: booking.id,
            coachId: coach.id,
            paymentType: "coach_session",
          },
        });

        const [payment] = await db
          .insert(payments)
          .values({
            amount: amount.toFixed(2),
            currency: "EUR",
            status: "pending",
            paymentMethod: "stripe",
            transactionId: paymentIntent.id,
            metadata: { coachBookingId: booking.id },
          })
          .returning();

        await db
          .update(coachBookings)
          .set({ paymentId: payment.id, updatedAt: new Date() })
          .where(eq(coachBookings.id, booking.id));

        res.json({
          clientSecret: paymentIntent.client_secret,
          bookingId: booking.id,
          amount,
          currency: "eur",
        });
      } catch (error: unknown) {
        console.error("Coach booking checkout error:", error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "Failed to start checkout",
        });
      }
    }
  );

  app.post(
    "/api/coaches/bookings/:bookingId/confirm",
    isAuthenticated,
    csrfProtection,
    async (req: any, res) => {
      try {
        const userId = sessionUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const bookingId = req.params.bookingId;
        const { paymentIntentId } = z.object({ paymentIntentId: z.string().min(1) }).parse(req.body);

        const [booking] = await db.select().from(coachBookings).where(eq(coachBookings.id, bookingId)).limit(1);
        if (!booking || booking.userId !== userId) {
          return res.status(404).json({ message: "Booking not found" });
        }

        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.metadata?.coachBookingId !== booking.id || pi.status !== "succeeded") {
          return res.status(400).json({ message: "Payment not completed" });
        }

        if (booking.paymentId) {
          await db
            .update(payments)
            .set({ status: "completed" })
            .where(eq(payments.id, booking.paymentId));
        }

        await db
          .update(coachBookings)
          .set({ status: "confirmed", updatedAt: new Date() })
          .where(eq(coachBookings.id, booking.id));

        const gross = parseFloat(String(booking.amount));
        const { recordCoachBookingCommission } = await import("./services/phase5MoneyService");
        await recordCoachBookingCommission(booking.id, gross);

        const coachFull = await storage.getCoachById(booking.coachId);
        const student = await storage.getUser(userId);
        const coachUserId = coachFull?.userId;
        if (coachUserId) {
          const conv = await messengerRepo.ensureDMConversation(userId, coachUserId);
          const when = new Date(booking.sessionDate).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          });
          const amt = booking.amount;
          const dur = booking.duration;
          const coachFirst = coachFull?.user.firstName || "Coach";
          const studentFirst = student?.firstName || "Player";
          await messengerRepo.createDMMessage({
            conversation_id: conv.id,
            sender_id: userId,
            kind: "text",
            body: `âœ… Session booked with ${coachFirst} â€” ${when} (${dur} min). Paid â‚¬${amt}.`,
          });
          await messengerRepo.createDMMessage({
            conversation_id: conv.id,
            sender_id: userId,
            kind: "text",
            body: `ðŸ“… ${studentFirst} booked a session for ${when} (${dur} min). â‚¬${amt} received.`,
          });
        }

        res.json({ ok: true });
      } catch (error: unknown) {
        console.error("Coach booking confirm error:", error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "Failed to confirm booking",
        });
      }
    }
  );

  app.post('/api/messages/start/:id', isAuthenticated, requireEmailVerified, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const coachId = req.params.id;
      
      const chatRoom = await storage.startChatWithCoach(userId, coachId);
      res.json({ chatId: chatRoom.id, chatRoom });
    } catch (error: unknown) {
      console.error("Error starting chat with coach:", error);
      res.status(500).json({ message: "Failed to start chat" });
    }
  });

  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      const category = req.query.category as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const products = await storage.getProducts(category, limit, offset);
      res.json(products);
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/featured', isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const products = await storage.getFeaturedProducts(limit);
      res.json(products);
    } catch (error: unknown) {
      console.error("Error fetching featured products:", error);
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  // Auth logout endpoint
  app.post("/api/auth/logout", isAuthenticated, (req: any, res) => {
    // If using passport:
    req.logout?.(() => {});
    req.session?.destroy((err: any) => {
      if (err) {
        console.error("Failed to destroy session:", err);
        return res.status(500).json({ ok: false, message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ ok: true });
    });
  });

  // Location-based routes
  app.put("/api/user/location", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { latitude, longitude, locationName } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }
      
      await storage.updateUserLocation(userId, latitude, longitude, locationName);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error updating user location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.get("/api/location/nearby", isAuthenticated, async (req: any, res) => {
    try {
      const { latitude, longitude, radius = 5 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }
      
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = parseInt(radius as string);
      
      const [nearbyUsers, nearbyEvents] = await Promise.all([
        storage.getNearbyUsers(lat, lng, radiusKm),
        storage.getNearbyEvents(lat, lng, radiusKm)
      ]);
      
      res.json({
        users: nearbyUsers,
        events: nearbyEvents
      });
    } catch (error: unknown) {
      console.error("Error fetching nearby data:", error);
      res.status(500).json({ error: "Failed to fetch nearby data" });
    }
  });

  // Stage 5: Analytics API endpoints
  
  // Get engagement metrics
  app.get("/api/analytics/engagement", isAuthenticated, async (req, res) => {
    try {
      const { getEngagementMetrics } = await import('./analytics/analyticsService');
      const metrics = await getEngagementMetrics();
      res.json(metrics);
    } catch (error: unknown) {
      console.error("Error getting engagement metrics:", error);
      res.status(500).json({ error: "Failed to get engagement metrics" });
    }
  });

  // Get daily metrics
  app.get("/api/analytics/daily-metrics", isAuthenticated, async (req, res) => {
    try {
      const { getDailyMetrics } = await import('./analytics/analyticsService');
      const timeframe = req.query.timeframe as string || '30d';
      const metrics = await getDailyMetrics(timeframe);
      res.json(metrics);
    } catch (error: unknown) {
      console.error("Error getting daily metrics:", error);
      res.status(500).json({ error: "Failed to get daily metrics" });
    }
  });

  // Popular content — canonical handler in server/routes/analytics.ts (registered before this block).

  // Get real-time metrics
  app.get("/api/analytics/realtime", isAuthenticated, async (req, res) => {
    try {
      const { getRealTimeMetrics } = await import('./analytics/analyticsService');
      const metrics = await getRealTimeMetrics();
      res.json(metrics);
    } catch (error: unknown) {
      console.error("Error getting real-time metrics:", error);
      res.status(500).json({ error: "Failed to get real-time metrics" });
    }
  });

  // Get analytics events with filtering
  app.get("/api/analytics/events", isAuthenticated, async (req, res) => {
    try {
      const { getAnalyticsEvents } = await import('./analytics/analyticsService');
      const { startDate, endDate, eventType, limit = 100 } = req.query;
      
      const filter = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        eventType: eventType as string,
      };
      
      const events = await getAnalyticsEvents(filter, Number(limit));
      res.json(events);
    } catch (error: unknown) {
      console.error("Error getting analytics events:", error);
      res.status(500).json({ error: "Failed to get analytics events" });
    }
  });

  // Get activity heatmap data
  app.get("/api/analytics/heatmap", isAuthenticated, async (req, res) => {
    try {
      const { getActivityHeatmapData } = await import('./analytics/analyticsService');
      const { timeframe = '7d', activityType = 'all' } = req.query;
      
      const heatmapData = await getActivityHeatmapData(timeframe as string, activityType as string);
      res.json(heatmapData);
    } catch (error: unknown) {
      console.error("Error getting heatmap data:", error);
      res.status(500).json({ error: "Failed to get heatmap data" });
    }
  });

  // Trigger manual daily metrics calculation
  app.post("/api/analytics/calculate-metrics", isAuthenticated, async (req, res) => {
    try {
      const { calculateDailyMetrics } = await import('./analytics/analyticsService');
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      
      await calculateDailyMetrics(targetDate);
      res.json({ success: true, message: "Daily metrics calculated successfully" });
    } catch (error: unknown) {
      console.error("Error calculating daily metrics:", error);
      res.status(500).json({ error: "Failed to calculate daily metrics" });
    }
  });

  // Stage 4: Real-time WebSocket routes
  
  // Get WebSocket connection stats
  app.get("/api/realtime/stats", async (req, res) => {
    try {
      const stats = getConnectionStats();
      res.json(stats);
    } catch (error: unknown) {
      console.error("Error getting connection stats:", error);
      res.status(500).json({ error: "Failed to get connection stats" });
    }
  });
  
  // Broadcast live update (for admin/system use)
  app.post("/api/realtime/broadcast", isAuthenticated, async (req, res) => {
    try {
      const { type, eventId, teamId, data } = req.body;
      
      if (!type || !data) {
        return res.status(400).json({ error: "Type and data are required" });
      }
      
      const update = {
        type,
        eventId,
        teamId,
        data,
        timestamp: new Date()
      };
      
      // Get the io instance from the HTTP server
      const io = (req as any).io;
      if (io) {
        await broadcastLiveUpdate(io, update);
      }
      
      res.json({ success: true, update });
    } catch (error: unknown) {
      console.error("Error broadcasting update:", error);
      res.status(500).json({ error: "Failed to broadcast update" });
    }
  });

  // Stage 4: Push / test / subscribe notification routes (feed: features/notifications router)

  // Send test notification
  app.post("/api/notifications/test", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { title, body, type = "general" } = req.body;
      
      if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
      }
      
      const jobId = await queueNotification({
        userId,
        title,
        body,
        type,
        priority: 'normal'
      });
      
      res.json({ success: true, jobId });
    } catch (error: unknown) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });
  
  // Subscribe to push notifications
  app.post("/api/notifications/subscribe", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { subscription } = req.body;
      
      if (!subscription) {
        return res.status(400).json({ error: "Subscription data is required" });
      }
      
      const success = await subscribeUserToPush(userId, subscription);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to subscribe to push notifications" });
      }
    } catch (error: unknown) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ error: "Failed to subscribe to push notifications" });
    }
  });
  
  // Unsubscribe from push notifications
  app.delete("/api/notifications/subscribe", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const success = await unsubscribeUserFromPush(userId);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to unsubscribe from push notifications" });
      }
    } catch (error: unknown) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ error: "Failed to unsubscribe from push notifications" });
    }
  });
  
  // Get notification stats
  app.get("/api/notifications/stats", async (req, res) => {
    try {
      const stats = await getNotificationStats();
      res.json(stats);
    } catch (error: unknown) {
      console.error("Error getting notification stats:", error);
      res.status(500).json({ error: "Failed to get notification stats" });
    }
  });

  // ====== GAMIFICATION AND CHALLENGE ENDPOINTS ======
  
  // Get user's gamification data (points, level, badges, streaks)
  app.get("/api/gamification/user", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const gamificationStats = await GamificationService.getUserStats(userId);
      
      res.json(gamificationStats);
    } catch (error: unknown) {
      console.error("Error getting user gamification data:", error);
      res.status(500).json({ error: "Failed to get gamification data" });
    }
  });

  // Manually award points (admin only)
  app.post("/api/gamification/award-points", isAuthenticated, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { gamificationService, POINT_VALUES } = await import("./services/gamificationService");
      const { userId, action, description } = req.body;
      
      if (!userId || !action) {
        return res.status(400).json({ error: "userId and action are required" });
      }
      
      if (!(action in POINT_VALUES)) {
        return res.status(400).json({ error: "Invalid action type" });
      }
      
      await gamificationService.awardPoints(userId, action, description);
      
      res.json({ success: true, message: `Points awarded for ${action}` });
    } catch (error: unknown) {
      console.error("Error awarding points:", error);
      res.status(500).json({ error: "Failed to award points" });
    }
  });

  // Get leaderboard
  app.get("/api/gamification/leaderboard", async (req, res) => {
    try {
      const { type = "points", sport, limit = 50 } = req.query;
      
      const leaderboard = await GamificationService.getLeaderboard(
        type as 'points' | 'level' | 'badges',
        sport as string,
        parseInt(limit as string)
      );
      
      res.json(leaderboard);
    } catch (error: unknown) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // Get available badge definitions
  app.get("/api/gamification/badges", async (req, res) => {
    try {
      const badges = await db
        .select()
        .from(badgeDefinitions)
        .where(eq(badgeDefinitions.isActive, true))
        .orderBy(badgeDefinitions.category, badgeDefinitions.tier);
      
      res.json(badges);
    } catch (error: unknown) {
      console.error("Error getting badges:", error);
      res.status(500).json({ error: "Failed to get badges" });
    }
  });

  app.post("/api/gamification/award-badge", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = sessionUserId(req);
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const body = z
        .object({
          badgeType: z.string().min(1),
          userId: z.string().optional(),
          userIds: z.array(z.string()).optional(),
        })
        .parse(req.body);
      const { gamificationService: gs } = await import("./services/gamificationService");
      const [badge] = await db
        .select()
        .from(badgeDefinitions)
        .where(eq(badgeDefinitions.name, body.badgeType))
        .limit(1);
      if (!badge) return res.status(404).json({ error: "Badge type not found" });
      const targets = body.userIds?.length ? body.userIds : body.userId ? [body.userId] : [actorId];
      let awarded = 0;
      for (const uid of targets) {
        try {
          await gs.awardBadge(uid, badge.id);
          awarded++;
        } catch {
          /* already earned */
        }
      }
      res.json({ success: true, awarded, badgeId: badge.id });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid input" });
      console.error("award-badge error:", error);
      res.status(500).json({ error: "Failed to award badge" });
    }
  });

  // Get user badges
  app.get("/api/gamification/user/badges", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const userBadgesList = await db
        .select({
          id: userBadges.id,
          userId: userBadges.userId,
          badgeId: userBadges.badgeId,
          earnedAt: userBadges.earnedAt,
          progress: userBadges.progress,
          isDisplayed: userBadges.isDisplayed,
          badge: badgeDefinitions,
        })
        .from(userBadges)
        .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.earnedAt));
      
      res.json(userBadgesList);
    } catch (error: unknown) {
      console.error("Error getting user badges:", error);
      res.status(500).json({ error: "Failed to get user badges" });
    }
  });

  // Update leaderboards (admin only)
  app.post("/api/gamification/update-leaderboards", isAuthenticated, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { gamificationService } = await import("./services/gamificationService");
      
      await gamificationService.updateLeaderboards();
      
      res.json({ success: true, message: "Leaderboards updated successfully" });
    } catch (error: unknown) {
      console.error("Error updating leaderboards:", error);
      res.status(500).json({ error: "Failed to update leaderboards" });
    }
  });

  // Get user level and XP info
  app.get("/api/gamification/user/level", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const [level] = await db
        .select()
        .from(userLevels)
        .where(eq(userLevels.userId, userId));
      
      if (!level) {
        const { gamificationService } = await import("./services/gamificationService");
        await gamificationService.updateUserLevel(userId);
        
        const [newLevel] = await db
          .select()
          .from(userLevels)
          .where(eq(userLevels.userId, userId));
        
        return res.json(newLevel);
      }
      
      res.json(level);
    } catch (error: unknown) {
      console.error("Error getting user level:", error);
      res.status(500).json({ error: "Failed to get user level" });
    }
  });

  // Get user streaks
  app.get("/api/gamification/user/streaks", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const streaks = await db
        .select()
        .from(userStreaks)
        .where(eq(userStreaks.userId, userId));
      
      res.json(streaks);
    } catch (error: unknown) {
      console.error("Error getting user streaks:", error);
      res.status(500).json({ error: "Failed to get user streaks" });
    }
  });

  // Get point transaction history
  app.get("/api/gamification/user/points/history", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { limit = 50, offset = 0 } = req.query;
      
      const transactions = await db
        .select()
        .from(pointTransactions)
        .where(eq(pointTransactions.userId, userId))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      res.json(transactions);
    } catch (error: unknown) {
      console.error("Error getting point history:", error);
      res.status(500).json({ error: "Failed to get point history" });
    }
  });

  // ====== REWARDS SYSTEM ENDPOINTS ======

  // Get available rewards
  app.get("/api/rewards", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const rewardsData = await RewardsService.getAvailableRewards(userId);
      res.json(rewardsData);
    } catch (error: unknown) {
      console.error("Error getting rewards:", error);
      res.status(500).json({ error: "Failed to get rewards" });
    }
  });

  // Redeem a reward
  app.post("/api/rewards/redeem", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { rewardId, deliveryInfo } = req.body;

      if (!rewardId) {
        return res.status(400).json({ error: "rewardId is required" });
      }

      const result = await RewardsService.redeemReward(userId, rewardId, deliveryInfo);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: unknown) {
      console.error("Error redeeming reward:", error);
      res.status(500).json({ error: "Failed to redeem reward" });
    }
  });

  // Get user's redemption history
  app.get("/api/rewards/history", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const redemptions = await RewardsService.getUserRedemptions(userId);
      res.json(redemptions);
    } catch (error: unknown) {
      console.error("Error getting redemption history:", error);
      res.status(500).json({ error: "Failed to get redemption history" });
    }
  });

  // Get reward statistics (admin only)
  app.get("/api/rewards/stats", isAuthenticated, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const stats = await RewardsService.getRewardStatistics();
      res.json(stats);
    } catch (error: unknown) {
      console.error("Error getting reward stats:", error);
      res.status(500).json({ error: "Failed to get reward statistics" });
    }
  });

  // ====== CHALLENGES AND QUESTS ENDPOINTS ======

  // Get available challenges
  app.get("/api/challenges", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const challenges = await ChallengesService.getAvailableChallenges(userId);
      res.json(challenges);
    } catch (error: unknown) {
      console.error("Error getting challenges:", error);
      res.status(500).json({ error: "Failed to get challenges" });
    }
  });

  // Start a challenge
  app.post("/api/challenges/:challengeId/start", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { challengeId } = req.params;
      
      const success = await ChallengesService.startChallenge(userId, challengeId);
      
      if (success) {
        res.json({ success: true, message: "Challenge started successfully" });
      } else {
        res.status(400).json({ error: "Failed to start challenge" });
      }
    } catch (error: unknown) {
      console.error("Error starting challenge:", error);
      res.status(500).json({ error: "Failed to start challenge" });
    }
  });

  // Get user's challenge progress
  app.get("/api/challenges/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const progress = await ChallengesService.getUserChallengeProgress(userId);
      res.json(progress);
    } catch (error: unknown) {
      console.error("Error getting challenge progress:", error);
      res.status(500).json({ error: "Failed to get challenge progress" });
    }
  });

  // Get available quests
  app.get("/api/quests", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const quests = await ChallengesService.getAvailableQuests(userId);
      res.json(quests);
    } catch (error: unknown) {
      console.error("Error getting quests:", error);
      res.status(500).json({ error: "Failed to get quests" });
    }
  });

  // Check and update user progress (internal endpoint for automated checks)
  app.post("/api/gamification/check-progress", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Check for new badges
      const newBadges = await GamificationService.checkForNewBadges(userId);
      
      // Check challenge progress
      const challengeProgress = await ChallengesService.checkChallengeProgress(userId);
      
      // Check quest progress  
      const questProgress = await ChallengesService.checkQuestProgress(userId);

      res.json({
        newBadges,
        challengeProgress,
        questProgress
      });
    } catch (error: unknown) {
      console.error("Error checking progress:", error);
      res.status(500).json({ error: "Failed to check progress" });
    }
  });

  // ====== CHALLENGE ENDPOINTS ======
  // GET /api/challenges — canonical handler above (ChallengesService.getAvailableChallenges).

  // Join a challenge
  app.post("/api/challenges/:challengeId/join", isAuthenticated, async (req, res) => {
    try {
      const { challengeService } = await import("./services/challengeService");
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { challengeId } = req.params;
      
      const userChallenge = await challengeService.joinChallenge(userId, challengeId);
      
      if (!userChallenge) {
        return res.status(400).json({ error: "Failed to join challenge" });
      }
      
      res.json(userChallenge);
    } catch (error: unknown) {
      console.error("Error joining challenge:", error);
      res.status(500).json({ error: "Failed to join challenge" });
    }
  });

  // Get user's challenges
  app.get("/api/challenges/user", isAuthenticated, async (req, res) => {
    try {
      const { challengeService } = await import("./services/challengeService");
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const userChallenges = await challengeService.getUserChallenges(userId);
      res.json(userChallenges);
    } catch (error: unknown) {
      console.error("Error getting user challenges:", error);
      res.status(500).json({ error: "Failed to get user challenges" });
    }
  });

  // Get challenge leaderboard
  app.get("/api/challenges/:challengeId/leaderboard", async (req, res) => {
    try {
      const { challengeService } = await import("./services/challengeService");
      const { challengeId } = req.params;
      const { limit = 10 } = req.query;
      
      const leaderboard = await challengeService.getChallengeLeaderboard(
        challengeId, 
        parseInt(limit as string)
      );
      
      res.json(leaderboard);
    } catch (error: unknown) {
      console.error("Error getting challenge leaderboard:", error);
      res.status(500).json({ error: "Failed to get challenge leaderboard" });
    }
  });

  // Create new challenge (admin only)
  app.post("/api/challenges", isAuthenticated, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { challengeService } = await import("./services/challengeService");
      
      const challenge = await challengeService.createChallenge(req.body);
      res.json(challenge);
    } catch (error: unknown) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  // Initialize predefined challenges (admin only)
  app.post("/api/challenges/initialize", isAuthenticated, requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { challengeService } = await import("./services/challengeService");
      
      await challengeService.createPredefinedChallenges();
      res.json({ success: true, message: "Predefined challenges created" });
    } catch (error: unknown) {
      console.error("Error initializing challenges:", error);
      res.status(500).json({ error: "Failed to initialize challenges" });
    }
  });

  // Stage 26: Advanced Marketplace Features & Dynamic Pricing Routes

  // Product search with advanced filtering
  app.get("/api/marketplace/search", async (req, res) => {
    try {
      const { 
        q, categories, minPrice, maxPrice, brands, rating, inStock, 
        sortBy, page = "1", limit = "24", userId 
      } = req.query;

      const filters: any = {
        query: q as string,
        categories: categories ? (categories as string).split(',') : undefined,
        priceRange: minPrice || maxPrice ? {
          min: minPrice ? parseFloat(minPrice as string) : undefined,
          max: maxPrice ? parseFloat(maxPrice as string) : undefined
        } : undefined,
        brands: brands ? (brands as string).split(',') : undefined,
        ratings: rating ? parseFloat(rating as string) : undefined,
        inStock: inStock === 'true',
        sortBy: sortBy as string
      };

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const searchResults = await searchService.searchProducts(
        filters,
        limitNum,
        offset,
        userId as string
      );

      res.json(searchResults);
    } catch (error: unknown) {
      console.error("Error in marketplace search:", error);
      res.status(500).json({ error: "Failed to search products" });
    }
  });

  // Autocomplete suggestions for search
  app.get("/api/marketplace/autocomplete", async (req, res) => {
    try {
      const { q } = req.query;
      const suggestions = await searchService.getAutocomplete(q as string);
      res.json(suggestions);
    } catch (error: unknown) {
      console.error("Error in autocomplete:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // Product detail, reviews, questions, wishlist — canonical handlers in
  // server/features/marketplace/marketplace.router.ts (mounted at /api/marketplace before this block).

  // Get personalized product recommendations
  app.get("/api/marketplace/recommendations", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { limit = "20" } = req.query;

      const recommendations = await marketplaceRecommendationService
        .generatePersonalizedRecommendations(userId, parseInt(limit as string));

      res.json(recommendations);
    } catch (error: unknown) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Validate discount code
  app.post("/api/marketplace/discount/validate", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { code, orderValue, productIds } = req.body;

      const validation = await pricingService.validateDiscountCode(
        code,
        userId,
        orderValue,
        productIds
      );

      res.json(validation);
    } catch (error: unknown) {
      console.error("Error validating discount code:", error);
      res.status(500).json({ error: "Failed to validate discount code" });
    }
  });

  // Get active flash sales
  app.get("/api/marketplace/flash-sales", async (req, res) => {
    try {
      const flashSales = await pricingService.getActiveFlashSales();
      res.json(flashSales);
    } catch (error: unknown) {
      console.error("Error getting flash sales:", error);
      res.status(500).json({ error: "Failed to get flash sales" });
    }
  });

  // User wishlist listing — see marketplace.router.ts GET /wishlist.

  app.post("/api/marketplace/wishlist/items", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { productId, wishlistId, notes } = req.body;

      // Get or create default wishlist
      let targetWishlistId = wishlistId;
      if (!targetWishlistId) {
        const defaultWishlists = await db
          .select()
          .from(userWishlists)
          .where(
            and(
              eq(userWishlists.userId, userId),
              eq(userWishlists.name, "My Wishlist")
            )
          );

        if (defaultWishlists.length === 0) {
          const [newWishlist] = await db
            .insert(userWishlists)
            .values({
              userId,
              name: "My Wishlist"
            })
            .returning();
          targetWishlistId = newWishlist.id;
        } else {
          targetWishlistId = defaultWishlists[0].id;
        }
      }

      const [wishlistItem] = await db
        .insert(wishlistItems)
        .values({
          wishlistId: targetWishlistId,
          productId,
          notes
        })
        .returning();

      res.json(wishlistItem);
    } catch (error: unknown) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ error: "Failed to add to wishlist" });
    }
  });

  // Product reviews and Q&A — see marketplace.router.ts.

  // Inventory management for sellers
  app.get("/api/marketplace/inventory/alerts", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const alerts = await inventoryService.getLowStockAlerts(userId);
      res.json(alerts);
    } catch (error: unknown) {
      console.error("Error getting inventory alerts:", error);
      res.status(500).json({ error: "Failed to get inventory alerts" });
    }
  });

  app.post("/api/marketplace/inventory/update", isAuthenticated, async (req, res) => {
    try {
      const updates = req.body.updates;
      const result = await inventoryService.bulkUpdateInventory(updates);
      res.json(result);
    } catch (error: unknown) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ error: "Failed to update inventory" });
    }
  });

  // Seller analytics
  app.get("/api/marketplace/seller/analytics", isAuthenticated, async (req, res) => {
    try {
      const sellerId = sessionUserId(req);
      if (!sellerId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { startDate, endDate } = req.query;

      const analytics = await inventoryService.getSellerAnalytics(
        sellerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(analytics);
    } catch (error: unknown) {
      console.error("Error getting seller analytics:", error);
      res.status(500).json({ error: "Failed to get seller analytics" });
    }
  });

  // Enhanced checkout with multiple payment options
  app.post("/api/marketplace/checkout/calculate", isAuthenticated, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { items, discountCode } = req.body as {
        items: Array<{ productId: string; quantity: number } & Record<string, unknown>>;
        discountCode?: string;
      };

      let totalPrice = 0;
      const itemsWithPricing: Array<
        { productId: string; quantity: number } & Record<string, unknown> & {
          pricing: Awaited<ReturnType<typeof pricingService.calculateProductPrice>>;
          itemTotal: number;
        }
      > = [];

      // Calculate pricing for each item
      for (const item of items ?? []) {
        const pricing = await pricingService.calculateProductPrice(
          item.productId,
          userId,
          item.quantity
        );
        
        const itemTotal = pricing.discountedPrice * item.quantity;
        totalPrice += itemTotal;
        
        itemsWithPricing.push({
          ...item,
          pricing,
          itemTotal
        });
      }

      let finalPrice = totalPrice;
      let discountApplied: {
        code: string;
        discountAmount?: number;
        savings: number;
      } | null = null;

      // Apply discount code if provided
      if (discountCode && typeof discountCode === "string") {
        const productIds = (items ?? []).map((item) => item.productId);
        const discountValidation = await pricingService.validateDiscountCode(
          discountCode,
          userId,
          totalPrice,
          productIds
        );

        if (discountValidation.isValid) {
          finalPrice = discountValidation.finalPrice!;
          discountApplied = {
            code: discountCode,
            discountAmount: discountValidation.discountAmount,
            savings: totalPrice - finalPrice
          };
        }
      }

      res.json({
        items: itemsWithPricing,
        subtotal: totalPrice,
        finalPrice,
        discountApplied,
        savings: totalPrice - finalPrice
      });
    } catch (error: unknown) {
      console.error("Error calculating checkout:", error);
      res.status(500).json({ error: "Failed to calculate checkout" });
    }
  });

  // Phase 2: Push Notification Routes
  app.post("/api/push/subscribe", isAuthenticated, validateBody(insertPushTokenSchema), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { endpoint, p256dh, auth, deviceType } = req.body;

      const { NotificationService } = await import("./services/notificationService");
      const success = await NotificationService.subscribeToPushNotifications(
        userId,
        { endpoint, keys: { p256dh, auth } },
        deviceType || 'desktop'
      );

      if (success) {
        res.json({ success: true, message: "Successfully subscribed to push notifications" });
      } else {
        res.status(500).json({ error: "Failed to subscribe to push notifications" });
      }
    } catch (error: unknown) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ error: "Failed to subscribe to push notifications" });
    }
  });

  app.delete("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { endpoint } = req.body;

      const { NotificationService } = await import("./services/notificationService");
      const success = await NotificationService.unsubscribeFromPushNotifications(userId, endpoint);

      if (success) {
        res.json({ success: true, message: "Successfully unsubscribed from push notifications" });
      } else {
        res.status(500).json({ error: "Failed to unsubscribe from push notifications" });
      }
    } catch (error: unknown) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ error: "Failed to unsubscribe from push notifications" });
    }
  });

  app.post("/api/push/send", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { targetUserId, title, body, imageUrl, actionUrl, data } = req.body;

      if (!targetUserId || !title || !body) {
        return res.status(400).json({ error: "Missing required fields: targetUserId, title, body" });
      }

      const { NotificationService } = await import("./services/notificationService");
      const success = await NotificationService.sendPushNotification(targetUserId, {
        title,
        body,
        imageUrl,
        actionUrl,
        data
      });

      if (success) {
        res.json({ success: true, message: "Push notification sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send push notification" });
      }
    } catch (error: unknown) {
      console.error("Error sending push notification:", error);
      res.status(500).json({ error: "Failed to send push notification" });
    }
  });
  
  const httpServer = createServer(app);
  
  // Stage 4: Setup WebSocket server (disabled for performance)
  // const io = setupWebSocketServer(httpServer);
  
  // Initialize real-time analytics WebSocket server (disabled for performance)
  // const { realTimeAnalytics } = await import('./analytics/realTimeAnalytics');
  // realTimeAnalytics.initialize(httpServer);
  
  // Make io instance available to routes (disabled for performance)
  // app.use((req, res, next) => {
  //   (req as any).io = io;
  //   next();
  // });
  
  // Comments: list for a post
  app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error: unknown) {
      console.error("Error fetching post comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // User photos (gallery)
  app.get('/api/users/:userId/photos', async (req, res) => {
    try {
      const photos = await storage.getUserPhotos(req.params.userId);
      res.json(photos);
    } catch (error: unknown) {
      console.error("Error fetching user photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post('/api/users/:userId/photos', isAuthenticated, csrfProtection, validateBody(z.object({
    imageUrl: z.string().url(),
    caption: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      if (userId !== req.params.userId) return res.status(403).json({ message: "Forbidden" });
      const photo = await storage.addUserPhoto({ userId, ...req.body });
      res.json(photo);
    } catch (error: unknown) {
      console.error("Error adding user photo:", error);
      res.status(500).json({ message: "Failed to add photo" });
    }
  });

  app.delete('/api/users/photos/:photoId', isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const ok = await storage.deleteUserPhoto(req.params.photoId, userId);
      if (!ok) return res.status(403).json({ message: "Not authorized" });
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting user photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // User reviews
  app.get('/api/users/:userId/reviews', async (req, res) => {
    try {
      const reviews = await storage.getUserReviews(req.params.userId);
      res.json(reviews);
    } catch (error: unknown) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/users/:userId/reviews', isAuthenticated, csrfProtection, validateBody(z.object({
    rating: z.number().int().min(1).max(5),
    text: z.string().max(1000).optional(),
    context: z.string().max(100).optional(),
  })), async (req: any, res) => {
    try {
      const authorId = sessionUserId(req);
      if (!authorId) return res.status(401).json({ message: "User not authenticated" });
      const subjectId = req.params.userId;
      if (authorId === subjectId) return res.status(400).json({ message: "Cannot review yourself" });
      const review = await storage.addUserReview({ subjectId, authorId, ...req.body });
      res.json(review);
    } catch (error: unknown) {
      console.error("Error adding user review:", error);
      res.status(500).json({ message: "Failed to add review" });
    }
  });

  app.delete('/api/users/reviews/:reviewId', isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const authorId = sessionUserId(req);
      if (!authorId) return res.status(401).json({ message: "User not authenticated" });
      const ok = await storage.deleteUserReview(req.params.reviewId, authorId);
      if (!ok) return res.status(403).json({ message: "Not authorized" });
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting user review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Legacy group chat moved to messenger feature router (POST /api/messenger/groups).

  // Shop reviews
  app.get('/api/shops/:shopId/reviews', async (req, res) => {
    try {
      const { rows } = await (await import('./db')).db.execute(
        (await import('drizzle-orm')).sql`
          SELECT r.id, r.shop_id, r.author_id, r.rating, r.title, r.text, r.created_at,
                 COALESCE(u.display_name, NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.username) AS author_name,
                 u.username AS author_username, u.profile_image_url AS author_avatar
          FROM shop_reviews r
          LEFT JOIN users u ON u.id = r.author_id
          WHERE r.shop_id = ${req.params.shopId}
          ORDER BY r.created_at DESC
        `
      );
      res.json(rows);
    } catch (error: unknown) {
      console.error("Error fetching shop reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/shops/:shopId/reviews', isAuthenticated, csrfProtection, validateBody(z.object({
    rating: z.number().int().min(1).max(5),
    title: z.string().max(200).optional(),
    text: z.string().max(4000).optional(),
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      const { rows } = await db.execute(sql`
        INSERT INTO shop_reviews (shop_id, author_id, rating, title, text)
        VALUES (${req.params.shopId}, ${userId}, ${req.body.rating}, ${req.body.title || null}, ${req.body.text || null})
        ON CONFLICT (shop_id, author_id)
        DO UPDATE SET rating=EXCLUDED.rating, title=EXCLUDED.title, text=EXCLUDED.text, created_at=NOW()
        RETURNING *
      `);
      res.json(rows[0]);
    } catch (error: unknown) {
      console.error("Error creating shop review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.delete('/api/shops/reviews/:reviewId', isAuthenticated, csrfProtection, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      const { rows } = await db.execute(sql`
        DELETE FROM shop_reviews WHERE id=${req.params.reviewId} AND author_id=${userId} RETURNING id
      `);
      if (rows.length === 0) return res.status(403).json({ message: "Not authorized" });
      res.json({ success: true });
    } catch (error: unknown) {
      console.error("Error deleting shop review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Challenge chat
  app.get('/api/competitive-challenges/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getChallengeMessages(req.params.id);
      res.json(messages);
    } catch (error: unknown) {
      console.error("Error fetching challenge chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  app.post('/api/competitive-challenges/:id/chat', isAuthenticated, csrfProtection, validateBody(z.object({
    content: z.string().min(1).max(2000),
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const message = await storage.addChallengeMessage(req.params.id, userId, req.body.content);
      res.json(message);
    } catch (error: unknown) {
      console.error("Error sending challenge chat message:", error);
      res.status(500).json({ message: "Failed to send" });
    }
  });

  // DM shared notes (per-conversation co-edited note)
  app.get('/api/dm/notes/:otherUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const note = await storage.getSharedNote(userId, req.params.otherUserId);
      res.json(note || { content: '', updatedAt: null, updatedById: null });
    } catch (error: unknown) {
      console.error("Error fetching shared note:", error);
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  app.put('/api/dm/notes/:otherUserId', isAuthenticated, csrfProtection, validateBody(z.object({
    content: z.string().max(20000),
  })), async (req: any, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const note = await storage.upsertSharedNote(userId, req.params.otherUserId, req.body.content);
      res.json(note);
    } catch (error: unknown) {
      console.error("Error saving shared note:", error);
      res.status(500).json({ message: "Failed to save note" });
    }
  });

  // Team photos — see server/features/teams/teams.router.ts

  // User calendar (upcoming events) and events attended (past)
  app.get('/api/users/:userId/calendar', async (req, res) => {
    try {
      const eventsRepo = await import('./features/events/events.repo');
      const items = await eventsRepo.listUserUpcoming(req.params.userId);
      res.json(items);
    } catch (error: unknown) {
      console.error("Error fetching user calendar:", error);
      res.status(500).json({ message: "Failed to fetch calendar" });
    }
  });

  app.get('/api/users/:userId/events-attended', async (req, res) => {
    try {
      const eventsRepo = await import('./features/events/events.repo');
      const items = await eventsRepo.listUserPast(req.params.userId);
      res.json(items);
    } catch (error: unknown) {
      console.error("Error fetching attended events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Add error handling middleware for JWT auth module
  app.use(errorHandler());

  return httpServer;
}
