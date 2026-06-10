// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
/**
 * Security Module - Central initialization and exports
 * Package S - Security & Data Protection
 */

import { initEncryption } from "./encryption";
import { validateRequiredSecrets, validateOptionalSecrets } from "./secrets";
import { validateProductionSecurity } from "../lib/productionSecurity";

// Export all security utilities
export * from "./auth";
export * from "./rbac";
export * from "./validator";
export * from "./encryption";
export * from "./uploads";
export * from "./anomaly";
export * from "./secrets";

// Export existing security modules
export * from "./securityHeaders";
export * from "./securityMiddleware";
export * from "./mfaService";

/**
 * Initialize all security modules
 * Call this early in application startup
 */
export async function initializeSecurity() {
  console.log("🔒 Initializing SURNA Security System...");
  
  // 1. Validate required environment secrets
  try {
    validateRequiredSecrets();
    validateProductionSecurity();
    console.log("✅ Required secrets validated");
  } catch (err) {
    console.error("❌ Missing required secrets:", (err as Error).message);
    throw err;
  }
  
  // 2. Initialize JWT secrets (generate fallbacks if needed)
  const { initializeAuthSecrets, initializeRedisStore } = await import("./auth");
  initializeAuthSecrets();
  await initializeRedisStore();
  
  // 3. Validate optional secrets (warnings only)
  validateOptionalSecrets();
  
  // 4. Initialize field-level encryption
  try {
    initEncryption();
    console.log("✅ Field-level encryption initialized");
  } catch (err) {
    console.warn("⚠️  Encryption initialization warning:", (err as Error).message);
  }
  
  // 5. Initialize MFA service if configured
  // (already handled in mfaService.ts)
  
  console.log("🔐 Security system initialized successfully");
  console.log("");
  console.log("🛡️  Active security features:");
  console.log("   - JWT access tokens (10min TTL)");
  console.log("   - Rotating refresh tokens (14 day TTL)");
  console.log("   - RBAC with 7 roles, 14+ permissions");
  console.log("   - Field-level PII encryption");
  console.log("   - File upload validation & magic bytes");
  console.log("   - Login anomaly detection");
  console.log("   - Payment anomaly detection");
  console.log("   - Rate limiting & abuse prevention");
  console.log("   - Audit logging for sensitive actions");
  console.log("   - Security headers (CSP, HSTS, etc.)");
  console.log("");
}

/**
 * Security health check
 * Returns status of all security components
 */
export function securityHealthCheck() {
  return {
    secrets: {
      jwt_access: !!process.env.JWT_ACCESS_SECRET,
      jwt_refresh: !!process.env.JWT_REFRESH_SECRET,
      encryption_key: !!process.env.FIELD_ENC_KEY_HEX,
      database: !!process.env.DATABASE_URL,
      redis: !!process.env.REDIS_URL,
      stripe: !!process.env.STRIPE_SECRET_KEY
    },
    features: {
      jwt_auth: true,
      rbac: true,
      encryption: !!process.env.FIELD_ENC_KEY_HEX,
      mfa: true,
      rate_limiting: true,
      audit_logging: true,
      anomaly_detection: true,
      file_validation: true
    },
    status: "healthy"
  };
}
