// Marketing API — referrals, social sharing, campaigns, promotions
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { authUserId } from "../lib/authUser";
import { ReferralService } from "../services/referralService";
import { SocialSharingService } from "../services/socialSharingService";
import { EmailCampaignService } from "../services/emailCampaignService";
import { GrowthAnalyticsService } from "../services/growthAnalyticsService";
import { PromotionService } from "../services/promotionService";
import { db } from "../db";
import { socialShares, users } from "@shared/schema";
import { eq } from "drizzle-orm";

type SessionRequest = Parameters<typeof authUserId>[0];

function requireUserId(req: Request, res: Response): string | null {
  const userId = authUserId(req as SessionRequest);
  if (!userId) {
    res.status(401).json({ message: "User not authenticated" });
    return null;
  }
  return userId;
}

export function registerMarketingRoutes(app: Express) {
  app.get("/api/referrals/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const stats = await ReferralService.getUserReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Failed to get referral stats:", error);
      res.status(500).json({ message: "Failed to get referral stats" });
    }
  });

  app.get("/api/referrals/history", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const referrals = await ReferralService.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Failed to get referral history:", error);
      res.status(500).json({ message: "Failed to get referral history" });
    }
  });

  app.get("/api/referrals/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const topReferrers = await ReferralService.getTopReferrers(limit);
      res.json(topReferrers);
    } catch (error) {
      console.error("Failed to get referral leaderboard:", error);
      res.status(500).json({ message: "Failed to get referral leaderboard" });
    }
  });

  app.post("/api/referrals/create", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const { inviteeEmail } = req.body as { inviteeEmail?: string };

      if (!inviteeEmail || !/\S+@\S+\.\S+/.test(inviteeEmail)) {
        return res.status(400).json({ message: "Valid email address is required" });
      }

      const referral = await ReferralService.createReferral(userId, inviteeEmail);

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const inviterName = user ? `${user.firstName} ${user.lastName}`.trim() : "A friend";

      await EmailCampaignService.sendReferralInvitation(
        inviteeEmail,
        inviterName,
        referral.referralCode,
      );

      res.json(referral);
    } catch (error) {
      console.error("Failed to create referral:", error);
      res.status(500).json({ message: "Failed to create referral" });
    }
  });

  app.post("/api/referrals/process-signup", async (req, res) => {
    try {
      const { referralCode, userId } = req.body as { referralCode?: string; userId?: string };

      if (!referralCode || !userId) {
        return res.status(400).json({ message: "Referral code and user ID are required" });
      }

      const success = await ReferralService.processReferralSignup(referralCode, userId);
      res.json({ success });
    } catch (error) {
      console.error("Failed to process referral signup:", error);
      res.status(500).json({ message: "Failed to process referral signup" });
    }
  });

  app.post("/api/social-shares/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const { contentType, contentId } = req.body as { contentType?: string; contentId?: string };

      let shareContent;
      const utmParams = {
        source: "share",
        medium: "social",
        campaign: "content_sharing",
        content: contentId,
      };

      switch (contentType) {
        case "referral": {
          if (!contentId) {
            return res.status(400).json({ message: "Content ID is required" });
          }
          shareContent = SocialSharingService.generateReferralShareContent(userId, contentId);
          utmParams.campaign = "user_referral";
          break;
        }
        default:
          return res.status(400).json({ message: "Unsupported content type" });
      }

      const shareUrls = SocialSharingService.generateAllShareUrls(shareContent, utmParams);

      res.json({
        content: shareContent,
        urls: shareUrls,
        utmParams,
      });
    } catch (error) {
      console.error("Failed to generate share content:", error);
      res.status(500).json({ message: "Failed to generate share content" });
    }
  });

  app.post("/api/social-shares/track", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const { platform, contentType, contentId, utmParams } = req.body as {
        platform?: string;
        contentType?: string;
        contentId?: string;
        utmParams?: { source?: string; medium?: string; campaign?: string };
      };

      await db.insert(socialShares).values({
        userId,
        platform: platform ?? "unknown",
        contentType: contentType ?? "unknown",
        contentId: contentId ?? "",
        metadata: utmParams ?? null,
      });

      await SocialSharingService.trackShareEvent(
        platform ?? "unknown",
        contentType ?? "unknown",
        contentId ?? "",
        userId,
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to track share event:", error);
      res.status(500).json({ message: "Failed to track share event" });
    }
  });

  app.get("/api/growth/metrics", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const metrics = await GrowthAnalyticsService.getGrowthMetrics(startDate, endDate);
      res.json(metrics);
    } catch (error) {
      console.error("Failed to get growth metrics:", error);
      res.status(500).json({ message: "Failed to get growth metrics" });
    }
  });

  app.get("/api/growth/trends", isAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const trends = await GrowthAnalyticsService.getUserGrowthTrends(days);
      res.json(trends);
    } catch (error) {
      console.error("Failed to get growth trends:", error);
      res.status(500).json({ message: "Failed to get growth trends" });
    }
  });

  app.get("/api/growth/top-referrers", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const topReferrers = await GrowthAnalyticsService.getTopReferrers(limit);
      res.json(topReferrers);
    } catch (error) {
      console.error("Failed to get top referrers:", error);
      res.status(500).json({ message: "Failed to get top referrers" });
    }
  });

  app.get("/api/promotions/active", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const userSegment = (req.query.segment as string) || "all";

      const promotions = await PromotionService.getActivePromotions(userId, userSegment);
      res.json(promotions);
    } catch (error) {
      console.error("Failed to get active promotions:", error);
      res.status(500).json({ message: "Failed to get active promotions" });
    }
  });

  app.post("/api/promotions/view", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const { promotionId } = req.body as { promotionId?: string };
      if (!promotionId) {
        return res.status(400).json({ message: "Promotion ID is required" });
      }

      await PromotionService.trackPromotionView(promotionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to track promotion view:", error);
      res.status(500).json({ message: "Failed to track promotion view" });
    }
  });

  app.post("/api/promotions/click", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const { promotionId } = req.body as { promotionId?: string };
      if (!promotionId) {
        return res.status(400).json({ message: "Promotion ID is required" });
      }

      await PromotionService.trackPromotionClick(promotionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to track promotion click:", error);
      res.status(500).json({ message: "Failed to track promotion click" });
    }
  });

  app.post("/api/promotions/dismiss", isAuthenticated, async (req, res) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;
      const { promotionId } = req.body as { promotionId?: string };
      if (!promotionId) {
        return res.status(400).json({ message: "Promotion ID is required" });
      }

      await PromotionService.trackPromotionDismissal(promotionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to track promotion dismissal:", error);
      res.status(500).json({ message: "Failed to track promotion dismissal" });
    }
  });

  app.post("/api/email/welcome", async (req, res) => {
    try {
      const { email, firstName } = req.body as { email?: string; firstName?: string };

      if (!email || !firstName) {
        return res.status(400).json({ message: "Email and first name are required" });
      }

      const success = await EmailCampaignService.sendWelcomeEmail(email, firstName);
      res.json({ success });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      res.status(500).json({ message: "Failed to send welcome email" });
    }
  });

  app.get("/api/email/templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = EmailCampaignService.getAvailableTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Failed to get email templates:", error);
      res.status(500).json({ message: "Failed to get email templates" });
    }
  });
}
