import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, ProductUnit, PurchaseOrder, PurchaseOrderItem } from '../types';
import {
  loadProducts,
  loadPurchaseOrders,
  saveProducts,
  savePurchaseOrders,
} from '../storage/storage';

interface AppContextType {
  products: Product[];
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
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [loadedProducts, loadedOrders] = await Promise.all([
        loadProducts(),
        loadPurchaseOrders(),
      ]);
      setProducts(loadedProducts);
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
      unit,
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

  const savePurchaseOrder = async (orderData: {
    date: string;
    shopName?: string;
    items: PurchaseOrderItem[];
    notes?: string;
  }) => {
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

  return (
    <AppContext.Provider
      value={{
        products,
        purchaseOrders,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        savePurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        clearProducts,
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
