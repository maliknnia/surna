// server/features/payments/money.utils.ts
// Package #11: Money handling utilities for consistent decimal/cents conversion

export interface Money {
  cents: number;
  decimal: string; // Fixed 2-decimal format (e.g., "12.34")
}

/**
 * Package #11: Normalize any money input to canonical format
 * Converts to integer cents and fixed 2-decimal string
 */
export function normalizeMoney(amount: string | number): Money {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    throw new Error(`Invalid money amount: ${amount}`);
  }
  
  // Convert to cents (round to avoid floating point errors)
  const cents = Math.round(num * 100);
  
  // Convert back to fixed 2-decimal string
  const decimal = (cents / 100).toFixed(2);
  
  return { cents, decimal };
}

/**
 * Package #11: Validate amount is positive
 */
export function validatePositive(amount: string | number, context: string): Money {
  const money = normalizeMoney(amount);
  
  if (money.cents <= 0) {
    throw new Error(`${context} must be positive`);
  }
  
  return money;
}

/**
 * Package #11: Add two money amounts safely
 */
export function addMoney(a: string | number, b: string | number): Money {
  const moneyA = normalizeMoney(a);
  const moneyB = normalizeMoney(b);
  
  const totalCents = moneyA.cents + moneyB.cents;
  const decimal = (totalCents / 100).toFixed(2);
  
  return { cents: totalCents, decimal };
}

/**
 * Package #11: Subtract two money amounts safely
 */
export function subtractMoney(a: string | number, b: string | number): Money {
  const moneyA = normalizeMoney(a);
  const moneyB = normalizeMoney(b);
  
  const resultCents = moneyA.cents - moneyB.cents;
  const decimal = (resultCents / 100).toFixed(2);
  
  return { cents: resultCents, decimal };
}
