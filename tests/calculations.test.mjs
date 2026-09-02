import test from 'node:test';
import assert from 'node:assert/strict';

// Test calculation helpers
function calculateItemTotal(ratePerKg, quantityKg) {
  if (isNaN(ratePerKg) || isNaN(quantityKg) || ratePerKg <= 0 || quantityKg <= 0) {
    return 0;
  }
  return Math.round(ratePerKg * quantityKg * 100) / 100;
}

function calculateRateFromTotal(totalAmount, quantityKg) {
  if (isNaN(totalAmount) || isNaN(quantityKg) || totalAmount <= 0 || quantityKg <= 0) {
    return 0;
  }
  return Math.round((totalAmount / quantityKg) * 100) / 100;
}

function calculatePriceDiff(currentRate, previousRate, previousDate) {
  if (previousRate === undefined || previousRate === null || previousRate <= 0) {
    return {
      diff: 0,
      percent: 0,
      status: 'new',
    };
  }

  const diff = Math.round((currentRate - previousRate) * 100) / 100;
  const percent = Math.round(((currentRate - previousRate) / previousRate) * 1000) / 10;

  let status = 'same';
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

function formatINR(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0.00';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  let formattedInteger = lastThree;

  if (otherNumbers !== '') {
    formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return `${isNegative ? '-' : ''}₹${formattedInteger}.${decimalPart}`;
}

test('calculateItemTotal calculates rate * qty correctly', () => {
  assert.equal(calculateItemTotal(40, 2.5), 100);
  assert.equal(calculateItemTotal(850, 0.25), 212.5);
  assert.equal(calculateItemTotal(35, 1.25), 43.75);
});

test('calculateRateFromTotal reverses total / qty accurately', () => {
  assert.equal(calculateRateFromTotal(100, 2.5), 40);
  assert.equal(calculateRateFromTotal(212.5, 0.25), 850);
});

test('calculatePriceDiff correctly detects increased rate', () => {
  // Current: 45, Previous: 40
  const result = calculatePriceDiff(45, 40, '2026-08-20');
  assert.equal(result.status, 'increased');
  assert.equal(result.diff, 5);
  assert.equal(result.percent, 12.5);
  assert.equal(result.previousRate, 40);
});

test('calculatePriceDiff correctly detects decreased rate', () => {
  // Current: 36, Previous: 40
  const result = calculatePriceDiff(36, 40, '2026-08-20');
  assert.equal(result.status, 'decreased');
  assert.equal(result.diff, -4);
  assert.equal(result.percent, -10);
});

test('calculatePriceDiff handles identical prices', () => {
  const result = calculatePriceDiff(40, 40, '2026-08-20');
  assert.equal(result.status, 'same');
  assert.equal(result.diff, 0);
  assert.equal(result.percent, 0);
});

test('calculatePriceDiff handles new items with no prior history', () => {
  const result = calculatePriceDiff(120, undefined);
  assert.equal(result.status, 'new');
});

test('formatINR formats currency properly with symbol and commas', () => {
  assert.equal(formatINR(1250), '₹1,250.00');
  assert.equal(formatINR(100000), '₹1,00,000.00');
  assert.equal(formatINR(42.5), '₹42.50');
  assert.equal(formatINR(-15.5), '-₹15.50');
});
