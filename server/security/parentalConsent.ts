// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Stage 6: COPPA Compliance & Parental Consent System
import { db } from "../db";
import { sql } from "drizzle-orm";
import { auditLogger, AuditEventType, AuditSeverity } from "./auditLogging";
import type { Request, Response } from 'express';
import validator from 'validator';

export enum ConsentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

export enum ConsentMethod {
  VIDEO_VERIFICATION = 'video_verification',
  ID_VERIFICATION = 'id_verification',
  NOTARIZED_DOCUMENT = 'notarized_document',
  DIGITAL_SIGNATURE = 'digital_signature'
}

export interface ParentalConsentRecord {
  id: string;
  userId: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  consentMethod: ConsentMethod;
  status: ConsentStatus;
  verificationData?: {
    videoUrl?: string;
    documentUrl?: string;
    signatureData?: string;
    verificationCode?: string;
  };
  submittedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string; // Admin who verified
  expiresAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
  ipAddress: string;
  userAgent: string;
  additionalNotes?: string;
}

export interface ConsentVerificationResult {
  isValid: boolean;
  status: ConsentStatus;
  expiresAt?: Date;
  errors?: string[];
}

class ParentalConsentService {
  private static instance: ParentalConsentService;

  private constructor() {
    this.initializeDatabase();
  }

  public static getInstance(): ParentalConsentService {
    if (!ParentalConsentService.instance) {
      ParentalConsentService.instance = new ParentalConsentService();
    }
    return ParentalConsentService.instance;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const createTableQuery = sql`
        CREATE TABLE IF NOT EXISTS parental_consent (
          id VARCHAR PRIMARY KEY,
          user_id VARCHAR NOT NULL UNIQUE,
          parent_name VARCHAR NOT NULL,
          parent_email VARCHAR NOT NULL,
          parent_phone VARCHAR,
          consent_method VARCHAR NOT NULL,
          status VARCHAR NOT NULL DEFAULT 'pending',
          verification_data JSONB,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          verified_at TIMESTAMP WITH TIME ZONE,
          verified_by VARCHAR,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          revoked_at TIMESTAMP WITH TIME ZONE,
          revoked_reason TEXT,
          ip_address VARCHAR NOT NULL,
          user_agent TEXT,
          additional_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      
      await db.execute(createTableQuery);

      // Create indexes for performance
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_parental_consent_user_id ON parental_consent(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_parental_consent_status ON parental_consent(status)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_parental_consent_expires_at ON parental_consent(expires_at)`);
    } catch (error) {
      console.error('Failed to initialize parental consent database:', error);
    }
  }

  public async submitConsentRequest(
    userId: string,
    parentInfo: {
      parentName: string;
      parentEmail: string;
      parentPhone?: string;
      consentMethod: ConsentMethod;
      verificationData?: any;
    },
    req: Request
  ): Promise<{ success: boolean; consentId?: string; error?: string }> {
    try {
      // Validate input
      const validation = this.validateConsentRequest(parentInfo);
      if (!validation.isValid) {
        return { success: false, error: validation.errors?.[0] };
      }

      // Check if user already has a consent request
      const existingConsent = await this.getConsentRecord(userId);
      if (existingConsent && existingConsent.status === ConsentStatus.VERIFIED) {
        return { success: false, error: 'User already has verified parental consent' };
      }

      const consentId = this.generateConsentId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const insertQuery = sql`
        INSERT INTO parental_consent (
          id, user_id, parent_name, parent_email, parent_phone, consent_method,
          status, verification_data, expires_at, ip_address, user_agent
        ) VALUES (
          ${consentId}, ${userId}, ${parentInfo.parentName}, ${parentInfo.parentEmail},
          ${parentInfo.parentPhone}, ${parentInfo.consentMethod}, ${ConsentStatus.PENDING},
          ${JSON.stringify(parentInfo.verificationData)}, ${expiresAt},
          ${req.ip}, ${req.get('User-Agent')}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          parent_name = EXCLUDED.parent_name,
          parent_email = EXCLUDED.parent_email,
          parent_phone = EXCLUDED.parent_phone,
          consent_method = EXCLUDED.consent_method,
          status = EXCLUDED.status,
          verification_data = EXCLUDED.verification_data,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `;

      await db.execute(insertQuery);

      // Log audit event
      await auditLogger.log({
        eventType: AuditEventType.PARENTAL_CONSENT_GRANTED,
        severity: AuditSeverity.MEDIUM,
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: 'parental_consent',
        resourceId: consentId,
        additionalData: {
          parentEmail: parentInfo.parentEmail,
          consentMethod: parentInfo.consentMethod
        },
        success: true
      });

      // Send verification email to parent
      await this.sendParentVerificationEmail(parentInfo.parentEmail, consentId, parentInfo.parentName);

      return { success: true, consentId };
    } catch (error) {
      console.error('Failed to submit consent request:', error);
      return { success: false, error: 'Failed to submit consent request' };
    }
  }

  public async verifyConsent(
    consentId: string,
    adminUserId: string,
    approved: boolean,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const status = approved ? ConsentStatus.VERIFIED : ConsentStatus.REJECTED;
      const verifiedAt = approved ? new Date() : null;

      const updateQuery = sql`
        UPDATE parental_consent 
        SET status = ${status}, verified_at = ${verifiedAt}, verified_by = ${adminUserId},
            additional_notes = ${notes}, updated_at = NOW()
        WHERE id = ${consentId}
      `;

      await db.execute(updateQuery);

      // Get consent record for audit logging
      const consentRecord = await this.getConsentRecordById(consentId);
      if (consentRecord) {
        await auditLogger.log({
          eventType: approved ? AuditEventType.PARENTAL_CONSENT_GRANTED : AuditEventType.PARENTAL_CONSENT_REVOKED,
          severity: AuditSeverity.HIGH,
          userId: consentRecord.userId,
          resource: 'parental_consent',
          resourceId: consentId,
          additionalData: {
            adminUserId,
            approved,
            notes
          },
          success: true
        });

        // If approved, update user record
        if (approved) {
          await this.updateUserConsentStatus(consentRecord.userId, true);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to verify consent:', error);
      return { success: false, error: 'Failed to verify consent' };
    }
  }

  public async revokeConsent(
    userId: string,
    reason: string,
    revokedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateQuery = sql`
        UPDATE parental_consent 
        SET status = ${ConsentStatus.REVOKED}, revoked_at = NOW(), 
            revoked_reason = ${reason}, updated_at = NOW()
        WHERE user_id = ${userId} AND status = ${ConsentStatus.VERIFIED}
      `;

      await db.execute(updateQuery);

      // Update user record
      await this.updateUserConsentStatus(userId, false);

      // Log audit event
      await auditLogger.log({
        eventType: AuditEventType.PARENTAL_CONSENT_REVOKED,
        severity: AuditSeverity.HIGH,
        userId,
        resource: 'parental_consent',
        additionalData: {
          reason,
          revokedBy
        },
        success: true
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to revoke consent:', error);
      return { success: false, error: 'Failed to revoke consent' };
    }
  }

  public async checkConsentStatus(userId: string): Promise<ConsentVerificationResult> {
    try {
      const consentRecord = await this.getConsentRecord(userId);
      
      if (!consentRecord) {
        return {
          isValid: false,
          status: ConsentStatus.PENDING,
          errors: ['No parental consent record found']
        };
      }

      // Check if consent has expired
      if (consentRecord.expiresAt && new Date() > consentRecord.expiresAt) {
        // Mark as expired
        await db.execute(sql`
          UPDATE parental_consent 
          SET status = ${ConsentStatus.EXPIRED}, updated_at = NOW()
          WHERE id = ${consentRecord.id}
        `);
        
        return {
          isValid: false,
          status: ConsentStatus.EXPIRED,
          errors: ['Parental consent has expired']
        };
      }

      return {
        isValid: consentRecord.status === ConsentStatus.VERIFIED,
        status: consentRecord.status,
        expiresAt: consentRecord.expiresAt
      };
    } catch (error) {
      console.error('Failed to check consent status:', error);
      return {
        isValid: false,
        status: ConsentStatus.PENDING,
        errors: ['Failed to verify consent status']
      };
    }
  }

  public async getPendingConsentRequests(): Promise<ParentalConsentRecord[]> {
    try {
      const query = sql`
        SELECT * FROM parental_consent 
        WHERE status = ${ConsentStatus.PENDING}
        ORDER BY submitted_at ASC
      `;
      
      const result = await db.execute(query);
      return result.rows as ParentalConsentRecord[];
    } catch (error) {
      console.error('Failed to get pending consent requests:', error);
      return [];
    }
  }

  private async getConsentRecord(userId: string): Promise<ParentalConsentRecord | null> {
    try {
      const query = sql`
        SELECT * FROM parental_consent 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await db.execute(query);
      return result.rows[0] as ParentalConsentRecord || null;
    } catch (error) {
      console.error('Failed to get consent record:', error);
      return null;
    }
  }

  private async getConsentRecordById(consentId: string): Promise<ParentalConsentRecord | null> {
    try {
      const query = sql`SELECT * FROM parental_consent WHERE id = ${consentId}`;
      const result = await db.execute(query);
      return result.rows[0] as ParentalConsentRecord || null;
    } catch (error) {
      console.error('Failed to get consent record by ID:', error);
      return null;
    }
  }

  private async updateUserConsentStatus(userId: string, hasConsent: boolean): Promise<void> {
    try {
      // This would update the main users table
      const updateUserQuery = sql`
        UPDATE users 
        SET parental_consent_verified = ${hasConsent}, updated_at = NOW()
        WHERE id = ${userId}
      `;
      
      await db.execute(updateUserQuery);
    } catch (error) {
      console.error('Failed to update user consent status:', error);
    }
  }

  private validateConsentRequest(parentInfo: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!parentInfo.parentName || parentInfo.parentName.trim().length < 2) {
      errors.push('Parent name is required and must be at least 2 characters');
    }

    if (!parentInfo.parentEmail || !validator.isEmail(parentInfo.parentEmail)) {
      errors.push('Valid parent email is required');
    }

    if (parentInfo.parentPhone && !validator.isMobilePhone(parentInfo.parentPhone)) {
      errors.push('Invalid phone number format');
    }

    if (!Object.values(ConsentMethod).includes(parentInfo.consentMethod)) {
      errors.push('Invalid consent method');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendParentVerificationEmail(email: string, consentId: string, parentName: string): Promise<void> {
    // In a real implementation, this would send an email to the parent
    // with a verification link and instructions
    console.log(`📧 Sending parental consent verification email to ${email} for consent ${consentId}`);
    
    // Simulate email sending
    // Implementation would use a service like SendGrid, SES, etc.
  }

  // Clean up expired consent requests
  public async cleanupExpiredConsents(): Promise<void> {
    try {
      const cleanupQuery = sql`
        UPDATE parental_consent 
        SET status = ${ConsentStatus.EXPIRED}, updated_at = NOW()
        WHERE status = ${ConsentStatus.PENDING} AND expires_at < NOW()
      `;
      
      await db.execute(cleanupQuery);
    } catch (error) {
      console.error('Failed to cleanup expired consents:', error);
    }
  }
}

export const parentalConsentService = ParentalConsentService.getInstance();

// Express middleware to check COPPA compliance
export function requireParentalConsentMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user needs parental consent (under 18)
      const userAge = req.user?.age; // This would be calculated from date of birth
      if (userAge && userAge < 18) {
        const consentStatus = await parentalConsentService.checkConsentStatus(userId);
        
        if (!consentStatus.isValid) {
          return res.status(403).json({
            error: 'Parental consent required',
            message: 'Users under 18 require verified parental consent to access this feature',
            consentStatus: consentStatus.status,
            redirectTo: '/parental-consent'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error checking parental consent:', error);
      res.status(500).json({ error: 'Failed to verify parental consent' });
    }
  };
}

// Cleanup job to run periodically
setInterval(async () => {
  await parentalConsentService.cleanupExpiredConsents();
}, 24 * 60 * 60 * 1000); // Run daily