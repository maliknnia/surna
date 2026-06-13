import { Router } from "express";
import { authRouter } from "./auth";
import { profileRouter } from "./profile";
import { feedRouter } from "./feed";
import { mediaRouter } from "./media";
import { notificationsRouter } from "./notifications";
import { marketplaceRouter } from "./marketplace";
import { eventsRouter } from "./events";
import { messengerRouter } from "./messenger";
import { createChallengesRouter } from "./challenges/challenges.router";
import analyticsRouter from "./analytics/analytics.routes";
import myHubRouter from "./my-hub/my-hub.router";
import { ensureMyHubEventLifecycleColumns } from "./my-hub/migrations";
import { ensureEmailVerificationColumns } from "./auth/ensureEmailVerificationColumns";
import { ensureMarketplaceSchema } from "./marketplace/ensureMarketplaceSchema";
import { ensureNotificationsSchema } from "./notifications/ensureNotificationsSchema";

export function registerFeatureRouters(api: Router, io?: any) {
  // In production we keep fail-fast behavior. In local development, DB may be
  // intentionally unavailable while UI work is in progress, so we log and continue.
  const failFastMyHubMigration = process.env.NODE_ENV === "production";
  void ensureMyHubEventLifecycleColumns().catch((err) => {
    console.error("[boot] My Hub schema migration failed", err);
    if (failFastMyHubMigration) {
      // Surface as an unhandled rejection so the process supervisor
      // restarts and operators see the failure.
      setImmediate(() => {
        throw err;
      });
    } else {
      console.warn("[boot] Continuing without My Hub migration in development mode");
    }
  });
  void ensureEmailVerificationColumns().catch((err) => {
    console.error("[boot] Email verification schema migration failed", err);
  });
  void ensureMarketplaceSchema().catch((err) => {
    console.error("[boot] Marketplace schema migration failed", err);
  });
  void ensureNotificationsSchema().catch((err) => {
    console.error("[boot] Notifications schema migration failed", err);
  });
  api.use("/my-hub", myHubRouter);
  api.use("/auth", authRouter);
  api.use("/profile", profileRouter);
  api.use("/feed", feedRouter);
  api.use("/media", mediaRouter);
  api.use("/notifications", notificationsRouter);
  api.use("/marketplace", marketplaceRouter);
  api.use("/events", eventsRouter);
  api.use("/messenger", messengerRouter(io));
  api.use("/competitive-challenges", createChallengesRouter(io));
  api.use("/analytics", analyticsRouter);
}
