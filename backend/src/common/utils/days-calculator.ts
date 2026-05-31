import { Decimal } from 'decimal.js';

// RÈGLE FONDAMENTALE : 1 jour validé = dailyAmount intégralement payé.
// La progression OWNERSHIP_PROGRAM = validatedDays / targetDays.
// Jamais une date de fin fixe.

export function calculateValidatedDays(amount: Decimal, dailyAmount: Decimal): number {
  if (dailyAmount.isZero()) return 0;
  return Math.floor(amount.div(dailyAmount).toNumber());
}

export function calculateProgressPercentage(validatedDays: number, targetDays: number): number {
  if (targetDays === 0) return 0;
  return Math.min(100, Math.round((validatedDays / targetDays) * 100 * 100) / 100);
}

export function calculateRemainingDays(validatedDays: number, targetDays: number): number {
  return Math.max(0, targetDays - validatedDays);
}
