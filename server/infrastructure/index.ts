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
  ]);

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
