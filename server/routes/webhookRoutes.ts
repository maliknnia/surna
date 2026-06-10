// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Webhook Routes - Handle external service webhooks and real-time integrations
import type { Express } from "express";
import { PaymentService } from "../services/paymentService";
import { NotificationService } from "../services/notificationService";
import crypto from "crypto";

export function registerWebhookRoutes(app: Express) {
  // Stripe webhook handler
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!signature || !endpointSecret) {
        console.error('Missing Stripe webhook signature or secret');
        return res.status(400).json({ error: "Missing webhook signature or secret" });
      }

      // Handle Stripe webhook
      await PaymentService.handleWebhook(
        JSON.stringify(req.body),
        signature,
        endpointSecret
      );

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });

  // Google Maps webhook (for Places API updates)
  app.post("/api/webhooks/google-maps", async (req, res) => {
    try {
      // Verify Google webhook signature
      const signature = req.headers['x-goog-signature'] as string;
      const timestamp = req.headers['x-goog-timestamp'] as string;
      
      // In a real implementation, verify Google's signature
      console.log('📍 Google Maps webhook received:', {
        signature: signature?.substring(0, 20) + '...',
        timestamp,
        body: req.body
      });

      // Handle place updates, reviews, etc.
      const { eventType, placeId, data } = req.body;
      
      switch (eventType) {
        case 'place.updated':
          console.log(`Place ${placeId} was updated:`, data);
          break;
        case 'review.created':
          console.log(`New review for place ${placeId}:`, data);
          break;
        default:
          console.log(`Unknown Google Maps event: ${eventType}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Google Maps webhook error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });

  // Social media webhook (for Instagram, Facebook, etc.)
  app.post("/api/webhooks/social/:platform", async (req, res) => {
    try {
      const { platform } = req.params;
      
      // Verify webhook based on platform
      let verified = false;
      
      switch (platform) {
        case 'facebook':
        case 'instagram':
          // Facebook/Instagram webhook verification
          const fbSignature = req.headers['x-hub-signature-256'] as string;
          if (fbSignature && process.env.FACEBOOK_WEBHOOK_SECRET) {
            const expectedSignature = crypto
              .createHmac('sha256', process.env.FACEBOOK_WEBHOOK_SECRET)
              .update(JSON.stringify(req.body))
              .digest('hex');
            verified = fbSignature === `sha256=${expectedSignature}`;
          }
          break;
        case 'twitter':
          // Twitter webhook verification
          const twitterSignature = req.headers['x-twitter-webhooks-signature'] as string;
          // Implement Twitter signature verification
          verified = true; // Simplified for demo
          break;
        default:
          console.log(`Unknown social platform: ${platform}`);
      }

      if (!verified) {
        return res.status(401).json({ error: "Webhook verification failed" });
      }

      console.log(`📱 ${platform} webhook received:`, req.body);

      // Handle different social media events
      const { object, entry } = req.body;
      
      if (entry && Array.isArray(entry)) {
        for (const item of entry) {
          const changes = item.changes || [];
          for (const change of changes) {
            await handleSocialMediaEvent(platform, change);
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error(`${req.params.platform} webhook error:`, error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });

  // Analytics webhook (for third-party analytics services)
  app.post("/api/webhooks/analytics/:service", async (req, res) => {
    try {
      const { service } = req.params;
      
      console.log(`📊 ${service} analytics webhook received:`, req.body);

      // Handle analytics events from external services
      switch (service) {
        case 'mixpanel':
          await handleMixpanelWebhook(req.body);
          break;
        case 'amplitude':
          await handleAmplitudeWebhook(req.body);
          break;
        case 'segment':
          await handleSegmentWebhook(req.body);
          break;
        default:
          console.log(`Unknown analytics service: ${service}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error(`${req.params.service} webhook error:`, error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });

  // Notification service webhook (for delivery confirmations)
  app.post("/api/webhooks/notifications/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      
      console.log(`🔔 ${provider} notification webhook received:`, req.body);

      // Handle notification delivery events
      switch (provider) {
        case 'firebase':
          await handleFirebaseWebhook(req.body);
          break;
        case 'onesignal':
          await handleOneSignalWebhook(req.body);
          break;
        case 'twilio':
          await handleTwilioWebhook(req.body);
          break;
        case 'sendgrid':
          await handleSendGridWebhook(req.body);
          break;
        default:
          console.log(`Unknown notification provider: ${provider}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error(`${req.params.provider} webhook error:`, error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });

  // Generic webhook handler for custom integrations
  app.post("/api/webhooks/custom/:integration", async (req, res) => {
    try {
      const { integration } = req.params;
      const signature = req.headers['x-webhook-signature'] as string;
      
      // Basic signature verification for custom webhooks
      if (process.env.CUSTOM_WEBHOOK_SECRET && signature) {
        const expectedSignature = crypto
          .createHmac('sha256', process.env.CUSTOM_WEBHOOK_SECRET)
          .update(JSON.stringify(req.body))
          .digest('hex');
        
        if (signature !== expectedSignature) {
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      }

      console.log(`🔗 Custom ${integration} webhook received:`, req.body);

      // Handle custom integration events
      await handleCustomIntegrationWebhook(integration, req.body);

      res.json({ received: true });
    } catch (error) {
      console.error(`Custom ${req.params.integration} webhook error:`, error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });
}

// Helper functions for handling different webhook types

async function handleSocialMediaEvent(platform: string, change: any): Promise<void> {
  console.log(`Processing ${platform} event:`, change);
  
  // Handle different social media events
  switch (change.field) {
    case 'feed':
      // Handle feed updates (new posts, mentions)
      if (change.value?.item === 'status') {
        console.log('New social media post detected');
        // Trigger notifications, analytics, etc.
      }
      break;
    case 'mention':
      // Handle brand mentions
      console.log('Brand mention detected');
      // Send notification to admin team
      break;
    default:
      console.log(`Unknown ${platform} change field: ${change.field}`);
  }
}

async function handleMixpanelWebhook(data: any): Promise<void> {
  console.log('Processing Mixpanel webhook:', data);
  // Handle Mixpanel analytics events
}

async function handleAmplitudeWebhook(data: any): Promise<void> {
  console.log('Processing Amplitude webhook:', data);
  // Handle Amplitude analytics events
}

async function handleSegmentWebhook(data: any): Promise<void> {
  console.log('Processing Segment webhook:', data);
  // Handle Segment analytics events
}

async function handleFirebaseWebhook(data: any): Promise<void> {
  console.log('Processing Firebase notification webhook:', data);
  
  // Handle Firebase Cloud Messaging delivery events
  if (data.deliveryAttemptCount) {
    console.log(`FCM delivery attempt ${data.deliveryAttemptCount} for message ${data.messageId}`);
  }
}

async function handleOneSignalWebhook(data: any): Promise<void> {
  console.log('Processing OneSignal webhook:', data);
  
  // Handle OneSignal notification events
  switch (data.type) {
    case 'click':
      console.log(`Notification clicked: ${data.id}`);
      break;
    case 'delivered':
      console.log(`Notification delivered: ${data.id}`);
      break;
    default:
      console.log(`Unknown OneSignal event: ${data.type}`);
  }
}

async function handleTwilioWebhook(data: any): Promise<void> {
  console.log('Processing Twilio webhook:', data);
  
  // Handle SMS/WhatsApp delivery events
  switch (data.MessageStatus) {
    case 'delivered':
      console.log(`SMS delivered: ${data.MessageSid}`);
      break;
    case 'failed':
      console.log(`SMS failed: ${data.MessageSid} - ${data.ErrorMessage}`);
      break;
    default:
      console.log(`SMS status: ${data.MessageStatus}`);
  }
}

async function handleSendGridWebhook(data: any): Promise<void> {
  console.log('Processing SendGrid webhook:', data);
  
  // Handle email delivery events
  if (Array.isArray(data)) {
    for (const event of data) {
      console.log(`Email ${event.event}: ${event.email} - ${event.sg_message_id}`);
    }
  }
}

async function handleCustomIntegrationWebhook(integration: string, data: any): Promise<void> {
  console.log(`Processing custom ${integration} webhook:`, data);
  
  // Handle custom integration events based on integration type
  // This could be CRM webhooks, custom analytics, third-party services, etc.
}