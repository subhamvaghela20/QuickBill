/**
 * Format a number into Indian Rupee (₹) format
 * e.g., 1250 -> ₹1,250.00
 */
export function formatINR(amount: number): string {
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

/**
 * Format weight in kg or grams
 * e.g., 1.5 -> "1.5 kg", 0.25 -> "250 g"
 */
export function formatWeight(kg: number): string {
  if (isNaN(kg) || kg <= 0) return '0 kg';
  if (kg < 1) {
    const grams = Math.round(kg * 1000);
    return `${grams} g (${kg.toFixed(3).replace(/\.?0+$/, '')} kg)`;
  }
  return `${parseFloat(kg.toFixed(3))} kg`;
}

/**
 * Format date string strictly in DD-MM-YYYY format
 * e.g., "2026-09-02" -> "02-09-2026", or "02-09-2026" -> "02-09-2026"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      // If already DD-MM-YYYY
      if (parts[0].length === 2 && parts[2].length === 4) {
        return dateString;
      }
      // If YYYY-MM-DD
      if (parts[0].length === 4) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}-${month}-${year}`;
      }
    }
    return dateString;
  } catch {
    return dateString;
  }
}

/**
 * Convert any date string (DD-MM-YYYY or YYYY-MM-DD) to sortable YYYY-MM-DD format
 */
export function toSortableDate(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    // If DD-MM-YYYY
    if (parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateString;
}

/**
 * Get current date as DD-MM-YYYY
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

/**
 * Format quantity with respect to its unit (kg, Bag, Tin)
 * e.g., (2, 'Bag') -> "2 Bags", (1, 'Tin') -> "1 Tin", (1.5, 'kg') -> "1.5 kg"
 */
export function formatQuantityWithUnit(qty: number, unit: string = 'kg'): string {
  if (isNaN(qty) || qty <= 0) return `0 ${unit}`;
  const lower = unit.toLowerCase();
  if (lower === 'bag') {
    return `${qty} ${qty === 1 ? 'Bag' : 'Bags'}`;
  }
  if (lower === 'tin') {
    return `${qty} ${qty === 1 ? 'Tin' : 'Tins'}`;
  }
  return formatWeight(qty);
}

/**
 * Format rate per unit
 * e.g. (1500, 'Bag') -> "₹1,500.00/Bag", (40, 'kg') -> "₹40.00/kg"
 */
export function formatRateWithUnit(rate: number, unit: string = 'kg'): string {
  return `${formatINR(rate)}/${unit || 'kg'}`;
}
