import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Product, ProductUnit } from '../types';
import { formatDate, formatINR, formatRateWithUnit } from '../utils/formatters';

export const ProductsScreen: React.FC = () => {
  const { products, bills, addProduct, updateProduct, deleteProduct, clearProducts } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdRate, setNewProdRate] = useState('');
  const [newProdUnit, setNewProdUnit] = useState<ProductUnit>('kg');
  const [newProdCategory, setNewProdCategory] = useState('Vegetables');

  // Edit product state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdRate, setEditProdRate] = useState('');
  const [editProdUnit, setEditProdUnit] = useState<ProductUnit>('kg');
  const [editProdCategory, setEditProdCategory] = useState('Vegetables');

  const handleOpenEdit = (prod: Product) => {
    setEditProduct(prod);
    setEditProdName(prod.name);
    setEditProdRate(prod.defaultRatePerKg ? prod.defaultRatePerKg.toString() : '');
    setEditProdUnit(prod.unit || 'kg');
    setEditProdCategory(prod.category || 'Vegetables');
  };

  const handleSaveEdit = async () => {
    if (!editProduct) return;
    if (!editProdName.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }
    const rate = parseFloat(editProdRate) || undefined;
    await updateProduct(editProduct.id, {
      name: editProdName.trim(),
      category: editProdCategory,
      defaultRatePerKg: rate,
      unit: editProdUnit,
    });
    setEditProduct(null);
  };

  const handleDeleteProduct = (prod: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${prod.name}" from your catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(prod.id),
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Products',
      'Are you sure you want to remove all saved products from the catalog?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearProducts() },
      ]
    );
  };

  // Selected product to inspect price trend
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleAddNew = async () => {
    if (!newProdName.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }
    const rate = parseFloat(newProdRate) || undefined;
    await addProduct(newProdName.trim(), newProdCategory, rate, newProdUnit);
    setNewProdName('');
    setNewProdRate('');
    setNewProdUnit('kg');
    setAddModalVisible(false);
  };

  // Find all historical bill occurrences of the inspected product
  const getProductPriceHistory = (productId: string, productName: string) => {
    const history: { date: string; billNumber: string; ratePerKg: number; diff: number }[] = [];
    const norm = productName.trim().toLowerCase();

    // Sort bills ascending by date to show history chronologically
    const sorted = [...bills].sort((a, b) => a.date.localeCompare(b.date));

    let prevRate = 0;
    sorted.forEach((bill) => {
      const item = bill.items.find(
        (it) =>
          it.productId === productId ||
          it.productName.trim().toLowerCase() === norm
      );
      if (item && item.ratePerKg > 0) {
        const diff = prevRate > 0 ? item.ratePerKg - prevRate : 0;
        history.push({
          date: bill.date,
          billNumber: bill.billNumber,
          ratePerKg: item.ratePerKg,
          diff,
        });
        prevRate = item.ratePerKg;
      }
    });

    return history.reverse(); // Newest first
  };

  return (
    <View style={styles.container}>
      {/* Search and Add Header */}
      <View style={styles.headerBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {products.length > 0 && (
          <TouchableOpacity
            style={styles.clearHeaderBtn}
            onPress={handleClearAll}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <TouchableOpacity
              style={styles.productCardContent}
              onPress={() => setInspectProduct(item)}
              activeOpacity={0.7}
            >
              <View style={styles.productIcon}>
                <Ionicons name="basket-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.categoryText}>
                  {item.category || 'General'} • Unit: <Text style={{ fontWeight: '700', color: '#2563eb' }}>{item.unit || 'kg'}</Text>
                </Text>
                {item.defaultRatePerKg ? (
                  <Text style={styles.rateText}>
                    {formatRateWithUnit(item.defaultRatePerKg, item.unit)}
                  </Text>
                ) : (
                  <Text style={styles.noRateText}>No default rate</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Quick Action Buttons: History, Edit, Delete */}
            <View style={styles.productActionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setInspectProduct(item)}
              >
                <Ionicons name="trending-up" size={17} color="#2563eb" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleOpenEdit(item)}
              >
                <Ionicons name="pencil-outline" size={17} color="#0284c7" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDeleteProduct(item)}
              >
                <Ionicons name="trash-outline" size={17} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Products in Catalog</Text>
            <Text style={styles.emptySubtitle}>
              Your product catalog is empty. Tap "+ Add" above to add products, or add them on the fly while creating a bill.
            </Text>
          </View>
        }
      />

      {/* Price History Trend Modal */}
      {inspectProduct && (
        <Modal
          visible={!!inspectProduct}
          animationType="slide"
          transparent
          onRequestClose={() => setInspectProduct(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.trendCard}>
              <View style={styles.trendHeader}>
                <View>
                  <Text style={styles.trendTitle}>{inspectProduct.name}</Text>
                  <Text style={styles.trendSubtitle}>Price Fluctuation History</Text>
                </View>
                <TouchableOpacity onPress={() => setInspectProduct(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={getProductPriceHistory(inspectProduct.id, inspectProduct.name)}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <View style={styles.trendRow}>
                    <View>
                      <Text style={styles.trendDate}>{formatDate(item.date)}</Text>
                      <Text style={styles.trendBill}>Bill {item.billNumber}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.trendRate}>{formatINR(item.ratePerKg)}/kg</Text>
                      {item.diff !== 0 && (
                        <Text
                          style={[
                            styles.trendDiff,
                            item.diff > 0 ? styles.diffUp : styles.diffDown,
                          ]}
                        >
                          {item.diff > 0 ? `+${formatINR(item.diff)}/kg` : `${formatINR(item.diff)}/kg`}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Text style={{ color: '#64748b' }}>
                      No saved bills found containing this product yet.
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Add New Product Modal */}
      <Modal
        visible={addModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            <Text style={styles.addModalTitle}>Add New Product</Text>

            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. Almonds (बादाम)"
              value={newProdName}
              onChangeText={setNewProdName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Measurement Unit *</Text>
            <View style={styles.unitPillsRow}>
              {(['kg', 'Bag', 'Tin'] as ProductUnit[]).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitPill,
                    newProdUnit === u && styles.unitPillActive,
                  ]}
                  onPress={() => setNewProdUnit(u)}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      newProdUnit === u && styles.unitPillTextActive,
                    ]}
                  >
                    {u === 'kg' ? 'kg (Kilogram)' : u === 'Bag' ? 'Bag (बोरी / कट्टा)' : 'Tin (तेल का डिब्बा)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Default Price per {newProdUnit} (₹ optional)</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder={newProdUnit === 'Bag' ? 'e.g. 1450' : newProdUnit === 'Tin' ? 'e.g. 2350' : 'e.g. 850'}
              keyboardType="numeric"
              value={newProdRate}
              onChangeText={setNewProdRate}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryPills}>
              {['Vegetables', 'Fruits', 'Grains', 'Oil (तेल)', 'Flour / Loth (आटा)', 'Grocery', 'Dry Fruits'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catPill,
                    newProdCategory === cat && styles.catPillActive,
                  ]}
                  onPress={() => {
                    setNewProdCategory(cat);
                    if (cat.includes('Oil')) setNewProdUnit('Tin');
                    if (cat.includes('Loth') || cat.includes('Flour')) setNewProdUnit('Bag');
                  }}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      newProdCategory === cat && styles.catPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveProdBtn} onPress={handleAddNew}>
                <Text style={styles.saveProdBtnText}>Save Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        visible={!!editProduct}
        animationType="fade"
        transparent
        onRequestClose={() => setEditProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.addModalTitle}>Edit Product</Text>
              <TouchableOpacity onPress={() => setEditProduct(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. Almonds (बादाम)"
              value={editProdName}
              onChangeText={setEditProdName}
            />

            <Text style={styles.inputLabel}>Measurement Unit *</Text>
            <View style={styles.unitPillsRow}>
              {(['kg', 'Bag', 'Tin'] as ProductUnit[]).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitPill,
                    editProdUnit === u && styles.unitPillActive,
                  ]}
                  onPress={() => setEditProdUnit(u)}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      editProdUnit === u && styles.unitPillTextActive,
                    ]}
                  >
                    {u === 'kg' ? 'kg (Kilogram)' : u === 'Bag' ? 'Bag (बोरी / कट्टा)' : 'Tin (तेल का डिब्बा)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Default Price per {editProdUnit} (₹ optional)</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder={editProdUnit === 'Bag' ? 'e.g. 1450' : editProdUnit === 'Tin' ? 'e.g. 2350' : 'e.g. 850'}
              keyboardType="numeric"
              value={editProdRate}
              onChangeText={setEditProdRate}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryPills}>
              {['Vegetables', 'Fruits', 'Grains', 'Oil (तेल)', 'Flour / Loth (आटा)', 'Grocery', 'Dry Fruits'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catPill,
                    editProdCategory === cat && styles.catPillActive,
                  ]}
                  onPress={() => {
                    setEditProdCategory(cat);
                    if (cat.includes('Oil')) setEditProdUnit('Tin');
                    if (cat.includes('Loth') || cat.includes('Flour')) setEditProdUnit('Bag');
                  }}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      editProdCategory === cat && styles.catPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditProduct(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveProdBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveProdBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
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
  headerBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  clearHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoryText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rateContainer: {
    alignItems: 'flex-end',
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 3,
  },
  noRateText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  trendCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  trendTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  trendSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  trendDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  trendBill: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  trendRate: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  trendDiff: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  diffUp: {
    color: '#dc2626',
  },
  diffDown: {
    color: '#16a34a',
  },
  addModalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 14,
  },
  unitPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  unitPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  unitPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  unitPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  unitPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catPillTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  saveProdBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveProdBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
