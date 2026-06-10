// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import crypto from "crypto";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  usedBackupCode?: boolean;
}

export class TwoFactorAuthService {
  private static readonly BACKUP_CODE_COUNT = 8;
  private static readonly BACKUP_CODE_LENGTH = 8;
  private static readonly TOTP_WINDOW = 30; // seconds
  private static readonly TOTP_DIGITS = 6;

  static generateSecret(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = crypto.randomBytes(this.BACKUP_CODE_LENGTH / 2).toString('hex');
      codes.push(code.toUpperCase());
    }
    return codes;
  }

  static generateTOTP(secret: string, timeStep?: number): string {
    const time = Math.floor((timeStep || Date.now()) / 1000 / this.TOTP_WINDOW);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time));

    const key = Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary = 
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const code = binary % Math.pow(10, this.TOTP_DIGITS);
    return code.toString().padStart(this.TOTP_DIGITS, '0');
  }

  static async setupTwoFactor(userId: string, appName: string = "SURNA"): Promise<TwoFactorSetup> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();
    
    // Generate QR code data
    const issuer = encodeURIComponent(appName);
    const accountName = encodeURIComponent(`${appName}:${userId}`);
    const qrData = `otpauth://totp/${accountName}?secret=${secret}&issuer=${issuer}&digits=${this.TOTP_DIGITS}&period=${this.TOTP_WINDOW}`;
    
    return {
      secret,
      qrCode: qrData,
      backupCodes
    };
  }

  static async enableTwoFactor(userId: string, secret: string, verificationCode: string, backupCodes: string[]): Promise<boolean> {
    // Verify the code before enabling
    if (!this.verifyTOTP(secret, verificationCode)) {
      return false;
    }

    // Store encrypted secret and backup codes
    const encryptedSecret = this.encryptSecret(secret);
    const encryptedBackupCodes = backupCodes.map(code => this.encryptSecret(code));

    await db.update(users)
      .set({
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: encryptedBackupCodes,
        twoFactorEnabled: true
      })
      .where(eq(users.id, userId));

    return true;
  }

  static async disableTwoFactor(userId: string): Promise<void> {
    await db.update(users)
      .set({
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorEnabled: false
      })
      .where(eq(users.id, userId));
  }

  static async verifyTwoFactor(userId: string, code: string): Promise<TwoFactorVerification> {
    const [user] = await db.select({
      twoFactorSecret: users.twoFactorSecret,
      twoFactorBackupCodes: users.twoFactorBackupCodes,
      twoFactorEnabled: users.twoFactorEnabled
    })
    .from(users)
    .where(eq(users.id, userId));

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return { isValid: false };
    }

    const secret = this.decryptSecret(user.twoFactorSecret);
    
    // First try TOTP verification
    if (this.verifyTOTP(secret, code)) {
      return { isValid: true };
    }

    // Then try backup codes
    if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
      const decryptedBackupCodes = user.twoFactorBackupCodes.map(code => this.decryptSecret(code));
      const codeIndex = decryptedBackupCodes.findIndex(backupCode => 
        backupCode.toUpperCase() === code.toUpperCase()
      );

      if (codeIndex !== -1) {
        // Remove used backup code
        const remainingCodes = user.twoFactorBackupCodes.filter((_, index) => index !== codeIndex);
        await db.update(users)
          .set({ twoFactorBackupCodes: remainingCodes })
          .where(eq(users.id, userId));

        return { isValid: true, usedBackupCode: true };
      }
    }

    return { isValid: false };
  }

  private static verifyTOTP(secret: string, code: string, timeWindow: number = 1): boolean {
    const currentTime = Date.now();
    
    // Check current time and adjacent windows for clock drift tolerance
    for (let i = -timeWindow; i <= timeWindow; i++) {
      const timeStep = currentTime + (i * this.TOTP_WINDOW * 1000);
      const expectedCode = this.generateTOTP(secret, timeStep);
      
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  private static encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private static decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const parts = encryptedSecret.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const newCodes = this.generateBackupCodes();
    const encryptedCodes = newCodes.map(code => this.encryptSecret(code));

    await db.update(users)
      .set({ twoFactorBackupCodes: encryptedCodes })
      .where(eq(users.id, userId));

    return newCodes;
  }
}