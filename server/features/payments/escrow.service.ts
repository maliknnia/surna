// server/features/payments/escrow.service.ts
import { db } from "../../db";
import { escrowHolds, wallets } from "@shared/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import type { EscrowHold, InsertEscrowHold } from "@shared/schema";
import { WalletService } from "./wallet.service";
import { validatePositive, normalizeMoney } from "./money.utils";

export class EscrowService {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  // Hold funds in escrow - Package #11: Transaction-safe
  async holdFunds(data: {
    walletId: string;
    amount: string;
    purpose: string;
    relatedEntityType: string;
    relatedEntityId: string;
    releaseCondition?: string;
    releaseToWalletId?: string;
    expiresAt?: Date;
    notes?: string;
  }): Promise<{ escrow: EscrowHold; transaction: any }> {
    // Package #11: Validate positive amount and normalize
    const money = validatePositive(data.amount, "Escrow amount");

    // Check sufficient funds (includes wallet status check)
    const hasFunds = await this.walletService.hasSufficientFunds(data.walletId, money.decimal);
    
    if (!hasFunds) {
      throw new Error("Insufficient funds for escrow or wallet not active");
    }

    // Package #11: Wrap in transaction for atomicity
    return await db.transaction(async (tx) => {
      // Package #11: Pass tx to recordTransaction to avoid nested transactions
      const transaction = await this.walletService.recordTransaction({
        walletId: data.walletId,
        type: 'escrow_hold',
        amount: (-money.cents / 100).toFixed(2), // Negative for hold, normalized
        description: `Escrow hold: ${data.purpose}`,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      }, tx); // Pass transaction context

      // Create escrow hold record (use normalized decimal)
      const [escrow] = await tx
        .insert(escrowHolds)
        .values({
          walletId: data.walletId,
          amount: money.decimal, // Normalized amount
          currency: "USD",
          status: "held",
          purpose: data.purpose,
          relatedEntityType: data.relatedEntityType,
          relatedEntityId: data.relatedEntityId,
          releaseCondition: data.releaseCondition,
          releaseToWalletId: data.releaseToWalletId,
          expiresAt: data.expiresAt,
          relatedTransactionId: transaction.id,
          notes: data.notes,
        })
        .returning();

      return { escrow, transaction };
    });
  }

  // Release escrowed funds to recipient - Package #11: Transaction-safe
  async releaseFunds(escrowId: string): Promise<{ escrow: EscrowHold; transaction: any }> {
    // Package #11: Wrap entire operation in transaction
    return await db.transaction(async (tx) => {
      const [escrow] = await tx
        .select()
        .from(escrowHolds)
        .where(eq(escrowHolds.id, escrowId))
        .for('update'); // Lock escrow record

      if (!escrow) {
        throw new Error("Escrow hold not found");
      }

      if (escrow.status !== "held") {
        throw new Error(`Escrow already ${escrow.status}`);
      }

      if (!escrow.releaseToWalletId) {
        throw new Error("No release wallet specified");
      }

      // Add funds to recipient wallet (pass tx for atomicity)
      const transaction = await this.walletService.recordTransaction({
        walletId: escrow.releaseToWalletId,
        type: 'escrow_release',
        amount: escrow.amount,
        description: `Escrow release: ${escrow.purpose}`,
        relatedEntityType: escrow.relatedEntityType,
        relatedEntityId: escrow.relatedEntityId,
      }, tx); // Pass transaction context

      // Update escrow status
      const [updated] = await tx
        .update(escrowHolds)
        .set({ 
          status: "released",
          releasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(escrowHolds.id, escrowId))
        .returning();

      return { escrow: updated, transaction };
    });
  }

  // Refund escrowed funds to original wallet - Package #11: Transaction-safe
  async refundFunds(escrowId: string): Promise<{ escrow: EscrowHold; transaction: any }> {
    // Package #11: Wrap entire operation in transaction
    return await db.transaction(async (tx) => {
      const [escrow] = await tx
        .select()
        .from(escrowHolds)
        .where(eq(escrowHolds.id, escrowId))
        .for('update'); // Lock escrow record

      if (!escrow) {
        throw new Error("Escrow hold not found");
      }

      if (escrow.status !== "held") {
        throw new Error(`Escrow already ${escrow.status}`);
      }

      // Return funds to original wallet (pass tx for atomicity)
      const transaction = await this.walletService.recordTransaction({
        walletId: escrow.walletId,
        type: 'refund',
        amount: escrow.amount,
        description: `Escrow refund: ${escrow.purpose}`,
        relatedEntityType: escrow.relatedEntityType,
        relatedEntityId: escrow.relatedEntityId,
      }, tx); // Pass transaction context

      // Update escrow status
      const [updated] = await tx
        .update(escrowHolds)
        .set({ 
          status: "refunded",
          releasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(escrowHolds.id, escrowId))
        .returning();

      return { escrow: updated, transaction };
    });
  }

  // Get escrow hold by ID
  async getEscrowHold(escrowId: string): Promise<EscrowHold | undefined> {
    const [escrow] = await db
      .select()
      .from(escrowHolds)
      .where(eq(escrowHolds.id, escrowId));

    return escrow;
  }

  // Get escrow holds for an entity (challenge, event, etc.)
  async getEscrowHoldsForEntity(
    entityType: string,
    entityId: string
  ): Promise<EscrowHold[]> {
    return db
      .select()
      .from(escrowHolds)
      .where(
        and(
          eq(escrowHolds.relatedEntityType, entityType),
          eq(escrowHolds.relatedEntityId, entityId)
        )
      )
      .orderBy(desc(escrowHolds.createdAt));
  }

  // Get wallet's escrow holds
  async getWalletEscrowHolds(walletId: string): Promise<EscrowHold[]> {
    return db
      .select()
      .from(escrowHolds)
      .where(eq(escrowHolds.walletId, walletId))
      .orderBy(desc(escrowHolds.createdAt));
  }

  // Auto-expire stale escrow holds
  async expireStaleHolds(): Promise<number> {
    const now = new Date();
    
    // Find expired holds
    const expiredHolds = await db
      .select()
      .from(escrowHolds)
      .where(
        and(
          eq(escrowHolds.status, "held"),
          lte(escrowHolds.expiresAt, now)
        )
      );

    // Refund each expired hold
    for (const hold of expiredHolds) {
      await this.refundFunds(hold.id);
    }

    return expiredHolds.length;
  }

  // Calculate total held amount for a wallet
  async getTotalHeldAmount(walletId: string): Promise<string> {
    const holds = await db
      .select()
      .from(escrowHolds)
      .where(
        and(
          eq(escrowHolds.walletId, walletId),
          eq(escrowHolds.status, "held")
        )
      );

    const total = holds.reduce((sum, hold) => sum + parseFloat(hold.amount), 0);
    return total.toFixed(2);
  }

  // Get available balance (wallet balance minus held funds)
  async getAvailableBalance(walletId: string): Promise<string> {
    const wallet = await this.walletService.getWalletById(walletId);
    
    if (!wallet) {
      return "0.00";
    }

    const heldAmount = await this.getTotalHeldAmount(walletId);
    const available = parseFloat(wallet.balance) - parseFloat(heldAmount);
    
    return Math.max(0, available).toFixed(2);
  }
}
