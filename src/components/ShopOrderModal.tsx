import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Product, PurchaseOrder, PurchaseOrderItem } from '../types';
import { formatDate, formatQuantityWithUnit, formatWeight, getTodayDateString } from '../utils/formatters';
import { ProductSearchModal } from './ProductSearchModal';
import { DatePickerModal } from './DatePickerModal';

interface ShopOrderModalProps {
  visible: boolean;
  onClose: () => void;
  orderToEdit?: PurchaseOrder | null;
}

export const ShopOrderModal: React.FC<ShopOrderModalProps> = ({
  visible,
  onClose,
  orderToEdit,
}) => {
  const { purchaseOrders, savePurchaseOrder, updatePurchaseOrder } = useApp();

  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [shopName, setShopName] = useState('');
  const [orderDate, setOrderDate] = useState(getTodayDateString());

  // Modals state
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [historyPickerVisible, setHistoryPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Active saved order reference
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (orderToEdit) {
        // Edit existing order
        setActiveOrderId(orderToEdit.id);
        setShopName(orderToEdit.shopName || '');
        setOrderDate(orderToEdit.date);
        setOrderItems([...orderToEdit.items]);
      } else {
        // New order
        setActiveOrderId(null);
        setShopName('');
        setOrderDate(getTodayDateString());
        setOrderItems([]);
      }
      setSelectedProduct(null);
      setQuantityInput('1');
    }
  }, [visible, orderToEdit]);

  const numQty = parseFloat(quantityInput) || 0;

  const handleAddItem = () => {
    if (!selectedProduct) {
      Alert.alert('Select Product', 'Please select a product to add to the order.');
      return;
    }
    if (numQty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }

    // If product already in order, increase quantity instead of duplicate
    const existingIndex = orderItems.findIndex(
      (it) => it.productId === selectedProduct.id || it.productName.toLowerCase() === selectedProduct.name.toLowerCase()
    );

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantityKg = Math.round((updated[existingIndex].quantityKg + numQty) * 1000) / 1000;
      setOrderItems(updated);
    } else {
      const newItem: PurchaseOrderItem = {
        id: 'po_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantityKg: numQty,
        unit: selectedProduct.unit || 'kg',
      };
      setOrderItems((prev) => [...prev, newItem]);
    }

    setSelectedProduct(null);
    setQuantityInput('1');
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...orderItems];
    updated[index].quantityKg = Math.round(newQty * 1000) / 1000;
    setOrderItems(updated);
  };

  // Populate from a previous purchase order
  const handleLoadFromPrevious = (prevOrder: PurchaseOrder) => {
    setShopName(prevOrder.shopName || '');
    // Clone items with new IDs
    const clonedItems: PurchaseOrderItem[] = prevOrder.items.map((it) => ({
      id: 'po_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      productId: it.productId,
      productName: it.productName,
      quantityKg: it.quantityKg,
      unit: it.unit || 'kg',
    }));
    setOrderItems(clonedItems);
    setHistoryPickerVisible(false);
    Alert.alert(
      'Order Loaded!',
      `Loaded ${clonedItems.length} items from previous order (${formatDate(prevOrder.date)}). You can now adjust quantities.`
    );
  };

  const totalWeight = orderItems.reduce((acc, item) => acc + item.quantityKg, 0);

  const generateWhatsAppMessage = () => {
    let msg = `🛒 *PURCHASE ORDER*\n`;
    if (shopName.trim()) {
      msg += `🏪 *To:* *${shopName.trim()}*\n`;
    }
    msg += `📌 *Date:* *${formatDate(orderDate)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *ORDERED ITEMS LIST:*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;

    orderItems.forEach((item, index) => {
      msg += `🔹 *${index + 1}. ${item.productName.toUpperCase()}*  ➤  *${formatQuantityWithUnit(item.quantityKg, item.unit)}*\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *Total Items:* *${orderItems.length}*\n\n`;
    msg += `_Please prepare and confirm availability. Thank you!_`;

    return msg;
  };

  const handleSaveOrderOnly = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one product to save.');
      return;
    }

    try {
      if (activeOrderId) {
        await updatePurchaseOrder(activeOrderId, {
          date: orderDate,
          shopName: shopName.trim(),
          items: orderItems,
        });
        Alert.alert('Success', 'Purchase order updated successfully!');
      } else {
        const saved = await savePurchaseOrder({
          date: orderDate,
          shopName: shopName.trim(),
          items: orderItems,
        });
        setActiveOrderId(saved.id);
        Alert.alert('Success', `Purchase order saved (${saved.orderNumber})!`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save purchase order.');
    }
  };

  const handleShareWhatsApp = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one product before sharing.');
      return;
    }

    // Auto save if not yet saved or if modified
    try {
      if (activeOrderId) {
        await updatePurchaseOrder(activeOrderId, {
          date: orderDate,
          shopName: shopName.trim(),
          items: orderItems,
        });
      } else {
        const saved = await savePurchaseOrder({
          date: orderDate,
          shopName: shopName.trim(),
          items: orderItems,
        });
        setActiveOrderId(saved.id);
      }
    } catch {
      // Continue to share even if saving had minor issue
    }

    const message = generateWhatsAppMessage();
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          message,
          title: 'Purchase Order Details',
        });
      }
    } catch (err) {
      await Share.share({
        message,
        title: 'Purchase Order Details',
      });
    }
  };

  const applyPresetQty = (kg: number) => {
    setQuantityInput(kg.toString());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.titleRow}>
                <Ionicons name="cart" size={22} color="#16a34a" />
                <Text style={styles.title}>
                  {orderToEdit ? 'Edit Purchase Order' : 'Create Order for Shop'}
                </Text>
              </View>
              <Text style={styles.subtitle}>
                {orderToEdit
                  ? `Editing ${orderToEdit.orderNumber}`
                  : 'Add items & quantities to send to vendor'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Previous Order Template Dropdown Selector */}
          {!orderToEdit && purchaseOrders.length > 0 && (
            <TouchableOpacity
              style={styles.loadPreviousBtn}
              onPress={() => setHistoryPickerVisible(true)}
            >
              <Ionicons name="time-outline" size={18} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={styles.loadPreviousTitle}>
                  Select Previous Purchase History
                </Text>
                <Text style={styles.loadPreviousSubtitle}>
                  Autofill previous order & just update units
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#2563eb" />
            </TouchableOpacity>
          )}

          {/* Date & Shop / Vendor Row */}
          <View style={styles.metaRow}>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setDatePickerVisible(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#2563eb" />
              <Text style={styles.datePickerText}>{formatDate(orderDate)}</Text>
            </TouchableOpacity>

            <View style={styles.shopInputWrapper}>
              <Ionicons name="storefront-outline" size={16} color="#64748b" />
              <TextInput
                style={styles.shopTextInput}
                placeholder="Shop / Vendor Name..."
                placeholderTextColor="#94a3b8"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>
          </View>

          {/* Input Box: Product + Quantity ONLY (No Price) */}
          <View style={styles.inputCard}>
            <TouchableOpacity
              style={styles.productPickerBtn}
              onPress={() => setProductPickerVisible(true)}
            >
              <Ionicons name="basket-outline" size={20} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerLabel}>Product</Text>
                <Text style={styles.pickerValue}>
                  {selectedProduct ? selectedProduct.name : 'Select or Add Product...'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.qtyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Quantity (kg)</Text>
                <View style={styles.qtyInputWrapper}>
                  <TextInput
                    style={styles.qtyInput}
                    placeholder="1.0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={quantityInput}
                    onChangeText={setQuantityInput}
                  />
                  <Text style={styles.qtySuffix}>{selectedProduct?.unit || 'kg'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.addBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Preset Chips based on unit */}
            <View style={styles.presetsRow}>
              <Text style={styles.presetsLabel}>Quick:</Text>
              {(selectedProduct?.unit === 'Bag'
                ? [
                    { label: '1 Bag', val: 1 },
                    { label: '2 Bags', val: 2 },
                    { label: '5 Bags', val: 5 },
                    { label: '10 Bags', val: 10 },
                    { label: '20 Bags', val: 20 },
                  ]
                : selectedProduct?.unit === 'Tin'
                ? [
                    { label: '1 Tin', val: 1 },
                    { label: '2 Tins', val: 2 },
                    { label: '3 Tins', val: 3 },
                    { label: '5 Tins', val: 5 },
                    { label: '10 Tins', val: 10 },
                  ]
                : [
                    { label: '250g', val: 0.25 },
                    { label: '500g', val: 0.5 },
                    { label: '1 kg', val: 1 },
                    { label: '2 kg', val: 2 },
                    { label: '5 kg', val: 5 },
                  ]
              ).map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.presetChip}
                  onPress={() => applyPresetQty(preset.val)}
                >
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* List of items added */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              Order Items ({orderItems.length})
            </Text>
            {orderItems.length > 0 && (
              <TouchableOpacity onPress={() => setOrderItems([])}>
                <Text style={styles.clearListText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={orderItems}
            keyExtractor={(item, idx) => item.id || idx.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View style={styles.orderItemCard}>
                <View style={styles.itemIndexCircle}>
                  <Text style={styles.itemIndexText}>{index + 1}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemProdName}>{item.productName}</Text>
                  <Text style={styles.itemProdQty}>
                    Quantity: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{formatQuantityWithUnit(item.quantityKg, item.unit)}</Text>
                  </Text>
                </View>

                {/* Quick Unit Adjusters: - / + */}
                <View style={styles.qtyStepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => updateItemQty(index, item.quantityKg - (item.quantityKg > 1 ? 1 : 0.25))}
                  >
                    <Ionicons name="remove" size={14} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => updateItemQty(index, item.quantityKg + (item.quantityKg >= 1 ? 1 : 0.25))}
                  >
                    <Ionicons name="add" size={14} color="#475569" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.removeItemBtn}
                  onPress={() => handleRemoveItem(index)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyOrderBox}>
                <Ionicons name="receipt-outline" size={42} color="#cbd5e1" />
                <Text style={styles.emptyOrderTitle}>No items in order</Text>
                <Text style={styles.emptyOrderSubtitle}>
                  Select product and quantity above, or load from previous history
                </Text>
              </View>
            }
          />

          {/* Bottom Bar: Save & WhatsApp Share Actions */}
          <View style={styles.footer}>
            <View style={styles.footerSummary}>
              <Text style={styles.footerCount}>{orderItems.length} items</Text>
              <Text style={styles.footerWeight}>Total: {formatWeight(totalWeight)}</Text>
            </View>

            <View style={styles.footerActions}>
              {/* Save Order Button */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  orderItems.length === 0 && styles.btnDisabled,
                ]}
                onPress={handleSaveOrderOnly}
                disabled={orderItems.length === 0}
              >
                <Ionicons name="save-outline" size={18} color="#2563eb" />
                <Text style={styles.saveBtnText}>
                  {activeOrderId ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>

              {/* Share via WhatsApp Button */}
              <TouchableOpacity
                style={[
                  styles.whatsappBtn,
                  orderItems.length === 0 && styles.whatsappBtnDisabled,
                ]}
                onPress={handleShareWhatsApp}
                disabled={orderItems.length === 0}
              >
                <Ionicons name="logo-whatsapp" size={19} color="#ffffff" />
                <Text style={styles.whatsappBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Product Search & Quick-Add Modal */}
          <ProductSearchModal
            visible={productPickerVisible}
            onClose={() => setProductPickerVisible(false)}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={datePickerVisible}
            currentDate={orderDate}
            onClose={() => setDatePickerVisible(false)}
            onSelectDate={(newDate) => setOrderDate(newDate)}
          />

          {/* Previous History Dropdown Modal */}
          <Modal
            visible={historyPickerVisible}
            animationType="fade"
            transparent
            onRequestClose={() => setHistoryPickerVisible(false)}
          >
            <View style={styles.historyModalOverlay}>
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>Select Previous Purchase</Text>
                  <TouchableOpacity onPress={() => setHistoryPickerVisible(false)}>
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.historySubtitle}>
                  Choose a past order to autofill items & quickly adjust units
                </Text>

                <FlatList
                  data={purchaseOrders}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.historyItemRow}
                      onPress={() => handleLoadFromPrevious(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.historyOrderNumber}>{item.orderNumber}</Text>
                          <Text style={styles.historyOrderDate}>• {formatDate(item.date)}</Text>
                        </View>
                        {item.shopName ? (
                          <Text style={styles.historyShopName}>🏪 {item.shopName}</Text>
                        ) : null}
                        <Text style={styles.historyItemsSnippet} numberOfLines={1}>
                          {item.items.map((it) => `${it.productName} (${formatWeight(it.quantityKg)})`).join(', ')}
                        </Text>
                      </View>
                      <View style={styles.loadBtnPill}>
                        <Text style={styles.loadBtnPillText}>Autofill</Text>
                        <Ionicons name="arrow-forward" size={14} color="#2563eb" />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  loadPreviousBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 10,
  },
  loadPreviousTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  loadPreviousSubtitle: {
    fontSize: 11,
    color: '#3b82f6',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 6,
  },
  datePickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  shopInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  shopTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  inputCard: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 10,
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  qtyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 44,
  },
  qtyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  qtySuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 6,
  },
  addBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  presetChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearListText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemIndexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  itemProdName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemProdQty: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 2,
    marginRight: 8,
  },
  stepBtn: {
    padding: 6,
  },
  removeItemBtn: {
    padding: 6,
  },
  emptyOrderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyOrderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 8,
  },
  emptyOrderSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 6,
  },
  footerSummary: {
    flex: 1,
  },
  footerCount: {
    fontSize: 12,
    color: '#64748b',
  },
  footerWeight: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  saveBtnText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  whatsappBtn: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  historySubtitle: {
    fontSize: 12,
    color: '#64748b',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  historyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  historyOrderNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  historyOrderDate: {
    fontSize: 12,
    color: '#64748b',
  },
  historyShopName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  historyItemsSnippet: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  loadBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  loadBtnPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
});
