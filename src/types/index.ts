export type ProductUnit = 'kg' | 'Bag' | 'Tin' | string;

export interface Product {
  id: string;
  name: string;
  category?: string;
  defaultRatePerKg?: number;
  unit: ProductUnit;
  lastUpdated: string;
}

export interface BillItem {
  id: string;
  productId: string;
  productName: string;
  ratePerKg: number;
  quantityKg: number;
  totalAmount: number;
  unit?: ProductUnit;
  previousRatePerKg?: number;
  priceDiffPerKg?: number;
  priceDiffPercent?: number;
  previousBillDate?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string; // DD-MM-YYYY
  items: BillItem[];
  grandTotal: number;
  totalWeightKg: number;
  createdAt: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantityKg: number;
  unit?: ProductUnit;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  date: string; // DD-MM-YYYY
  shopName?: string;
  items: PurchaseOrderItem[];
  totalWeightKg: number;
  createdAt: string;
  notes?: string;
}

export type PriceDiffStatus = 'increased' | 'decreased' | 'same' | 'new';

export interface PriceDiffResult {
  diff: number;
  percent: number;
  status: PriceDiffStatus;
  previousRate?: number;
  previousDate?: string;
}
