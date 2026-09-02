import React, { useState, useMemo, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Bill, BillItem, Product } from '../types';
import {
  formatDate,
  formatINR,
  formatQuantityWithUnit,
  formatRateWithUnit,
  formatWeight,
  getTodayDateString,
} from '../utils/formatters';
import {
  calculateItemTotal,
  calculatePriceDiff,
  calculateRateFromTotal,
} from '../utils/calculations';
import { PriceDiffBadge } from '../components/PriceDiffBadge';
import { ProductSearchModal } from '../components/ProductSearchModal';
import { BillItemCard } from '../components/BillItemCard';
import { ReceiptModal } from '../components/ReceiptModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { BillPhotoModal } from '../components/BillPhotoModal';

export const NewBillScreen: React.FC = () => {
  const { getPreviousRate, saveNewBill, addProduct, setActiveDraftBillCount } = useApp();

  // Date selection state
  const [billDate, setBillDate] = useState<string>(getTodayDateString());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [billPhotoModalVisible, setBillPhotoModalVisible] = useState(false);

  // Input mode: 'rate' = (Rate/kg * Qty -> Total), 'total' = (Total / Qty -> Rate/kg)
  const [inputMode, setInputMode] = useState<'rate' | 'total'>('rate');

  // Active item input state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rateInput, setRateInput] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [totalInput, setTotalInput] = useState<string>('');

  // Modals & bill state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [savedBillReceipt, setSavedBillReceipt] = useState<Bill | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);

  // Notify context of active draft bill items to prevent bottom button overlap
  useEffect(() => {
    setActiveDraftBillCount(billItems.length);
    return () => {
      setActiveDraftBillCount(0);
    };
  }, [billItems.length]);

  // Derived values for current input
  const numQty = parseFloat(quantityInput) || 0;
  const numRate = parseFloat(rateInput) || 0;
  const numTotal = parseFloat(totalInput) || 0;

  // Effective rate and total calculation
  const effectiveRate = useMemo(() => {
    if (inputMode === 'rate') {
      return numRate;
    } else {
      return calculateRateFromTotal(numTotal, numQty);
    }
  }, [inputMode, numRate, numTotal, numQty]);

  const effectiveTotal = useMemo(() => {
    if (inputMode === 'rate') {
      return calculateItemTotal(numRate, numQty);
    } else {
      return numTotal;
    }
  }, [inputMode, numRate, numQty, numTotal]);

  // Previous rate lookup for currently selected product
  const previousHistory = useMemo(() => {
    if (!selectedProduct) return null;
    return getPreviousRate(selectedProduct.id, selectedProduct.name, billDate);
  }, [selectedProduct, billDate, getPreviousRate]);

  // Live price difference calculation
  const livePriceDiff = useMemo(() => {
    if (!selectedProduct || effectiveRate <= 0) return null;
    return calculatePriceDiff(
      effectiveRate,
      previousHistory?.previousRate,
      previousHistory?.previousDate
    );
  }, [selectedProduct, effectiveRate, previousHistory]);

  const activeUnit = selectedProduct?.unit || 'kg';

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    const history = getPreviousRate(product.id, product.name, billDate);
    const defaultRate = history?.previousRate || product.defaultRatePerKg;

    if (defaultRate && defaultRate > 0) {
      setRateInput(defaultRate.toString());
      if (inputMode === 'total' && numQty > 0) {
        setTotalInput((defaultRate * numQty).toFixed(2));
      }
    }
  };

  // Add line item to bill draft
  const handleAddItem = () => {
    if (!selectedProduct) {
      Alert.alert('Missing Product', 'Please select or add a product first.');
      return;
    }
    if (numQty <= 0) {
      Alert.alert('Invalid Quantity', `Please enter a valid quantity greater than 0 ${activeUnit}.`);
      return;
    }
    if (effectiveRate <= 0) {
      Alert.alert('Invalid Price', `Please enter a valid price/${activeUnit} or total amount.`);
      return;
    }

    const newItem: BillItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      ratePerKg: effectiveRate,
      quantityKg: numQty,
      totalAmount: effectiveTotal,
      unit: activeUnit,
      previousRatePerKg: previousHistory?.previousRate,
      priceDiffPerKg: livePriceDiff?.diff,
      priceDiffPercent: livePriceDiff?.percent,
      previousBillDate: previousHistory?.previousDate,
    };

    setBillItems([newItem, ...billItems]);

    // Reset input fields for next item
    setSelectedProduct(null);
    setRateInput('');
    setQuantityInput('1');
    setTotalInput('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...billItems];
    updated.splice(index, 1);
    setBillItems(updated);
  };

  const handleImportScannedItems = async (
    scannedItems: { productName: string; quantityKg: number; ratePerKg: number; totalAmount: number }[]
  ) => {
    const newItems: BillItem[] = [];

    for (const item of scannedItems) {
      const prod = await addProduct(item.productName.trim(), 'General', item.ratePerKg);
      const prev = getPreviousRate(prod.id, prod.name, billDate);
      const diffResult = calculatePriceDiff(item.ratePerKg, prev?.previousRate, prev?.previousDate);

      newItems.push({
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        productId: prod.id,
        productName: prod.name,
        ratePerKg: item.ratePerKg,
        quantityKg: item.quantityKg,
        totalAmount: item.totalAmount,
        unit: prod.unit || 'kg',
        previousRatePerKg: prev?.previousRate,
        priceDiffPerKg: diffResult.diff,
        priceDiffPercent: diffResult.percent,
        previousBillDate: prev?.previousDate,
      });
    }

    setBillItems((prev) => [...newItems, ...prev]);
    Alert.alert(
      'Items Added to Bill',
      `Successfully imported ${newItems.length} items from the bill photo! You can review or save the bill.`
    );
  };

  // Bill totals
  const grandTotal = useMemo(() => {
    return billItems.reduce((acc, item) => acc + item.totalAmount, 0);
  }, [billItems]);

  const totalWeight = useMemo(() => {
    return billItems.reduce((acc, item) => acc + item.quantityKg, 0);
  }, [billItems]);

  // Save current bill
  const handleSaveBill = async () => {
    if (billItems.length === 0) {
      Alert.alert('Empty Bill', 'Please add at least one product to save the bill.');
      return;
    }

    try {
      const saved = await saveNewBill({
        date: billDate,
        items: billItems,
      });

      setSavedBillReceipt(saved);
      setReceiptVisible(true);
      setBillItems([]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save bill. Please try again.');
    }
  };

  // Quick weight setters
  const applyPresetQty = (kg: number) => {
    setQuantityInput(kg.toString());
    if (inputMode === 'rate' && numRate > 0) {
      // Auto updates through memo
    } else if (inputMode === 'total' && effectiveRate > 0) {
      setTotalInput((effectiveRate * kg).toFixed(2));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date Selector Banner */}
        <View style={styles.dateBar}>
          <TouchableOpacity
            style={styles.dateInfo}
            onPress={() => setIsDatePickerVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={18} color="#2563eb" />
            <Text style={styles.dateLabel}>Date:</Text>
            <Text style={styles.dateValue}>{formatDate(billDate)}</Text>
          </TouchableOpacity>
          <View style={styles.dateButtons}>
            <TouchableOpacity
              style={[
                styles.dateChip,
                billDate === getTodayDateString() && styles.dateChipActive,
              ]}
              onPress={() => setBillDate(getTodayDateString())}
            >
              <Text
                style={[
                  styles.dateChipText,
                  billDate === getTodayDateString() && styles.dateChipTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customDateBtn}
              onPress={() => setIsDatePickerVisible(true)}
            >
              <Ionicons name="calendar-outline" size={14} color="#2563eb" />
              <Text style={styles.customDateText}>Pick Date</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input Card */}
        <View style={styles.entryCard}>
          {/* Mode Switcher */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                inputMode === 'rate' && styles.modeTabActive,
              ]}
              onPress={() => setInputMode('rate')}
            >
              <Ionicons
                name="calculator-outline"
                size={14}
                color={inputMode === 'rate' ? '#2563eb' : '#64748b'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  inputMode === 'rate' && styles.modeTabTextActive,
                ]}
              >
                Enter Price/kg
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                inputMode === 'total' && styles.modeTabActive,
              ]}
              onPress={() => setInputMode('total')}
            >
              <Ionicons
                name="receipt-outline"
                size={14}
                color={inputMode === 'total' ? '#2563eb' : '#64748b'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  inputMode === 'total' && styles.modeTabTextActive,
                ]}
              >
                Enter Total Bill
              </Text>
            </TouchableOpacity>
          </View>

          {/* Product Picker Trigger */}
          <TouchableOpacity
            style={styles.productPickerButton}
            onPress={() => setSearchModalVisible(true)}
          >
            <Ionicons name="basket" size={20} color="#2563eb" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerLabel}>Product</Text>
              <Text style={styles.pickerValue}>
                {selectedProduct ? selectedProduct.name : 'Select or Add Product...'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Previous Bill Rate Indicator below Product Title */}
          {selectedProduct && (
            <View style={styles.productMetaInfoRow}>
              {previousHistory ? (
                <View style={styles.productHistoryBadge}>
                  <Ionicons name="time-outline" size={13} color="#2563eb" />
                  <Text style={styles.productHistoryText}>
                    Last Bill Rate:{' '}
                    <Text style={styles.productHistoryBold}>
                      {formatRateWithUnit(previousHistory.previousRate, activeUnit)}
                    </Text>{' '}
                    ({formatDate(previousHistory.previousDate)})
                  </Text>
                </View>
              ) : (
                <View style={styles.productNewBadge}>
                  <Ionicons name="sparkles" size={12} color="#4338ca" />
                  <Text style={styles.productNewText}>New Item • First time in bill</Text>
                </View>
              )}
            </View>
          )}

          {/* Pricing & Weight Inputs */}
          <View style={styles.inputRow}>
            {inputMode === 'rate' ? (
              <View style={styles.inputCol}>
                <Text style={styles.fieldLabel}>Rate per {activeUnit} (₹)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={rateInput}
                    onChangeText={setRateInput}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.inputCol}>
                <Text style={styles.fieldLabel}>Total Paid (₹)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={totalInput}
                    onChangeText={setTotalInput}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputCol}>
              <Text style={styles.fieldLabel}>Quantity ({activeUnit})</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="1.0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={quantityInput}
                  onChangeText={setQuantityInput}
                />
                <Text style={styles.unitSuffix}>{activeUnit}</Text>
              </View>
            </View>
          </View>

          {/* Unit-Aware Quick Presets */}
          <View style={styles.presetsRow}>
            <Text style={styles.presetLabel}>Quick Qty:</Text>
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
                  { label: '250g', val: 0.25 },
                  { label: '500g', val: 0.5 },
                  { label: '1 kg', val: 1 },
                  { label: '2 kg', val: 2 },
                  { label: '5 kg', val: 5 },
                ]
            ).map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={styles.presetPill}
                onPress={() => applyPresetQty(preset.val)}
              >
                <Text style={styles.presetPillText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live Price Comparison & Calculated Result Box */}
          {selectedProduct && (effectiveRate > 0 || effectiveTotal > 0) && (
            <View style={styles.calculationPreviewBox}>
              <View style={styles.calcPreviewRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.previewCalcText}>
                    {formatRateWithUnit(effectiveRate, activeUnit)} × {formatQuantityWithUnit(numQty, activeUnit)}
                  </Text>
                  <Text style={styles.previewSubRate}>
                    {inputMode === 'total'
                      ? `Derived Rate: ${formatRateWithUnit(effectiveRate, activeUnit)}`
                      : `Total for ${formatQuantityWithUnit(numQty, activeUnit)}`}
                  </Text>
                </View>
                <Text style={styles.previewTotalAmount}>{formatINR(effectiveTotal)}</Text>
              </View>

              {/* Price Delta Comparison vs Last Bill - wrapped and formatted cleanly */}
              {livePriceDiff && (
                <View style={styles.calcDiffBanner}>
                  <Text style={styles.calcDiffBannerLabel}>Price vs Previous Bill:</Text>
                  <PriceDiffBadge diffResult={livePriceDiff} />
                </View>
              )}
            </View>
          )}

          {/* Action Row: Add Item Button + Fetch Photo & Generate Bill */}
          <View style={styles.itemActionButtonsRow}>
            <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
              <Ionicons name="add-circle" size={18} color="#ffffff" />
              <Text style={styles.addItemBtnText}>Add Item</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fetchPhotoBtn}
              onPress={() => setBillPhotoModalVisible(true)}
            >
              <Ionicons name="camera" size={18} color="#2563eb" />
              <Text style={styles.fetchPhotoBtnText}>Fetch Photo & Bill</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Bill Section */}
        <View style={styles.billSectionHeader}>
          <Text style={styles.sectionTitle}>
            Bill Items ({billItems.length})
          </Text>
          {billItems.length > 0 && (
            <TouchableOpacity onPress={() => setBillItems([])}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List of Items in current bill */}
        {billItems.length === 0 ? (
          <View style={styles.emptyBillCard}>
            <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyBillTitle}>No items added yet</Text>
            <Text style={styles.emptyBillSubtitle}>
              Select a product and quantity above to build your quick bill
            </Text>
          </View>
        ) : (
          billItems.map((item, index) => (
            <BillItemCard
              key={item.id}
              item={item}
              index={index}
              onRemove={() => handleRemoveItem(index)}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Bottom Bill Summary & Save Bar */}
      {billItems.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.summaryTotals}>
            <Text style={styles.summaryWeightText}>
              {billItems.length} {billItems.length === 1 ? 'item' : 'items'} in bill
            </Text>
            <Text style={styles.summaryGrandTotal}>{formatINR(grandTotal)}</Text>
          </View>

          <TouchableOpacity style={styles.saveBillBtn} onPress={handleSaveBill}>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={styles.saveBillBtnText}>Save Quick Bill</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Product Search & Quick-Add Modal */}
      <ProductSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSelectProduct={handleSelectProduct}
      />

      {/* Receipt Modal for saved bill */}
      <ReceiptModal
        bill={savedBillReceipt}
        visible={receiptVisible}
        onClose={() => setReceiptVisible(false)}
      />

      {/* Interactive Calendar Date Picker Modal (DD-MM-YYYY) */}
      <DatePickerModal
        visible={isDatePickerVisible}
        currentDate={billDate}
        onClose={() => setIsDatePickerVisible(false)}
        onSelectDate={(newDate) => setBillDate(newDate)}
      />

      {/* Bill Photo Scanner & AI Review Modal */}
      <BillPhotoModal
        visible={billPhotoModalVisible}
        onClose={() => setBillPhotoModalVisible(false)}
        onImportItems={handleImportScannedItems}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 160,
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0f172a',
    fontWeight: '700',
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
    backgroundColor: '#2563eb',
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
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modeTabTextActive: {
    color: '#2563eb',
  },
  productPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  productMetaInfoRow: {
    marginBottom: 12,
  },
  productHistoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
    flexWrap: 'wrap',
  },
  productHistoryText: {
    fontSize: 12,
    color: '#1e40af',
    flexShrink: 1,
  },
  productHistoryBold: {
    fontWeight: '700',
    color: '#1e3a8a',
  },
  productNewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignSelf: 'flex-start',
  },
  productNewText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '600',
  },
  pickerLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  pickerValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginRight: 6,
  },
  unitSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  presetLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 2,
  },
  presetPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  calculationPreviewBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 14,
  },
  calcPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewCalcText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
  },
  previewSubRate: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
  },
  previewTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284c7',
  },
  calcDiffBanner: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
    gap: 4,
  },
  calcDiffBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#075985',
    marginBottom: 2,
  },
  itemActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addItemBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  addItemBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  fetchPhotoBtn: {
    flex: 1.25,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  fetchPhotoBtnText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '700',
  },
  billSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  emptyBillCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyBillTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptyBillSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  summaryTotals: {
    flex: 1,
  },
  summaryWeightText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryGrandTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803d',
  },
  saveBillBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  saveBillBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  customDateModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customDateCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  customDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  customDateDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 14,
  },
  customDateTextInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 16,
  },
  customDateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  customDateCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  customDateCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  customDateConfirm: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  customDateConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
