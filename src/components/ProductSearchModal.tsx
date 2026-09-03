import React, { useState } from 'react';
import {
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
import { formatINR, formatRateWithUnit } from '../utils/formatters';

interface ProductSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  visible,
  onClose,
  onSelectProduct,
}) => {
  const { products, addProduct } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Vegetables');

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const exactMatch = products.some(
    (p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const handleQuickAddAndSelect = async (nameToUse: string) => {
    if (!nameToUse.trim()) return;
    const lower = nameToUse.toLowerCase();
    let detectedUnit: ProductUnit = 'kg';
    let detectedCategory = newProductCategory;

    if (lower.includes('oil') || lower.includes('tel') || lower.includes('तेल')) {
      detectedUnit = 'Tin';
      detectedCategory = 'Oil';
    } else if (lower.includes('loth') || lower.includes('atta') || lower.includes('flour') || lower.includes('आटा') || lower.includes('चावल') || lower.includes('rice')) {
      detectedUnit = 'Bag';
      detectedCategory = 'Loth / Flour';
    }

    const newProd = await addProduct(nameToUse.trim(), detectedCategory, undefined, detectedUnit);
    setSearchQuery('');
    setIsAddingNew(false);
    onSelectProduct(newProd);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Select or Add Product</Text>
              <Text style={styles.subtitle}>Choose from catalog or type new product</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search product (e.g. Tomato, Rice)..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Add Banner if no exact match */}
          {searchQuery.trim().length > 1 && !exactMatch && (
            <TouchableOpacity
              style={styles.quickAddBanner}
              onPress={() => handleQuickAddAndSelect(searchQuery)}
            >
              <Ionicons name="add-circle" size={22} color="#0f172a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.quickAddTitle}>Add "{searchQuery.trim()}" as new product</Text>
                <Text style={styles.quickAddSubtitle}>Tap here to add to catalog & select</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#0f172a" />
            </TouchableOpacity>
          )}

          {/* Product List */}
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productItem}
                onPress={() => {
                  onSelectProduct(item);
                  setSearchQuery('');
                  onClose();
                }}
              >
                <View style={styles.productIconBg}>
                  <Ionicons name="pricetag-outline" size={18} color="#0f172a" />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.category && (
                    <Text style={styles.productCategory}>{item.category}</Text>
                  )}
                </View>
                {item.defaultRatePerKg ? (
                  <View style={styles.rateTag}>
                    <Text style={styles.rateTagText}>
                      {formatRateWithUnit(item.defaultRatePerKg, item.unit)}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !exactMatch && searchQuery.trim().length > 0 ? null : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="basket-outline" size={40} color="#9ca3af" />
                  <Text style={styles.emptyText}>No products found</Text>
                  <Text style={styles.emptySubText}>
                    Type a new name above to add it immediately
                  </Text>
                </View>
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  quickAddBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  quickAddSubtitle: {
    fontSize: 11,
    color: '#475569',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  productIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  productCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  rateTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rateTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});
