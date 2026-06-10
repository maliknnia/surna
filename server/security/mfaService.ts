// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import twilio from 'twilio';
import { randomBytes } from 'crypto';

export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MFAVerification {
  isValid: boolean;
  remainingAttempts?: number;
}

// Initialize Twilio for SMS MFA (if configured)
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export class MFAService {
  private static readonly BACKUP_CODES_COUNT = 8;
  private static readonly CODE_LENGTH = 6;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

  // Generate TOTP secret and QR code for app-based MFA
  static async generateTOTPSetup(userId: string, userEmail: string): Promise<MFASetup> {
    const secret = speakeasy.generateSecret({
      name: `SURNA (${userEmail})`,
      issuer: 'SURNA Sports Platform',
      length: 32
    });

    const backupCodes = this.generateBackupCodes();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
      manualEntryKey: secret.base32
    };
  }

  // Verify TOTP token
  static verifyTOTP(token: string, secret: string): MFAVerification {
    const verified = speakeasy.totp.verify({
      secret,
      token,
      window: 2, // Allow 2 time steps before/after current
      encoding: 'base32'
    });

    return { isValid: verified };
  }

  // Generate backup codes
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Verify backup code
  static verifyBackupCode(code: string, validCodes: string[]): { isValid: boolean; remainingCodes?: string[] } {
    const normalizedCode = code.replace(/\s/g, '').toUpperCase();
    const codeIndex = validCodes.indexOf(normalizedCode);

    if (codeIndex === -1) {
      return { isValid: false };
    }

    // Remove used backup code
    const remainingCodes = validCodes.filter((_, index) => index !== codeIndex);

    return {
      isValid: true,
      remainingCodes
    };
  }

  // Send SMS verification code
  static async sendSMSCode(phoneNumber: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!twilioClient) {
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      await twilioClient.messages.create({
        body: `Your SURNA verification code is: ${code}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      // Store code temporarily (in production, use Redis or database)
      // For now, we'll store in memory (not suitable for production)
      this.storeSMSCode(userId, code);

      return { success: true };
    } catch (error) {
      console.error('SMS sending error:', error);
      return { success: false, error: 'Failed to send SMS' };
    }
  }

  // Verify SMS code
  static verifySMSCode(userId: string, code: string): MFAVerification {
    const storedCode = this.getSMSCode(userId);
    
    if (!storedCode) {
      return { isValid: false };
    }

    if (storedCode.code === code && storedCode.expiresAt > new Date()) {
      // Remove used code
      this.removeSMSCode(userId);
      return { isValid: true };
    }

    // Increment failed attempts
    storedCode.attempts = (storedCode.attempts || 0) + 1;
    const remainingAttempts = this.MAX_ATTEMPTS - storedCode.attempts;

    if (remainingAttempts <= 0) {
      this.removeSMSCode(userId);
      return { isValid: false, remainingAttempts: 0 };
    }

    return { isValid: false, remainingAttempts };
  }

  // Temporary SMS code storage (use Redis or database in production)
  private static smsCodeStore = new Map<string, {
    code: string;
    expiresAt: Date;
    attempts: number;
  }>();

  private static storeSMSCode(userId: string, code: string) {
    this.smsCodeStore.set(userId, {
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0
    });
  }

  private static getSMSCode(userId: string) {
    return this.smsCodeStore.get(userId);
  }

  private static removeSMSCode(userId: string) {
    this.smsCodeStore.delete(userId);
  }

  // Check if user needs MFA
  static async requiresMFA(userId: string): Promise<boolean> {
    // In a real implementation, check user's MFA settings in database
    // For now, return true if user has MFA enabled
    return true; // Placeholder - implement based on user settings
  }

  // Get user's MFA methods
  static async getUserMFAMethods(userId: string): Promise<{
    totp: boolean;
    sms: boolean;
    backupCodes: number;
  }> {
    // Placeholder - implement based on database storage
    return {
      totp: true,
      sms: false,
      backupCodes: 8
    };
  }

  // Generate new backup codes when old ones are exhausted
  static generateNewBackupCodes(): string[] {
    return this.generateBackupCodes();
  }
}

// MFA middleware for Express routes
export const requireMFA = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.claims.sub;
  const mfaRequired = await MFAService.requiresMFA(userId);

  if (mfaRequired && !req.session.mfaVerified) {
    return res.status(403).json({ 
      error: 'MFA verification required',
      mfaRequired: true
    });
  }

  next();
};

// Types for database schema (to be added to shared/schema.ts)
export interface UserMFASettings {
  id: string;
  userId: string;
  totpSecret?: string;
  phoneNumber?: string;
  backupCodes: string[];
  mfaEnabled: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MFAAttempt {
  id: string;
  userId: string;
  method: 'totp' | 'sms' | 'backup';
  success: boolean;
  ip: string;
  userAgent: string;
  attemptedAt: Date;
}