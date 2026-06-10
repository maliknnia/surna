// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Payment Service - Stripe integration for subscriptions and marketplace transactions
import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd: Date;
  priceId: string;
  amount: number;
}

export class PaymentService {
  // Create payment intent for one-time payments
  static async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  // Create customer for subscription management
  static async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    try {
      return await stripe.customers.create({
        email,
        name,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  // Create subscription
  static async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>
  ): Promise<Subscription> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: metadata || {},
      });

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId,
        amount: subscription.items.data[0].price.unit_amount! / 100,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  // Get subscription details
  static async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId: subscription.items.data[0].price.id,
        amount: subscription.items.data[0].price.unit_amount! / 100,
      };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return null;
    }
  }

  // Cancel subscription
  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  // Update subscription
  static async updateSubscription(
    subscriptionId: string,
    priceId: string
  ): Promise<Subscription | null> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscriptionId,
          price: priceId,
        }],
        proration_behavior: 'always_invoice',
      });

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId,
        amount: subscription.items.data[0].price.unit_amount! / 100,
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return null;
    }
  }

  // Create checkout session for hosted checkout
  static async createCheckoutSession(
    priceId: string,
    mode: 'payment' | 'subscription' = 'payment',
    successUrl: string,
    cancelUrl: string,
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<{ sessionId: string; url: string }> {
    try {
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata || {},
      };

      if (mode === 'payment') {
        sessionConfig.line_items = [{
          price: priceId,
          quantity: 1,
        }];
      } else {
        sessionConfig.line_items = [{
          price: priceId,
          quantity: 1,
        }];
      }

      if (customerId) {
        sessionConfig.customer = customerId;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  // Handle webhook events
  static async handleWebhook(
    rawBody: string,
    signature: string,
    endpointSecret: string
  ): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
      
      console.log(`Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new Error('Webhook processing failed');
    }
  }

  // Webhook event handlers
  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment succeeded: ${paymentIntent.id}`);

    const metadata = paymentIntent.metadata ?? {};
    if (metadata.source === "marketplace" && metadata.userId) {
      try {
        const { fulfillMarketplacePayment } = await import("../features/marketplace/marketplace.repo");
        const result = await fulfillMarketplacePayment(paymentIntent.id, metadata.userId);
        if (result?.alreadyFulfilled) {
          console.log(`Marketplace order already fulfilled for ${paymentIntent.id}`);
        } else if (result) {
          console.log(`Marketplace order fulfilled: ${result.orderId}`);
        }
      } catch (err) {
        console.error("[Marketplace] Fulfillment failed for payment intent:", paymentIntent.id, err);
        throw err;
      }
    }
  }

  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment failed: ${paymentIntent.id}`);
    // Handle failed payment, notify user, etc.
  }

  private static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const { syncStripeSubscription } = await import("./proSubscriptionSync");
    await syncStripeSubscription(subscription);
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const { syncStripeSubscription } = await import("./proSubscriptionSync");
    await syncStripeSubscription(subscription);
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const { syncStripeSubscription } = await import("./proSubscriptionSync");
    await syncStripeSubscription(subscription);
  }

  private static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { syncCheckoutSessionCompleted } = await import("./proSubscriptionSync");
    await syncCheckoutSessionCompleted(session);
  }

  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
    // Update subscription billing status
  }

  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Invoice payment failed: ${invoice.id}`);
    // Handle failed billing, notify user, retry payment
  }

  // Get available products/prices
  static async getProducts(): Promise<Stripe.Product[]> {
    try {
      const products = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });
      return products.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
  }

  // Get prices for a product
  static async getPrices(productId?: string): Promise<Stripe.Price[]> {
    try {
      const params: Stripe.PriceListParams = {
        active: true,
      };
      
      if (productId) {
        params.product = productId;
      }

      const prices = await stripe.prices.list(params);
      return prices.data;
    } catch (error) {
      console.error('Error fetching prices:', error);
      throw new Error('Failed to fetch prices');
    }
  }
}