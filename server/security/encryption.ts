// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import crypto from "crypto";

// Symmetric encryption for field-level PII
let encryptionKey: Buffer | null = null;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export function initEncryption() {
  const keyHex = process.env.FIELD_ENC_KEY_HEX;
  
  if (!keyHex) {
    console.warn("⚠️  FIELD_ENC_KEY_HEX not set. Generating temporary key (NOT FOR PRODUCTION)");
    encryptionKey = crypto.randomBytes(KEY_LENGTH);
    return;
  }
  
  encryptionKey = Buffer.from(keyHex, "hex");
  
  if (encryptionKey.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
  }
  
  console.log("🔐 Field-level encryption initialized");
}

export function encrypt(plaintext: string): string {
  if (!encryptionKey) {
    initEncryption();
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey!, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!encryptionKey) {
    initEncryption();
  }
  
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey!, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

// Hash sensitive data for comparison (e.g., phone numbers for deduplication)
export function hashSensitive(data: string): string {
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}

// Generate secure random tokens
export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// Redact PII for logging
export function redactPII(obj: any): any {
  const sensitive = ["email", "phone", "phoneNumber", "password", "token", "secret", "ssn"];
  
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }
  
  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some(s => lowerKey.includes(s))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      redacted[key] = redactPII(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}
