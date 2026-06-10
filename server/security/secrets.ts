// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
/**
 * Secrets Management
 * 
 * This module provides utilities for managing environment secrets and API keys.
 * All secrets should be stored in environment variables, never in code.
 */

export interface SecretConfig {
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  FIELD_ENC_KEY_HEX: string;
  SIGNED_URL_SECRET: string;
  DATABASE_URL: string;
  REDIS_URL?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_BUCKET?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_PUBLIC_BASE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv(name: string, defaultValue: string = ""): string {
  return process.env[name] || defaultValue;
}

export function validateRequiredSecrets(): void {
  const required = [
    "DATABASE_URL"
  ];
  
  const missing = required.filter(name => !process.env[name]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(", ")}`);
  }
}

export function validateOptionalSecrets(): void {
  const warnings: string[] = [];
  
  if (!process.env.JWT_ACCESS_SECRET) {
    warnings.push("JWT_ACCESS_SECRET not set - using temporary key (NOT FOR PRODUCTION)");
  }
  
  if (!process.env.JWT_REFRESH_SECRET) {
    warnings.push("JWT_REFRESH_SECRET not set - using temporary key (NOT FOR PRODUCTION)");
  }
  
  if (!process.env.FIELD_ENC_KEY_HEX) {
    warnings.push("FIELD_ENC_KEY_HEX not set - PII encryption disabled (NOT FOR PRODUCTION)");
  }
  
  if (!process.env.REDIS_URL) {
    warnings.push("REDIS_URL not set - using in-memory fallback");
  }
  
  if (warnings.length > 0) {
    console.warn("⚠️  Security Configuration Warnings:");
    warnings.forEach(w => console.warn(`   - ${w}`));
  }
}

export function getSecrets(): Partial<SecretConfig> {
  return {
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    FIELD_ENC_KEY_HEX: process.env.FIELD_ENC_KEY_HEX,
    SIGNED_URL_SECRET: process.env.SIGNED_URL_SECRET,
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
  };
}

// Key rotation tracking
interface KeyRotation {
  keyName: string;
  lastRotated: Date;
  rotationDue: Date;
}

const ROTATION_INTERVAL = 90 * 24 * 60 * 60 * 1000; // 90 days

export function checkKeyRotation(): KeyRotation[] {
  // This would typically be stored in a database
  // For now, return empty array as placeholder
  return [];
}

export function isKeyRotationDue(keyName: string): boolean {
  // TODO: Implement actual key rotation tracking
  // For now, always return false
  return false;
}
