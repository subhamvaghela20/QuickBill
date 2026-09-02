import { PriceDiffResult, PriceDiffStatus } from '../types';

/**
 * Calculate line item total: Rate/kg * Quantity(kg)
 */
export function calculateItemTotal(ratePerKg: number, quantityKg: number): number {
  if (isNaN(ratePerKg) || isNaN(quantityKg) || ratePerKg <= 0 || quantityKg <= 0) {
    return 0;
  }
  return Math.round(ratePerKg * quantityKg * 100) / 100;
}

/**
 * Reverse calculate rate/kg: Total / Quantity(kg)
 */
export function calculateRateFromTotal(totalAmount: number, quantityKg: number): number {
  if (isNaN(totalAmount) || isNaN(quantityKg) || totalAmount <= 0 || quantityKg <= 0) {
    return 0;
  }
  return Math.round((totalAmount / quantityKg) * 100) / 100;
}

/**
 * Compare current rate per kg against previous rate per kg
 */
export function calculatePriceDiff(
  currentRate: number,
  previousRate?: number,
  previousDate?: string
): PriceDiffResult {
  if (previousRate === undefined || previousRate === null || previousRate <= 0) {
    return {
      diff: 0,
      percent: 0,
      status: 'new',
    };
  }

  const diff = Math.round((currentRate - previousRate) * 100) / 100;
  const percent = Math.round(((currentRate - previousRate) / previousRate) * 1000) / 10;

  let status: PriceDiffStatus = 'same';
  if (diff > 0.01) {
    status = 'increased';
  } else if (diff < -0.01) {
    status = 'decreased';
  }

  return {
    diff,
    percent,
    status,
    previousRate,
    previousDate,
  };
}
