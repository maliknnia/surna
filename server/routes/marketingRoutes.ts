// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Marketing API Routes - Handle referrals, social sharing, campaigns, and promotions
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { ReferralService } from "../services/referralService";
import { SocialSharingService } from "../services/socialSharingService";
import { EmailCampaignService } from "../services/emailCampaignService";
import { GrowthAnalyticsService } from "../services/growthAnalyticsService";
import { PromotionService } from "../services/promotionService";
import { db } from "../db";
import { socialShares, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerMarketingRoutes(app: Express) {
  // ===== REFERRAL ROUTES =====
  
  // Get user's referral statistics
  app.get('/api/referrals/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await ReferralService.getUserReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Failed to get referral stats:', error);
      res.status(500).json({ message: 'Failed to get referral stats' });
    }
  });

  // Get user's referral history
  app.get('/api/referrals/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const referrals = await ReferralService.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error('Failed to get referral history:', error);
      res.status(500).json({ message: 'Failed to get referral history' });
    }
  });

  // Get referral leaderboard
  app.get('/api/referrals/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topReferrers = await ReferralService.getTopReferrers(limit);
      res.json(topReferrers);
    } catch (error) {
      console.error('Failed to get referral leaderboard:', error);
      res.status(500).json({ message: 'Failed to get referral leaderboard' });
    }
  });

  // Create referral invitation
  app.post('/api/referrals/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteeEmail } = req.body;

      if (!inviteeEmail || !/\S+@\S+\.\S+/.test(inviteeEmail)) {
        return res.status(400).json({ message: 'Valid email address is required' });
      }

      const referral = await ReferralService.createReferral(userId, inviteeEmail);
      
      // Get user info for personalized email
      const [user] = await db.select().from(users).where(users.id === userId);
      const inviterName = user ? `${user.firstName} ${user.lastName}`.trim() : 'A friend';

      // Send referral invitation email
      await EmailCampaignService.sendReferralInvitation(
        inviteeEmail,
        inviterName,
        referral.referralCode
      );

      res.json(referral);
    } catch (error) {
      console.error('Failed to create referral:', error);
      res.status(500).json({ message: 'Failed to create referral' });
    }
  });

  // Process referral signup (called during user registration)
  app.post('/api/referrals/process-signup', async (req, res) => {
    try {
      const { referralCode, userId } = req.body;

      if (!referralCode || !userId) {
        return res.status(400).json({ message: 'Referral code and user ID are required' });
      }

      const success = await ReferralService.processReferralSignup(referralCode, userId);
      res.json({ success });
    } catch (error) {
      console.error('Failed to process referral signup:', error);
      res.status(500).json({ message: 'Failed to process referral signup' });
    }
  });

  // ===== SOCIAL SHARING ROUTES =====

  // Generate share content for different types
  app.post('/api/social-shares/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { contentType, contentId } = req.body;
      const userId = req.user.claims.sub;

      let shareContent;
      let utmParams = {
        source: 'share',
        medium: 'social',
        campaign: 'content_sharing',
        content: contentId
      };

      // This would be expanded to handle different content types
      switch (contentType) {
        case 'referral':
          shareContent = SocialSharingService.generateReferralShareContent(userId, contentId);
          utmParams.campaign = 'user_referral';
          break;
        default:
          return res.status(400).json({ message: 'Unsupported content type' });
      }

      const shareUrls = SocialSharingService.generateAllShareUrls(shareContent, utmParams);

      res.json({
        content: shareContent,
        urls: shareUrls,
        utmParams
      });
    } catch (error) {
      console.error('Failed to generate share content:', error);
      res.status(500).json({ message: 'Failed to generate share content' });
    }
  });

  // Track social share event
  app.post('/api/social-shares/track', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { platform, contentType, contentId, utmParams } = req.body;

      // Track in database
      await db.insert(socialShares).values({
        userId,
        platform,
        contentType,
        contentId,
        utmSource: utmParams?.source,
        utmMedium: utmParams?.medium,
        utmCampaign: utmParams?.campaign
      });

      // Track with analytics service
      await SocialSharingService.trackShareEvent(platform, contentType, contentId, userId);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track share event:', error);
      res.status(500).json({ message: 'Failed to track share event' });
    }
  });

  // ===== GROWTH ANALYTICS ROUTES =====

  // Get comprehensive growth metrics
  app.get('/api/growth/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const metrics = await GrowthAnalyticsService.getGrowthMetrics(startDate, endDate);
      res.json(metrics);
    } catch (error) {
      console.error('Failed to get growth metrics:', error);
      res.status(500).json({ message: 'Failed to get growth metrics' });
    }
  });

  // Get user growth trends
  app.get('/api/growth/trends', isAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trends = await GrowthAnalyticsService.getUserGrowthTrends(days);
      res.json(trends);
    } catch (error) {
      console.error('Failed to get growth trends:', error);
      res.status(500).json({ message: 'Failed to get growth trends' });
    }
  });

  // Get top referrers
  app.get('/api/growth/top-referrers', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topReferrers = await GrowthAnalyticsService.getTopReferrers(limit);
      res.json(topReferrers);
    } catch (error) {
      console.error('Failed to get top referrers:', error);
      res.status(500).json({ message: 'Failed to get top referrers' });
    }
  });

  // ===== PROMOTION ROUTES =====

  // Get active promotions for user
  app.get('/api/promotions/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userSegment = req.query.segment as string || 'all';
      
      const promotions = await PromotionService.getActivePromotions(userId, userSegment);
      res.json(promotions);
    } catch (error) {
      console.error('Failed to get active promotions:', error);
      res.status(500).json({ message: 'Failed to get active promotions' });
    }
  });

  // Track promotion view
  app.post('/api/promotions/view', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promotionId } = req.body;

      await PromotionService.trackPromotionView(promotionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track promotion view:', error);
      res.status(500).json({ message: 'Failed to track promotion view' });
    }
  });

  // Track promotion click
  app.post('/api/promotions/click', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promotionId } = req.body;

      await PromotionService.trackPromotionClick(promotionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track promotion click:', error);
      res.status(500).json({ message: 'Failed to track promotion click' });
    }
  });

  // Track promotion dismissal
  app.post('/api/promotions/dismiss', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promotionId } = req.body;

      await PromotionService.trackPromotionDismissal(promotionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track promotion dismissal:', error);
      res.status(500).json({ message: 'Failed to track promotion dismissal' });
    }
  });

  // ===== EMAIL CAMPAIGN ROUTES =====

  // Send welcome email (called during user registration)
  app.post('/api/email/welcome', async (req, res) => {
    try {
      const { email, firstName } = req.body;

      if (!email || !firstName) {
        return res.status(400).json({ message: 'Email and first name are required' });
      }

      const success = await EmailCampaignService.sendWelcomeEmail(email, firstName);
      res.json({ success });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      res.status(500).json({ message: 'Failed to send welcome email' });
    }
  });

  // Get available email templates (admin)
  app.get('/api/email/templates', isAuthenticated, async (req, res) => {
    try {
      const templates = EmailCampaignService.getAvailableTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Failed to get email templates:', error);
      res.status(500).json({ message: 'Failed to get email templates' });
    }
  });
}