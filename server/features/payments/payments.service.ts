// server/features/payments/payments.service.ts
import { db } from "../../db";
import { paymentIntents } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { PaymentIntent, InsertPaymentIntent } from "@shared/schema";
import { WalletService } from "./wallet.service";

export class PaymentsService {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  // Create a payment intent for adding funds
  async createAddFundsIntent(
    userId: string,
    amount: string,
    currency: string = "USD",
    provider: "stripe" | "paypal" = "stripe"
  ): Promise<PaymentIntent> {
    const [intent] = await db
      .insert(paymentIntents)
      .values({
        userId,
        provider,
        providerIntentId: `pending_${Date.now()}`, // Will be updated when actual intent is created
        amount,
        currency,
        status: "pending",
        purpose: "add_funds",
        targetEntityType: "wallet",
      })
      .returning();

    return intent;
  }

  // Create payment intent for purchase (event, product, booking, etc.)
  async createPurchaseIntent(data: {
    userId: string;
    amount: string;
    currency?: string;
    provider?: "stripe" | "paypal";
    purpose: string;
    targetEntityType: string;
    targetEntityId: string;
  }): Promise<PaymentIntent> {
    const [intent] = await db
      .insert(paymentIntents)
      .values({
        userId: data.userId,
        provider: data.provider || "stripe",
        providerIntentId: `pending_${Date.now()}`,
        amount: data.amount,
        currency: data.currency || "USD",
        status: "pending",
        purpose: data.purpose,
        targetEntityType: data.targetEntityType,
        targetEntityId: data.targetEntityId,
      })
      .returning();

    return intent;
  }

  // Get payment intent by ID
  async getPaymentIntent(intentId: string): Promise<PaymentIntent | undefined> {
    const [intent] = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, intentId));

    return intent;
  }

  // Get payment intent by provider intent ID
  async getPaymentIntentByProvider(
    provider: string,
    providerIntentId: string
  ): Promise<PaymentIntent | undefined> {
    const [intent] = await db
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.provider, provider),
          eq(paymentIntents.providerIntentId, providerIntentId)
        )
      );

    return intent;
  }

  // Update payment intent status
  async updatePaymentIntent(
    intentId: string,
    updates: {
      status?: string;
      providerIntentId?: string;
      clientSecret?: string;
      providerData?: any;
      errorCode?: string;
      errorMessage?: string;
      fulfilledAt?: Date;
    }
  ): Promise<PaymentIntent> {
    const [intent] = await db
      .update(paymentIntents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentIntents.id, intentId))
      .returning();

    return intent;
  }

  // Mark payment intent as succeeded and fulfill it - Package #11: Transaction-safe
  async fulfillPaymentIntent(intentId: string, providerData?: any): Promise<PaymentIntent> {
    const intent = await this.getPaymentIntent(intentId);
    
    if (!intent) {
      throw new Error("Payment intent not found");
    }

    if (intent.status === "succeeded") {
      return intent; // Already fulfilled
    }

    // Package #11: Wrap entire fulfillment in transaction
    return await db.transaction(async (tx) => {
      // Process based on purpose FIRST, then update status if successful
      if (intent.purpose === "add_funds") {
        // Get or create wallet for user
        const wallet = await this.walletService.getOrCreateWallet("user", intent.userId);
        
        // Package #11: Pass tx to deposit so wallet credit and status update are atomic
        await this.walletService.deposit(
          wallet.id,
          intent.amount,
          "Funds added via payment",
          intent.id,
          tx // Pass transaction context
        );
      }

      // Only mark succeeded after successful fulfillment
      const [updated] = await tx
        .update(paymentIntents)
        .set({
          status: "succeeded",
          fulfilledAt: new Date(),
          providerData,
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, intentId))
        .returning();

      return updated;
    });
  }

  // Mark payment intent as failed
  async failPaymentIntent(
    intentId: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<PaymentIntent> {
    return this.updatePaymentIntent(intentId, {
      status: "failed",
      errorCode,
      errorMessage,
    });
  }

  // Get user's payment history
  async getUserPaymentHistory(userId: string, limit: number = 50): Promise<PaymentIntent[]> {
    return db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.userId, userId))
      .orderBy(desc(paymentIntents.createdAt))
      .limit(limit);
  }

  // Process donation
  async processDonation(data: {
    fromUserId: string;
    toOwnerType: 'user' | 'team' | 'place';
    toOwnerId: string;
    amount: string;
    message?: string;
  }): Promise<{ fromTransaction: any; toTransaction: any; fromWallet: any; toWallet: any }> {
    // Get wallets
    const fromWallet = await this.walletService.getOrCreateWallet("user", data.fromUserId);
    const toWallet = await this.walletService.getOrCreateWallet(data.toOwnerType, data.toOwnerId);

    // Check sufficient funds
    const hasFunds = await this.walletService.hasSufficientFunds(fromWallet.id, data.amount);
    
    if (!hasFunds) {
      throw new Error("Insufficient funds for donation");
    }

    // Transfer funds (transaction type is already set to 'transfer' in wallet service)
    const { fromTransaction, toTransaction } = await this.walletService.transfer(
      fromWallet.id,
      toWallet.id,
      data.amount,
      data.message || "Donation",
      { type: "donation" }
    );

    return {
      fromTransaction,
      toTransaction,
      fromWallet,
      toWallet,
    };
  }

  // Process sponsorship
  async processSponsorship(data: {
    fromUserId: string;
    toOwnerType: 'team' | 'place';
    toOwnerId: string;
    amount: string;
    tier?: string;
    message?: string;
  }): Promise<{ fromTransaction: any; toTransaction: any; fromWallet: any; toWallet: any }> {
    // Get wallets
    const fromWallet = await this.walletService.getOrCreateWallet("user", data.fromUserId);
    const toWallet = await this.walletService.getOrCreateWallet(data.toOwnerType, data.toOwnerId);

    // Check sufficient funds
    const hasFunds = await this.walletService.hasSufficientFunds(fromWallet.id, data.amount);
    
    if (!hasFunds) {
      throw new Error("Insufficient funds for sponsorship");
    }

    // Transfer funds
    const { fromTransaction, toTransaction } = await this.walletService.transfer(
      fromWallet.id,
      toWallet.id,
      data.amount,
      data.message || `Sponsorship - ${data.tier || 'Basic'}`,
      { type: "sponsorship", tier: data.tier }
    );

    return {
      fromTransaction,
      toTransaction,
      fromWallet,
      toWallet,
    };
  }
}
