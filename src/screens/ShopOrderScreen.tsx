import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Product, ProductUnit, PurchaseOrder, PurchaseOrderItem } from '../types';
import {
  formatDate,
  formatQuantityWithUnit,
  formatWeight,
  getTodayDateString,
} from '../utils/formatters';
import { ProductSearchModal } from '../components/ProductSearchModal';
import { DatePickerModal } from '../components/DatePickerModal';

export const ShopOrderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { purchaseOrders, savePurchaseOrder } = useApp();

  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeUnit, setActiveUnit] = useState<ProductUnit>('kg');
  const [quantityInput, setQuantityInput] = useState('1');
  const [shopName, setShopName] = useState('');
  const [orderDate, setOrderDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');

  // Modals
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [historyPickerVisible, setHistoryPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const numQty = parseFloat(quantityInput) || 0;

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    const unit = prod.unit || 'kg';
    setActiveUnit(unit);
    // Sensible default quantity based on unit
    if (unit === 'Bag' || unit === 'Tin') {
      setQuantityInput('1');
    } else {
      setQuantityInput('1');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      Alert.alert('Select Item', 'Please select a product to add to your order.');
      return;
    }
    if (numQty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0.');
      return;
    }

    const existingIndex = orderItems.findIndex(
      (it) =>
        it.productId === selectedProduct.id ||
        it.productName.toLowerCase() === selectedProduct.name.toLowerCase()
    );

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantityKg =
        Math.round((updated[existingIndex].quantityKg + numQty) * 1000) / 1000;
      setOrderItems(updated);
    } else {
      const newItem: PurchaseOrderItem = {
        id: 'po_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantityKg: numQty,
        unit: activeUnit,
      };
      setOrderItems((prev) => [...prev, newItem]);
    }

    setSelectedProduct(null);
    setQuantityInput('1');
    Keyboard.dismiss();
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      const newQty = Math.round((updated[index].quantityKg + delta) * 1000) / 1000;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].quantityKg = newQty;
      }
      return updated;
    });
  };

  const handleClearOrder = () => {
    Alert.alert('Clear Order', 'Are you sure you want to remove all items from this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => {
          setOrderItems([]);
          setSelectedProduct(null);
          setQuantityInput('1');
        },
      },
    ]);
  };

  const handleLoadFromPrevious = (prevOrder: PurchaseOrder) => {
    setShopName(prevOrder.shopName || '');
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
      'Order Loaded',
      `Loaded ${clonedItems.length} items from previous order (${formatDate(prevOrder.date)}). You can adjust quantities and add or remove items.`
    );
  };

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
      msg += `🔹 *${index + 1}. ${item.productName.toUpperCase()}*  ➤  *${formatQuantityWithUnit(
        item.quantityKg,
        item.unit
      )}*\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *Total Items:* *${orderItems.length}*\n`;
    if (notes.trim()) {
      msg += `📝 *Notes:* _${notes.trim()}_\n`;
    }
    msg += `\n_Please prepare and confirm availability. Thank you!_`;

    return msg;
  };

  const handleSaveOrderOnly = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one item before saving.');
      return;
    }

    try {
      const saved = await savePurchaseOrder({
        date: orderDate,
        shopName: shopName.trim(),
        items: orderItems,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Order Saved! ✅',
        `Purchase order ${saved.orderNumber} saved successfully. You can view and track it anytime in the History tab.`,
        [
          {
            text: 'Start New Order',
            onPress: () => {
              setOrderItems([]);
              setShopName('');
              setNotes('');
              setSelectedProduct(null);
            },
          },
          { text: 'Keep Current', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to save purchase order.');
    }
  };

  const handleShareWhatsApp = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one item before sending.');
      return;
    }

    // Auto save order to history first
    try {
      await savePurchaseOrder({
        date: orderDate,
        shopName: shopName.trim(),
        items: orderItems,
        notes: notes.trim() || undefined,
      });
    } catch {
      // Continue dispatch even if background save had an issue
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
    } catch {
      await Share.share({
        message,
        title: 'Purchase Order Details',
      });
    }
  };

  const totalWeight = orderItems.reduce((acc, item) => acc + item.quantityKg, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date Selector Banner */}
        <View style={styles.dateBar}>
          <TouchableOpacity
            style={styles.dateInfo}
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={18} color="#0f172a" />
            <Text style={styles.dateLabel}>Date:</Text>
            <Text style={styles.dateValue}>{formatDate(orderDate)}</Text>
          </TouchableOpacity>

          <View style={styles.dateButtons}>
            <TouchableOpacity
              style={[
                styles.dateChip,
                orderDate === getTodayDateString() && styles.dateChipActive,
              ]}
              onPress={() => setOrderDate(getTodayDateString())}
            >
              <Text
                style={[
                  styles.dateChipText,
                  orderDate === getTodayDateString() && styles.dateChipTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customDateBtn}
              onPress={() => setDatePickerVisible(true)}
            >
              <Ionicons name="calendar-outline" size={14} color="#0f172a" />
              <Text style={styles.customDateText}>Pick Date</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vendor / Supplier & Quick Template Row */}
        <View style={styles.vendorCard}>
          <View style={styles.vendorInputRow}>
            <Ionicons name="storefront-outline" size={20} color="#64748b" />
            <TextInput
              style={styles.vendorTextInput}
              placeholder="Shop / Wholesaler Name (Optional)..."
              placeholderTextColor="#94a3b8"
              value={shopName}
              onChangeText={setShopName}
            />
            {shopName.length > 0 && (
              <TouchableOpacity onPress={() => setShopName('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Re-Order from Previous History Button */}
          {purchaseOrders.length > 0 && (
            <TouchableOpacity
              style={styles.loadHistoryBtn}
              onPress={() => setHistoryPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color="#0f172a" />
              <Text style={styles.loadHistoryText}>
                Autofill from Previous Order ({purchaseOrders.length} saved)
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#0f172a" />
            </TouchableOpacity>
          )}
        </View>

        {/* Add Item Entry Card */}
        <View style={styles.entryCard}>
          <Text style={styles.cardHeaderTitle}>Add Items to Order</Text>

          {/* Product Picker Trigger */}
          <TouchableOpacity
            style={styles.productPickerButton}
            onPress={() => setProductPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="basket" size={20} color="#0f172a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerLabel}>Item Name</Text>
              <Text style={styles.pickerValue}>
                {selectedProduct ? selectedProduct.name : 'Tap to Select or Add Item...'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Unit Selector Chips */}
          <View style={styles.unitContainer}>
            <Text style={styles.subFieldLabel}>Measurement Unit</Text>
            <View style={styles.unitChipsRow}>
              {(['kg', 'Bag', 'Tin'] as ProductUnit[]).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitChip,
                    activeUnit === unit && styles.unitChipActive,
                  ]}
                  onPress={() => setActiveUnit(unit)}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      activeUnit === unit && styles.unitChipTextActive,
                    ]}
                  >
                    {unit === 'kg' ? '⚖️ kg' : unit === 'Bag' ? '🎒 Bag (Loth)' : '🛢️ Tin (Oil)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity Input with Stepper */}
          <View style={styles.qtyContainer}>
            <Text style={styles.subFieldLabel}>Quantity ({activeUnit})</Text>
            <View style={styles.qtyInputRow}>
              <TouchableOpacity
                style={styles.qtyStepBtn}
                onPress={() => {
                  const current = parseFloat(quantityInput) || 1;
                  const step = activeUnit === 'kg' && current <= 2 ? 0.5 : 1;
                  setQuantityInput(Math.max(1, current - step).toString());
                }}
              >
                <Ionicons name="remove" size={18} color="#0f172a" />
              </TouchableOpacity>

              <View style={styles.qtyInputBox}>
                <TextInput
                  style={styles.qtyInput}
                  value={quantityInput}
                  onChangeText={setQuantityInput}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Text style={styles.qtyUnitBadge}>{activeUnit}</Text>
              </View>

              <TouchableOpacity
                style={styles.qtyStepBtn}
                onPress={() => {
                  const current = parseFloat(quantityInput) || 0;
                  const step = activeUnit === 'kg' && current < 2 ? 0.5 : 1;
                  setQuantityInput((current + step).toString());
                }}
              >
                <Ionicons name="add" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.presetsRow}>
            {(activeUnit === 'Bag'
              ? [
                  { label: '1 Bag', val: 1 },
                  { label: '2 Bags', val: 2 },
                  { label: '5 Bags', val: 5 },
                  { label: '10 Bags', val: 10 },
                  { label: '20 Bags', val: 20 },
                ]
              : activeUnit === 'Tin'
              ? [
                  { label: '1 Tin', val: 1 },
                  { label: '2 Tins', val: 2 },
                  { label: '3 Tins', val: 3 },
                  { label: '5 Tins', val: 5 },
                  { label: '10 Tins', val: 10 },
                ]
              : [
                  { label: '1 kg', val: 1 },
                  { label: '2 kg', val: 2 },
                  { label: '5 kg', val: 5 },
                  { label: '10 kg', val: 10 },
                  { label: '25 kg', val: 25 },
                ]
            ).map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.presetChip,
                  quantityInput === preset.val.toString() && styles.presetChipActive,
                ]}
                onPress={() => setQuantityInput(preset.val.toString())}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    quantityInput === preset.val.toString() && styles.presetChipTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add to Order Button */}
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={handleAddItem}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color="#ffffff" />
            <Text style={styles.addItemBtnText}>Add Item to Order</Text>
          </TouchableOpacity>
        </View>

        {/* Current Order Items List */}
        <View style={styles.orderListSection}>
          <View style={styles.orderListHeader}>
            <View style={styles.orderCountBadge}>
              <Ionicons name="cart" size={15} color="#0f172a" />
              <Text style={styles.orderCountText}>
                Order Items ({orderItems.length})
              </Text>
            </View>
            {orderItems.length > 0 && (
              <TouchableOpacity onPress={handleClearOrder}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {orderItems.length === 0 ? (
            <View style={styles.emptyOrderCard}>
              <Ionicons name="basket-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyOrderTitle}>No items added yet</Text>
              <Text style={styles.emptyOrderSubtitle}>
                Select an item and quantity above to build your order list.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsContainer}>
              {orderItems.map((item, index) => (
                <View key={item.id} style={styles.orderItemCard}>
                  <View style={styles.itemIndexBadge}>
                    <Text style={styles.itemIndexText}>{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1, paddingHorizontal: 8 }}>
                    <Text style={styles.itemProductName}>{item.productName}</Text>
                    <Text style={styles.itemQuantityText}>
                      {formatQuantityWithUnit(item.quantityKg, item.unit)}
                    </Text>
                  </View>

                  {/* Quantity Stepper buttons */}
                  <View style={styles.inlineStepper}>
                    <TouchableOpacity
                      style={styles.stepperSmallBtn}
                      onPress={() => handleUpdateItemQty(index, -1)}
                    >
                      <Ionicons name="remove" size={14} color="#0f172a" />
                    </TouchableOpacity>

                    <Text style={styles.inlineQtyNum}>{item.quantityKg}</Text>

                    <TouchableOpacity
                      style={styles.stepperSmallBtn}
                      onPress={() => handleUpdateItemQty(index, 1)}
                    >
                      <Ionicons name="add" size={14} color="#0f172a" />
                    </TouchableOpacity>
                  </View>

                  {/* Delete button */}
                  <TouchableOpacity
                    style={styles.itemDeleteBtn}
                    onPress={() => handleRemoveItem(index)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Optional Notes Input */}
        {orderItems.length > 0 && (
          <View style={styles.notesCard}>
            <Ionicons name="document-text-outline" size={18} color="#64748b" />
            <TextInput
              style={styles.notesInput}
              placeholder="Delivery note / instructions (e.g., Deliver before 9 AM)..."
              placeholderTextColor="#94a3b8"
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 6 },
        ]}
      >
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomCountText}>
            {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.bottomWeightText}>
            {orderItems.length > 0 ? `Total: ${formatWeight(totalWeight)}` : 'Empty order'}
          </Text>
        </View>

        <View style={styles.bottomButtonsRow}>
          {/* Save Order to History Only */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              orderItems.length === 0 && styles.btnDisabled,
            ]}
            onPress={handleSaveOrderOnly}
            disabled={orderItems.length === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="save-outline" size={17} color="#0f172a" />
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>

          {/* Share directly on WhatsApp */}
          <TouchableOpacity
            style={[
              styles.whatsAppBtn,
              orderItems.length === 0 && styles.btnDisabled,
            ]}
            onPress={handleShareWhatsApp}
            disabled={orderItems.length === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
            <Text style={styles.whatsAppBtnText}>WhatsApp Order</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Selection Modal */}
      <ProductSearchModal
        visible={productPickerVisible}
        onClose={() => setProductPickerVisible(false)}
        onSelectProduct={handleSelectProduct}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSelectDate={setOrderDate}
        currentDate={orderDate}
      />

      {/* Previous Order Template Modal */}
      <Modal
        visible={historyPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.historyPickerCard}>
            <View style={styles.historyPickerHeader}>
              <View>
                <Text style={styles.historyPickerTitle}>Past Purchase Orders</Text>
                <Text style={styles.historyPickerSubtitle}>
                  Tap any order to autofill into your current order
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setHistoryPickerVisible(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={purchaseOrders}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.historyRowItem}
                  onPress={() => handleLoadFromPrevious(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.historyRowNumber}>{item.orderNumber}</Text>
                      <Text style={styles.historyRowDate}>({formatDate(item.date)})</Text>
                    </View>
                    {item.shopName ? (
                      <Text style={styles.historyRowShop}>🏪 {item.shopName}</Text>
                    ) : null}
                    <Text style={styles.historyRowSnippet} numberOfLines={1}>
                      {item.items
                        .map(
                          (it) => `${it.productName} (${formatQuantityWithUnit(it.quantityKg, it.unit)})`
                        )
                        .join(', ')}
                    </Text>
                  </View>
                  <View style={styles.autofillPill}>
                    <Text style={styles.autofillText}>Load</Text>
                    <Ionicons name="arrow-forward" size={14} color="#0f172a" />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  dateChipActive: {
    backgroundColor: '#0f172a',
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dateChipTextActive: {
    color: '#ffffff',
  },
  customDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  customDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  vendorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    gap: 10,
  },
  vendorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vendorTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  loadHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  loadHistoryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  subFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  unitContainer: {
    marginBottom: 12,
  },
  unitChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  unitChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  unitChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  qtyContainer: {
    marginBottom: 10,
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  qtyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  qtyUnitBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#ffffff',
  },
  addItemBtn: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addItemBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  orderListSection: {
    marginBottom: 14,
  },
  orderListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyOrderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 8,
  },
  emptyOrderSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 2,
  },
  itemsContainer: {
    gap: 8,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  itemProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemQuantityText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  inlineStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 2,
    gap: 6,
    marginRight: 6,
  },
  stepperSmallBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  inlineQtyNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 18,
    textAlign: 'center',
  },
  itemDeleteBtn: {
    padding: 6,
  },
  notesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginBottom: 8,
  },
  notesInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomSummary: {
    justifyContent: 'center',
  },
  bottomCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  bottomWeightText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  historyPickerCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  historyPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyPickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyPickerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  historyRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  historyRowNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyRowDate: {
    fontSize: 12,
    color: '#64748b',
  },
  historyRowShop: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  historyRowSnippet: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  autofillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 4,
  },
  autofillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
});
