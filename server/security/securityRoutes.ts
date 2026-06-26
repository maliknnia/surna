// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { TwoFactorAuthService } from "./twoFactorAuth";
import { PasswordPolicyService } from "./passwordPolicy";
import { PrivacyControlsService } from "./privacyControls";
import { SecurityMonitoringService } from "./securityMonitoring";
import { isAuthenticated } from "../replitAuth";
import { 
  authRateLimit, 
  passwordResetRateLimit, 
  enforcePasswordPolicy,
  securityMonitoring 
} from "./securityMiddleware";
import { z } from "zod";
import { twoFactorSetupSchema, changePasswordSchema } from "@shared/schema";
import { authUserId } from "../lib/authUser";
import { complianceService } from "./complianceReporting";
import { storage } from "../storage";

const router = Router();

// Apply security monitoring to all routes
router.use(securityMonitoring);

// Two-Factor Authentication Routes
router.post('/2fa/setup', isAuthenticated, authRateLimit, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const setup = await TwoFactorAuthService.setupTwoFactor(userId, 'SURNA');
    
    res.json({
      qrCode: setup.qrCode,
      backupCodes: setup.backupCodes,
      message: 'Two-factor authentication setup initiated. Please verify with your authenticator app.'
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup two-factor authentication' });
  }
});

router.post('/2fa/enable', isAuthenticated, authRateLimit, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = twoFactorSetupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validation.error.issues });
    }

    const { secret, token } = validation.data;
    const backupCodes = await TwoFactorAuthService.enableTwoFactor(userId, secret, token, []);
    
    if (backupCodes) {
      res.json({ 
        message: 'Two-factor authentication enabled successfully',
        backupCodes 
      });
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ error: 'Failed to enable two-factor authentication' });
  }
});

router.post('/2fa/verify', isAuthenticated, authRateLimit, async (req, res) => {
  try {
    const userId = authUserId(req);
    const { code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }

    const verification = await TwoFactorAuthService.verifyTwoFactor(userId, code);
    
    if (verification.isValid) {
      // Mark session as 2FA verified
      req.session.twoFactorVerified = true;
      
      res.json({ 
        message: 'Two-factor authentication verified successfully',
        usedBackupCode: verification.usedBackupCode 
      });
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify two-factor authentication' });
  }
});

router.post('/2fa/disable', isAuthenticated, authRateLimit, async (req, res) => {
  try {
    const userId = authUserId(req);
    const { password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ error: 'Password is required to disable 2FA' });
    }

    // Verify password before disabling 2FA
    const passwordService = new PasswordPolicyService();
    const isValidPassword = await passwordService.verifyPassword(userId, password);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    await TwoFactorAuthService.disableTwoFactor(userId);
    req.session.twoFactorVerified = false;
    
    res.json({ message: 'Two-factor authentication disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable two-factor authentication' });
  }
});

// Password Management Routes
router.post('/password/change', isAuthenticated, passwordResetRateLimit, enforcePasswordPolicy, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validation.error.issues });
    }

    const { currentPassword, newPassword } = validation.data;
    const passwordService = new PasswordPolicyService();

    // Verify current password
    const isValidPassword = await passwordService.verifyPassword(userId, currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Change password
    await passwordService.updatePassword(userId, newPassword);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.get('/password/policy', (req, res) => {
  const passwordService = new PasswordPolicyService();
  const policy = passwordService.getPasswordPolicy();
  
  res.json({
    requirements: {
      minLength: policy.minLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireNumbers: policy.requireNumbers,
      requireSpecialChars: policy.requireSpecialChars,
      maxAge: policy.maxAge,
      preventReuse: policy.preventReuse
    }
  });
});

// Privacy Settings Routes
router.get('/privacy/settings', isAuthenticated, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const settings = await PrivacyControlsService.getUserPrivacySettings(userId);
    
    res.json(settings);
  } catch (error) {
    console.error('Privacy settings error:', error);
    res.status(500).json({ error: 'Failed to get privacy settings' });
  }
});

router.put('/privacy/settings', isAuthenticated, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await PrivacyControlsService.updatePrivacySettings(userId, req.body);
    const updatedSettings = await PrivacyControlsService.getUserPrivacySettings(userId);

    res.json(updatedSettings);
  } catch (error) {
    console.error('Privacy settings update error:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// GDPR/CCPA Data Compliance Routes
router.get('/privacy/data-export', isAuthenticated, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dataExport = await PrivacyControlsService.exportUserData(userId);
    
    res.json({
      message: 'Data export completed',
      data: dataExport,
      exportDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

router.post('/privacy/data-deletion', isAuthenticated, async (req, res) => {
  try {
    const userId = authUserId(req);
    const { confirmDelete, reason } = req.body;

    if (!userId || !confirmDelete) {
      return res.status(400).json({ error: 'Confirmation required for data deletion' });
    }

    const user = await storage.getUser(userId);
    const email = (user?.email ?? "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "User email required for deletion request" });
    }

    const result = await complianceService.submitGDPRDataDeletionRequest(
      userId,
      email,
      req,
      typeof reason === "string" ? reason : undefined,
      { skipVerification: true },
    );
    if (!result.success || !result.requestId) {
      return res.status(500).json({
        error: result.error ?? "Failed to initiate data deletion",
      });
    }

    res.json({
      message: "Account deletion initiated. Your data will be permanently deleted within 30 days.",
      requestId: result.requestId,
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    res.status(500).json({ error: 'Failed to initiate data deletion' });
  }
});

// Security Events and Monitoring Routes
router.get('/events', isAuthenticated, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const securityService = new SecurityMonitoringService();
    const events = await securityService.getUserSecurityEvents(userId);
    
    res.json({
      events: events.map(event => ({
        id: event.id,
        eventType: event.eventType,
        threatLevel: event.threatLevel,
        description: event.description,
        ipAddress: event.ipAddress,
        timestamp: event.createdAt,
        resolved: event.resolved
      }))
    });
  } catch (error) {
    console.error('Security events error:', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const securityService = new SecurityMonitoringService();
    const status = await securityService.getUserSecurityStatus(userId);
    
    res.json(status);
  } catch (error) {
    console.error('Security status error:', error);
    res.status(500).json({ error: 'Failed to get security status' });
  }
});

export default router;