import { initCache } from "./cache";
import { initializeWorkers } from "./jobWorkers";
import { ensureEntitlementTables } from "./entitlements";
import { ensureMediaTables } from "./mediaService";
import { ensureSearchTables } from "./searchIndex";
import { ensureFeatureFlagTables } from "./featureFlags";
import { ensureMessagingTables } from "./messaging";
import { ensureProEntitlementTables } from "./proEntitlements";
import { ensureLegacyMediaTable } from "../features/media/media.repo";
import { ensureEventsCompatTables } from "../features/events/events.repo";
import { logger } from "./logger";

export async function initializeInfrastructure() {
  logger.info("Initializing infrastructure modules...");

  initCache();

  await Promise.all([
    ensureEntitlementTables().catch(e => logger.warn("Entitlement tables setup deferred", { error: e.message })),
    ensureMediaTables().catch(e => logger.warn("Media tables setup deferred", { error: e.message })),
    ensureLegacyMediaTable().catch(e => logger.warn("Legacy media table setup deferred", { error: e.message })),
    ensureEventsCompatTables().catch(e => logger.warn("Events compat setup deferred", { error: e.message })),
    ensureSearchTables().catch(e => logger.warn("Search tables setup deferred", { error: e.message })),
    ensureFeatureFlagTables().catch(e => logger.warn("Feature flag tables setup deferred", { error: e.message })),
    ensureMessagingTables().catch(e => logger.warn("Messaging tables setup deferred", { error: e.message })),
    ensureProEntitlementTables().catch(e => logger.warn("Pro entitlement tables setup deferred", { error: e.message })),
    import("./phase3Social").then(m => m.ensurePhase3SocialTables()).catch(e => logger.warn("Phase3 social tables deferred", { error: e.message })),
    import("./phase4Competitive").then(m => m.ensurePhase4CompetitiveTables()).catch(e => logger.warn("Phase4 competitive tables deferred", { error: e.message })),
    import("./phase5Money").then(m => m.ensurePhase5MoneyTables()).catch(e => logger.warn("Phase5 money tables deferred", { error: e.message })),
    import("./phase6Sport").then(m => m.ensurePhase6SportTables()).catch(e => logger.warn("Phase6 sport tables deferred", { error: e.message })),
    import("./phase7Health").then(m => m.ensurePhase7HealthTables()).catch(e => logger.warn("Phase7 health tables deferred", { error: e.message })),
    import("./phase8Profile").then(m => m.ensurePhase8ProfileTables()).catch(e => logger.warn("Phase8 profile tables deferred", { error: e.message })),
    import("./phase9Mobile").then(m => m.ensurePhase9MobileTables()).catch(e => logger.warn("Phase9 mobile tables deferred", { error: e.message })),
    import("../teams/ensureTeamLifecycleSchema").then(m => m.ensureTeamLifecycleSchema()).catch(e => logger.warn("Team lifecycle schema deferred", { error: e.message })),
  ]);

  try {
    const { startEventReminderJob } = await import("../services/eventReminderJob");
    startEventReminderJob();
  } catch (e: any) {
    logger.warn("Event reminder job deferred", { error: e?.message });
  }

  try {
    const { startWeeklyChallengeJob } = await import("../services/competitiveEngine");
    startWeeklyChallengeJob();
  } catch (e: any) {
    logger.warn("Weekly challenge job deferred", { error: e?.message });
  }

  try {
    const { startReadinessReportJob } = await import("../services/readinessReportJob");
    startReadinessReportJob();
  } catch (e: any) {
    logger.warn("Readiness report job deferred", { error: e?.message });
  }

  try {
    const { startTeamScheduleReminderJob } = await import("../services/teamNotificationService");
    startTeamScheduleReminderJob();
  } catch (e: any) {
    logger.warn("Team schedule reminder job deferred", { error: e?.message });
  }

  try {
    const { startCompliancePurgeJob } = await import("../services/compliancePurgeJob");
    startCompliancePurgeJob();
  } catch (e: any) {
    logger.warn("Compliance purge job deferred", { error: e?.message });
  }

  initializeWorkers();

  logger.info("Infrastructure initialized successfully");
}

export { cacheAside, cacheGet, cacheSet, cacheDel, cacheInvalidatePattern, cacheKey, TTL, getCacheStats } from "./cache";
export { enqueue, getQueue, getQueueStats, getAllQueueStats, QUEUE_NAMES } from "./jobQueue";
export { logger, requestIdMiddleware, requestLoggingMiddleware, errorTrackingMiddlewareEnhanced, getMetrics } from "./logger";
export { authorize, requireAuth, requireRole, hasPermission, getPermissionMatrix } from "./authorize";
export type { Action, Role } from "./authorize";
export { getEntitlement, upsertEntitlement, processStripeWebhook, isEntitlementActive, hasFeature } from "./entitlements";
export { globalLimiter, authLimiter, signupLimiter, uploadLimiter, messageLimiter, searchLimiter, paymentLimiter, botProtectionMiddleware } from "./rateLimiting";
export { validateFile, computeFileHash, createMediaRecord, getMediaByOwner, getMediaByEntity, updateMediaStatus, deleteMedia, generateSignedUrl } from "./mediaService";
export { universalSearch, autocomplete, indexEntity, removeFromIndex, reindexAll } from "./searchIndex";
export { isEnabled as isFeatureEnabled, getAllFlags, upsertFlag, deleteFlag } from "./featureFlags";
export { setReceipt, getReceipts, updateCursor, getCursor, getUnreadCount, getMessagesSince, paginateMessages } from "./messaging";
export { computeFeedScore, clusterMarkers, applyMapPrivacy, fuzzLocation, prioritizeNotifications, batchNotifications, computeTrustScore } from "./algorithms";
export type { FeedRankingConfig, MapCluster, MapPrivacyConfig, NotificationBatch, NotificationPriority, TrustScore } from "./algorithms";
export { getTeamEntitlement, getUserEntitlement, upsertTeamEntitlement, upsertUserEntitlement, canAccessModule, isBillingOwner, isManager, PLAN_LIMITS, MODULE_LIST } from "./proEntitlements";
export type { ProPlan, ProTeamEntitlement, ProUserEntitlement } from "./proEntitlements";
