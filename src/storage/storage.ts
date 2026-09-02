import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bill, Product, PurchaseOrder } from '../types';
import { toSortableDate } from '../utils/formatters';

const PRODUCTS_KEY = '@quickbill_products';
const BILLS_KEY = '@quickbill_bills';
const PURCHASE_ORDERS_KEY = '@quickbill_purchase_orders';

/**
 * Load products from local storage (starts empty)
 */
export async function loadProducts(): Promise<Product[]> {
  try {
    const json = await AsyncStorage.getItem(PRODUCTS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        // Filter out old sample products if any exist from initial seed
        const cleaned = parsed.filter(
          (p) => !p.id.startsWith('p_') || !['Tomato (टमाटर)', 'Potato (आलू)', 'Onion (प्याज)'].includes(p.name)
        );
        if (cleaned.length !== parsed.length) {
          await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
    return [];
  } catch (err) {
    console.error('Error loading products from storage:', err);
    return [];
  }
}

/**
 * Save products list to local storage
 */
export async function saveProducts(products: Product[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Error saving products to storage:', err);
  }
}

/**
 * Clear all products from local storage
 */
export async function clearAllProducts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PRODUCTS_KEY);
  } catch (err) {
    console.error('Error clearing products:', err);
  }
}

/**
 * Load bills from local storage
 */
export async function loadBills(): Promise<Bill[]> {
  try {
    const json = await AsyncStorage.getItem(BILLS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => {
          const sDateA = toSortableDate(a.date);
          const sDateB = toSortableDate(b.date);
          if (sDateA !== sDateB) {
            return sDateB.localeCompare(sDateA);
          }
          return b.createdAt.localeCompare(a.createdAt);
        });
      }
    }
    return [];
  } catch (err) {
    console.error('Error loading bills from storage:', err);
    return [];
  }
}

/**
 * Save bills to local storage
 */
export async function saveBills(bills: Bill[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BILLS_KEY, JSON.stringify(bills));
  } catch (err) {
    console.error('Error saving bills to storage:', err);
  }
}

/**
 * Load purchase orders from local storage
 */
export async function loadPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const json = await AsyncStorage.getItem(PURCHASE_ORDERS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => {
          const sDateA = toSortableDate(a.date);
          const sDateB = toSortableDate(b.date);
          if (sDateA !== sDateB) {
            return sDateB.localeCompare(sDateA);
          }
          return b.createdAt.localeCompare(a.createdAt);
        });
      }
    }
    return [];
  } catch (err) {
    console.error('Error loading purchase orders from storage:', err);
    return [];
  }
}

/**
 * Save purchase orders to local storage
 */
export async function savePurchaseOrders(orders: PurchaseOrder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Error saving purchase orders to storage:', err);
  }
}

/**
 * Look up the most recent previous rate for a product from historical bills
 */
export function findPreviousProductRate(
  bills: Bill[],
  productId?: string,
  productName?: string,
  beforeDate?: string,
  excludeBillId?: string
): { previousRate: number; previousDate: string } | null {
  if (!bills || bills.length === 0) return null;

  const normalizedName = productName ? productName.trim().toLowerCase() : '';
  const sortableBeforeDate = beforeDate ? toSortableDate(beforeDate) : undefined;

  const sortedBills = [...bills].sort((a, b) => {
    const sDateA = toSortableDate(a.date);
    const sDateB = toSortableDate(b.date);
    if (sDateA !== sDateB) {
      return sDateB.localeCompare(sDateA);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  for (const bill of sortedBills) {
    if (excludeBillId && bill.id === excludeBillId) {
      continue;
    }

    if (sortableBeforeDate && toSortableDate(bill.date) > sortableBeforeDate) {
      continue;
    }

    const item = bill.items.find(
      (it) =>
        (productId && it.productId === productId) ||
        (normalizedName && it.productName.trim().toLowerCase() === normalizedName)
    );

    if (item && item.ratePerKg > 0) {
      return {
        previousRate: item.ratePerKg,
        previousDate: bill.date,
      };
    }
  }

  return null;
}
