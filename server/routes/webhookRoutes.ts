// Webhook Routes - Handle external service webhooks and real-time integrations
import type { Express } from "express";
import { PaymentService } from "../services/paymentService";
import crypto from "crypto";

export function registerWebhookRoutes(app: Express) {
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!signature || !endpointSecret) {
        console.error("Missing Stripe webhook signature or secret");
        return res.status(400).json({ error: "Missing webhook signature or secret" });
      }

      await PaymentService.handleWebhook(JSON.stringify(req.body), signature, endpointSecret);
      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });

  app.post("/api/webhooks/google-maps", async (req, res) => {
    try {
      res.json({ received: true });
    } catch (error) {
      console.error("Google Maps webhook error:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });

  app.post("/api/webhooks/social/:platform", async (req, res) => {
    try {
      const { platform } = req.params;

      let verified = false;

      switch (platform) {
        case "facebook":
        case "instagram": {
          const fbSignature = req.headers["x-hub-signature-256"] as string;
          if (fbSignature && process.env.FACEBOOK_WEBHOOK_SECRET) {
            const expectedSignature = crypto
              .createHmac("sha256", process.env.FACEBOOK_WEBHOOK_SECRET)
              .update(JSON.stringify(req.body))
              .digest("hex");
            verified = fbSignature === `sha256=${expectedSignature}`;
          }
          break;
        }
        case "twitter":
          verified = true;
          break;
        default:
          return res.status(404).json({ error: "Unknown social platform" });
      }

      if (!verified) {
        return res.status(401).json({ error: "Webhook verification failed" });
      }

      const { entry } = req.body as { entry?: Array<{ changes?: unknown[] }> };
      if (entry && Array.isArray(entry)) {
        for (const item of entry) {
          for (const change of item.changes || []) {
            await handleSocialMediaEvent(platform, change);
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error(`${req.params.platform} webhook error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });

  app.post("/api/webhooks/analytics/:service", async (req, res) => {
    try {
      const { service } = req.params;

      switch (service) {
        case "mixpanel":
          await handleMixpanelWebhook(req.body);
          break;
        case "amplitude":
          await handleAmplitudeWebhook(req.body);
          break;
        case "segment":
          await handleSegmentWebhook(req.body);
          break;
        default:
          return res.status(404).json({ error: "Unknown analytics service" });
      }

      res.json({ received: true });
    } catch (error) {
      console.error(`${req.params.service} webhook error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });

  app.post("/api/webhooks/notifications/:provider", async (req, res) => {
    try {
      const { provider } = req.params;

      switch (provider) {
        case "firebase":
          await handleFirebaseWebhook(req.body);
          break;
        case "onesignal":
          await handleOneSignalWebhook(req.body);
          break;
        case "twilio":
          await handleTwilioWebhook(req.body);
          break;
        case "sendgrid":
          await handleSendGridWebhook(req.body);
          break;
        default:
          return res.status(404).json({ error: "Unknown notification provider" });
      }

      res.json({ received: true });
    } catch (error) {
      console.error(`${req.params.provider} webhook error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });

  app.post("/api/webhooks/custom/:integration", async (req, res) => {
    try {
      const { integration } = req.params;
      const signature = req.headers["x-webhook-signature"] as string;

      if (process.env.CUSTOM_WEBHOOK_SECRET && signature) {
        const expectedSignature = crypto
          .createHmac("sha256", process.env.CUSTOM_WEBHOOK_SECRET)
          .update(JSON.stringify(req.body))
          .digest("hex");

        if (signature !== expectedSignature) {
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      }

      await handleCustomIntegrationWebhook(integration, req.body);
      res.json({ received: true });
    } catch (error) {
      console.error(`Custom ${req.params.integration} webhook error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });
}

async function handleSocialMediaEvent(_platform: string, _change: unknown): Promise<void> {
  // Placeholder for social feed / mention handling
}

async function handleMixpanelWebhook(_data: unknown): Promise<void> {}

async function handleAmplitudeWebhook(_data: unknown): Promise<void> {}

async function handleSegmentWebhook(_data: unknown): Promise<void> {}

async function handleFirebaseWebhook(_data: unknown): Promise<void> {}

async function handleOneSignalWebhook(_data: unknown): Promise<void> {}

async function handleTwilioWebhook(_data: unknown): Promise<void> {}

async function handleSendGridWebhook(_data: unknown): Promise<void> {}

async function handleCustomIntegrationWebhook(_integration: string, _data: unknown): Promise<void> {}
