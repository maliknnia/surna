// server/features/payments/wallet.service.ts
import { db } from "../../db";
import { wallets, transactions } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Wallet, Transaction, InsertWallet, InsertTransaction } from "@shared/schema";
import { normalizeMoney, validatePositive } from "./money.utils";

export class WalletService {
  // Get or create wallet for an entity (user/team/place)
  async getOrCreateWallet(ownerType: 'user' | 'team' | 'place', ownerId: string): Promise<Wallet> {
    // Check if wallet exists
    const [existing] = await db
      .select()
      .from(wallets)
      .where(and(
        eq(wallets.ownerType, ownerType),
        eq(wallets.ownerId, ownerId)
      ));

    if (existing) {
      return existing;
    }

    // Create new wallet with zero balance
    const [wallet] = await db
      .insert(wallets)
      .values({
        ownerType,
        ownerId,
        balance: "0.00",
        currency: "USD",
        status: "active",
      })
      .returning();

    return wallet;
  }

  // Get wallet by ID
  async getWalletById(walletId: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId));

    return wallet;
  }

  // Get wallet by owner
  async getWalletByOwner(ownerType: string, ownerId: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(
        eq(wallets.ownerType, ownerType),
        eq(wallets.ownerId, ownerId)
      ));

    return wallet;
  }

  // Get wallet balance
  async getBalance(walletId: string): Promise<{ balance: string; currency: string }> {
    const wallet = await this.getWalletById(walletId);
    
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return {
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }

  // Record a transaction (internal ledger entry) - Package #11: Transaction-safe
  // Package #11: Accept optional tx for nested transaction support
  async recordTransaction(
    data: {
      walletId: string;
      type: string;
      amount: string;
      description?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
      counterpartyWalletId?: string;
      paymentIntentId?: string;
      metadata?: any;
    },
    providedTx?: any
  ): Promise<Transaction> {
    // Package #11: Normalize amount to canonical format
    const normalizedAmount = normalizeMoney(data.amount);

    // Package #11: Use provided transaction or create new one
    const executeInTransaction = async (tx: any) => {
      // Get wallet with FOR UPDATE lock to prevent concurrent modifications
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.id, data.walletId))
        .for('update');
      
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // Package #11: Check wallet status (frozen/closed wallets cannot transact)
      if (wallet.status !== 'active') {
        throw new Error(`Wallet is ${wallet.status}, cannot process transactions`);
      }

      // Package #11: Use normalized money for precise calculations
      const balanceBefore = normalizeMoney(wallet.balance);
      const balanceAfterCents = balanceBefore.cents + normalizedAmount.cents;

      // Package #11: CRITICAL - Prevent overdrafts (negative balances)
      if (balanceAfterCents < 0) {
        throw new Error("Insufficient funds - transaction would result in negative balance");
      }

      // Convert to decimal string
      const balanceAfter = (balanceAfterCents / 100).toFixed(2);

      // Create transaction record (use normalized decimal)
      const [transaction] = await tx
        .insert(transactions)
        .values({
          walletId: data.walletId,
          type: data.type,
          amount: normalizedAmount.decimal, // Use normalized amount
          currency: wallet.currency,
          status: 'completed',
          balanceBefore: wallet.balance,
          balanceAfter: balanceAfter,
          description: data.description,
          relatedEntityType: data.relatedEntityType,
          relatedEntityId: data.relatedEntityId,
          counterpartyWalletId: data.counterpartyWalletId,
          paymentIntentId: data.paymentIntentId,
          metadata: data.metadata,
        })
        .returning();

      // Update wallet balance
      await tx
        .update(wallets)
        .set({ 
          balance: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, data.walletId));

      return transaction;
    };

    // If transaction provided, use it; otherwise create new transaction
    if (providedTx) {
      return executeInTransaction(providedTx);
    } else {
      return await db.transaction(executeInTransaction);
    }
  }

  // Add funds to wallet (deposit) - Package #11: Optional tx support
  async deposit(
    walletId: string, 
    amount: string, 
    description?: string, 
    paymentIntentId?: string,
    providedTx?: any
  ): Promise<Transaction> {
    // Package #11: Validate positive amount and normalize
    const money = validatePositive(amount, "Deposit amount");

    return this.recordTransaction({
      walletId,
      type: 'deposit',
      amount: money.decimal, // Use normalized decimal
      description: description || 'Funds added to wallet',
      paymentIntentId,
    }, providedTx); // Pass transaction context
  }

  // Withdraw funds from wallet - Package #11: Optional tx support
  async withdraw(
    walletId: string, 
    amount: string, 
    description?: string,
    providedTx?: any
  ): Promise<Transaction> {
    // Package #11: Validate positive amount and normalize
    const money = validatePositive(amount, "Withdrawal amount");

    // Check sufficient funds before transaction (additional safety check)
    const wallet = await this.getWalletById(walletId);
    
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const currentBalance = normalizeMoney(wallet.balance);
    if (currentBalance.cents < money.cents) {
      throw new Error("Insufficient funds");
    }

    return this.recordTransaction({
      walletId,
      type: 'withdrawal',
      amount: (-money.cents / 100).toFixed(2), // Negative for withdrawal, normalized
      description: description || 'Withdrawal from wallet',
    }, providedTx); // Pass transaction context
  }

  // Transfer funds between wallets
  async transfer(
    fromWalletId: string,
    toWalletId: string,
    amount: string,
    description?: string,
    metadata?: any
  ): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    // Package #11: Validate positive amount and normalize
    const money = validatePositive(amount, "Transfer amount");

    // Package #11: Atomic transfer (both debits/credits in one transaction)
    return await db.transaction(async (tx) => {
      // Package #11: Lock wallets in consistent order (by ID) to prevent deadlocks
      const walletIds = [fromWalletId, toWalletId].sort();
      const walletsMap = new Map();

      for (const id of walletIds) {
        const [wallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.id, id))
          .for('update');
        walletsMap.set(id, wallet);
      }

      const fromWallet = walletsMap.get(fromWalletId);
      const toWallet = walletsMap.get(toWalletId);

      if (!fromWallet || !toWallet) {
        throw new Error("One or both wallets not found");
      }

      // Package #11: Check both wallets are active
      if (fromWallet.status !== 'active') {
        throw new Error(`Source wallet is ${fromWallet.status}`);
      }
      if (toWallet.status !== 'active') {
        throw new Error(`Destination wallet is ${toWallet.status}`);
      }

      // Check sufficient funds using normalized money
      const currentBalance = normalizeMoney(fromWallet.balance);
      if (currentBalance.cents < money.cents) {
        throw new Error("Insufficient funds for transfer");
      }

      // Package #11: Pass tx to recordTransaction to avoid nested transactions
      const fromTransaction = await this.recordTransaction({
        walletId: fromWalletId,
        type: 'transfer',
        amount: (-money.cents / 100).toFixed(2), // Negative, normalized
        description: description || `Transfer to ${toWallet.ownerType}`,
        counterpartyWalletId: toWalletId,
        metadata,
      }, tx); // Pass transaction context

      // Credit to destination
      const toTransaction = await this.recordTransaction({
        walletId: toWalletId,
        type: 'transfer',
        amount: money.decimal, // Normalized decimal
        description: description || `Transfer from ${fromWallet.ownerType}`,
        counterpartyWalletId: fromWalletId,
        metadata,
      }, tx); // Pass transaction context

      return { fromTransaction, toTransaction };
    });
  }

  // Get transaction history for a wallet
  async getTransactionHistory(walletId: string, limit: number = 50): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.walletId, walletId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Freeze wallet (prevent transactions)
  async freezeWallet(walletId: string): Promise<Wallet> {
    const [wallet] = await db
      .update(wallets)
      .set({ status: 'frozen', updatedAt: new Date() })
      .where(eq(wallets.id, walletId))
      .returning();

    return wallet;
  }

  // Unfreeze wallet
  async unfreezeWallet(walletId: string): Promise<Wallet> {
    const [wallet] = await db
      .update(wallets)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(wallets.id, walletId))
      .returning();

    return wallet;
  }

  // Check if wallet has sufficient funds
  async hasSufficientFunds(walletId: string, amount: string): Promise<boolean> {
    const wallet = await this.getWalletById(walletId);
    
    if (!wallet) {
      return false;
    }

    // Package #11: Check wallet is active
    if (wallet.status !== 'active') {
      return false;
    }

    // Package #11: Use integer cents for precise comparison
    const balanceCents = Math.round(parseFloat(wallet.balance) * 100);
    const amountCents = Math.round(parseFloat(amount) * 100);

    return balanceCents >= amountCents;
  }
}
