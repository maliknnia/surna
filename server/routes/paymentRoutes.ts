// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Payment Routes - Stripe payment integration endpoints
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { PaymentService } from "../services/paymentService";
import { z } from "zod";

// Validation schemas
const createPaymentIntentSchema = z.object({
  amount: z.number().min(0.5).max(999999),
  currency: z.string().optional().default('usd'),
  metadata: z.record(z.string()).optional()
});

const createSubscriptionSchema = z.object({
  priceId: z.string().min(1),
  metadata: z.record(z.string()).optional()
});

const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1),
  mode: z.enum(['payment', 'subscription']).default('payment'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional()
});

export function registerPaymentRoutes(app: Express) {
  // Create payment intent for one-time payments
  app.post("/api/payments/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const validatedData = createPaymentIntentSchema.parse(req.body);
      const userId = req.user?.claims?.sub;

      const paymentIntent = await PaymentService.createPaymentIntent(
        validatedData.amount,
        validatedData.currency,
        {
          userId,
          ...validatedData.metadata
        }
      );

      res.json(paymentIntent);
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create payment intent" 
      });
    }
  });

  // Create subscription
  app.post("/api/payments/create-subscription", isAuthenticated, async (req, res) => {
    try {
      const validatedData = createSubscriptionSchema.parse(req.body);
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;

      if (!userEmail) {
        return res.status(400).json({ message: "User email is required" });
      }

      // Create or get customer
      const customer = await PaymentService.createCustomer(
        userEmail,
        `${req.user?.claims?.first_name} ${req.user?.claims?.last_name}`.trim(),
        { userId }
      );

      const subscription = await PaymentService.createSubscription(
        customer.id,
        validatedData.priceId,
        {
          userId,
          ...validatedData.metadata
        }
      );

      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create subscription" 
      });
    }
  });

  // Create checkout session for hosted checkout
  app.post("/api/payments/create-checkout-session", isAuthenticated, async (req, res) => {
    try {
      const validatedData = createCheckoutSessionSchema.parse(req.body);
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const successUrl = validatedData.successUrl || `${baseUrl}/payment-success`;
      const cancelUrl = validatedData.cancelUrl || `${baseUrl}/payment-cancel`;

      let customerId: string | undefined;
      if (userEmail) {
        const customer = await PaymentService.createCustomer(
          userEmail,
          `${req.user?.claims?.first_name} ${req.user?.claims?.last_name}`.trim(),
          { userId }
        );
        customerId = customer.id;
      }

      const session = await PaymentService.createCheckoutSession(
        validatedData.priceId,
        validatedData.mode,
        successUrl,
        cancelUrl,
        customerId,
        {
          userId,
          ...validatedData.metadata
        }
      );

      res.json(session);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create checkout session" 
      });
    }
  });

  // Get user's subscriptions
  app.get("/api/payments/subscriptions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // This would need to be implemented in your storage layer
      // For now, return empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Get subscription details
  app.get("/api/payments/subscriptions/:subscriptionId", isAuthenticated, async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await PaymentService.getSubscription(subscriptionId);

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Cancel subscription
  app.delete("/api/payments/subscriptions/:subscriptionId", isAuthenticated, async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const success = await PaymentService.cancelSubscription(subscriptionId);

      if (!success) {
        return res.status(400).json({ message: "Failed to cancel subscription" });
      }

      res.json({ message: "Subscription canceled successfully" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Get available products and prices
  app.get("/api/payments/products", async (req, res) => {
    try {
      const products = await PaymentService.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get prices
  app.get("/api/payments/prices", async (req, res) => {
    try {
      const { productId } = req.query;
      const prices = await PaymentService.getPrices(productId as string);
      res.json(prices);
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  // Stripe webhook endpoint
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!signature || !endpointSecret) {
        return res.status(400).json({ message: "Missing webhook signature or secret" });
      }

      await PaymentService.handleWebhook(
        req.body,
        signature,
        endpointSecret
      );

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });
}