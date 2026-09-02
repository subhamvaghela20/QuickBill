import React, { createContext, useContext, useEffect, useState } from 'react';
import { Bill, BillItem, Product, ProductUnit, PurchaseOrder, PurchaseOrderItem } from '../types';
import {
  findPreviousProductRate,
  loadBills,
  loadProducts,
  loadPurchaseOrders,
  saveBills,
  saveProducts,
  savePurchaseOrders,
} from '../storage/storage';

interface AppContextType {
  products: Product[];
  bills: Bill[];
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  addProduct: (
    name: string,
    category?: string,
    defaultRate?: number,
    unit?: ProductUnit
  ) => Promise<Product>;
  updateProduct: (
    id: string,
    updates: { name: string; category?: string; defaultRatePerKg?: number; unit?: ProductUnit }
  ) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  saveNewBill: (billData: { date: string; items: BillItem[]; notes?: string }) => Promise<Bill>;
  deleteBill: (id: string) => Promise<void>;
  savePurchaseOrder: (orderData: {
    date: string;
    shopName?: string;
    items: PurchaseOrderItem[];
    notes?: string;
  }) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (
    id: string,
    orderData: {
      date: string;
      shopName?: string;
      items: PurchaseOrderItem[];
      notes?: string;
    }
  ) => Promise<PurchaseOrder>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  clearProducts: () => Promise<void>;
  activeDraftBillCount: number;
  setActiveDraftBillCount: (count: number) => void;
  getPreviousRate: (
    productId?: string,
    productName?: string,
    beforeDate?: string,
    excludeBillId?: string
  ) => { previousRate: number; previousDate: string } | null;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activeDraftBillCount, setActiveDraftBillCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [loadedProducts, loadedBills, loadedOrders] = await Promise.all([
        loadProducts(),
        loadBills(),
        loadPurchaseOrders(),
      ]);
      setProducts(loadedProducts);
      setBills(loadedBills);
      setPurchaseOrders(loadedOrders);
    } catch (err) {
      console.error('Failed to load data in AppProvider:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addProduct = async (
    name: string,
    category: string = 'General',
    defaultRate?: number,
    unit: ProductUnit = 'kg'
  ): Promise<Product> => {
    const trimmed = name.trim();
    const existing = products.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing;
    }

    const newProduct: Product = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      category,
      defaultRatePerKg: defaultRate,
      unit: unit || 'kg',
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    const updated = [newProduct, ...products];
    setProducts(updated);
    await saveProducts(updated);
    return newProduct;
  };

  const updateProduct = async (
    id: string,
    updates: { name: string; category?: string; defaultRatePerKg?: number; unit?: ProductUnit }
  ): Promise<Product> => {
    let updatedProduct: Product | undefined;
    const updated = products.map((p) => {
      if (p.id === id) {
        updatedProduct = {
          ...p,
          name: updates.name.trim(),
          category: updates.category || p.category,
          defaultRatePerKg: updates.defaultRatePerKg,
          unit: updates.unit || p.unit || 'kg',
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        return updatedProduct;
      }
      return p;
    });

    setProducts(updated);
    await saveProducts(updated);
    return updatedProduct || products.find((p) => p.id === id)!;
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const filtered = products.filter((p) => p.id !== id);
    setProducts(filtered);
    await saveProducts(filtered);
  };

  const saveNewBill = async (billData: {
    date: string;
    items: BillItem[];
    notes?: string;
  }): Promise<Bill> => {
    const grandTotal = billData.items.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalWeightKg = billData.items.reduce((sum, item) => sum + item.quantityKg, 0);

    const billId = 'bill_' + Date.now();
    const billNumber = 'QB-' + Math.floor(1000 + Math.random() * 9000);

    const newBill: Bill = {
      id: billId,
      billNumber,
      date: billData.date,
      items: billData.items,
      grandTotal: Math.round(grandTotal * 100) / 100,
      totalWeightKg: Math.round(totalWeightKg * 1000) / 1000,
      createdAt: new Date().toISOString(),
      notes: billData.notes,
    };

    const updatedBills = [newBill, ...bills];
    setBills(updatedBills);
    await saveBills(updatedBills);

    // Also update any default rate for products that were in this bill
    const updatedProducts = products.map((p) => {
      const match = billData.items.find(
        (it) => it.productId === p.id || it.productName.toLowerCase() === p.name.toLowerCase()
      );
      if (match && match.ratePerKg > 0) {
        return {
          ...p,
          defaultRatePerKg: match.ratePerKg,
          unit: match.unit || p.unit || 'kg',
          lastUpdated: billData.date,
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);

    return newBill;
  };

  const deleteBill = async (id: string) => {
    const filtered = bills.filter((b) => b.id !== id);
    setBills(filtered);
    await saveBills(filtered);
  };

  const savePurchaseOrder = async (orderData: {
    date: string;
    shopName?: string;
    items: PurchaseOrderItem[];
    notes?: string;
  }): Promise<PurchaseOrder> => {
    const totalWeightKg = orderData.items.reduce((sum, item) => sum + item.quantityKg, 0);
    const orderId = 'po_' + Date.now();
    const orderNumber = 'PO-' + Math.floor(1000 + Math.random() * 9000);

    const newOrder: PurchaseOrder = {
      id: orderId,
      orderNumber,
      date: orderData.date,
      shopName: orderData.shopName?.trim(),
      items: orderData.items,
      totalWeightKg: Math.round(totalWeightKg * 1000) / 1000,
      createdAt: new Date().toISOString(),
      notes: orderData.notes,
    };

    const updated = [newOrder, ...purchaseOrders];
    setPurchaseOrders(updated);
    await savePurchaseOrders(updated);
    return newOrder;
  };

  const updatePurchaseOrder = async (
    id: string,
    orderData: {
      date: string;
      shopName?: string;
      items: PurchaseOrderItem[];
      notes?: string;
    }
  ): Promise<PurchaseOrder> => {
    const totalWeightKg = orderData.items.reduce((sum, item) => sum + item.quantityKg, 0);

    let updatedOrder: PurchaseOrder | undefined;
    const updated = purchaseOrders.map((o) => {
      if (o.id === id) {
        updatedOrder = {
          ...o,
          date: orderData.date,
          shopName: orderData.shopName?.trim(),
          items: orderData.items,
          totalWeightKg: Math.round(totalWeightKg * 1000) / 1000,
          notes: orderData.notes,
        };
        return updatedOrder;
      }
      return o;
    });

    setPurchaseOrders(updated);
    await savePurchaseOrders(updated);
    return updatedOrder || purchaseOrders.find((o) => o.id === id)!;
  };

  const deletePurchaseOrder = async (id: string) => {
    const filtered = purchaseOrders.filter((o) => o.id !== id);
    setPurchaseOrders(filtered);
    await savePurchaseOrders(filtered);
  };

  const clearProducts = async () => {
    setProducts([]);
    await saveProducts([]);
  };

  const getPreviousRate = (
    productId?: string,
    productName?: string,
    beforeDate?: string,
    excludeBillId?: string
  ) => {
    return findPreviousProductRate(bills, productId, productName, beforeDate, excludeBillId);
  };

  return (
    <AppContext.Provider
      value={{
        products,
        bills,
        purchaseOrders,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        saveNewBill,
        deleteBill,
        savePurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        clearProducts,
        activeDraftBillCount,
        setActiveDraftBillCount,
        getPreviousRate,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
