import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { PurchaseOrder } from '../types';
import { formatDate, formatQuantityWithUnit, formatWeight } from '../utils/formatters';
import { ShopOrderModal } from '../components/ShopOrderModal';

export const OrderHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { purchaseOrders, deletePurchaseOrder } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  // Purchase order edit modal state
  const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
  const [editOrderModalVisible, setEditOrderModalVisible] = useState(false);

  // Filter purchase orders
  const filteredPurchases = purchaseOrders.filter((po) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const matchDate = po.date.toLowerCase().includes(query);
    const matchNumber = po.orderNumber.toLowerCase().includes(query);
    const matchShop = po.shopName ? po.shopName.toLowerCase().includes(query) : false;
    const matchProduct = po.items.some((it) =>
      it.productName.toLowerCase().includes(query)
    );
    return matchDate || matchNumber || matchShop || matchProduct;
  });

  const handleDeletePurchase = (po: PurchaseOrder) => {
    Alert.alert(
      'Delete Order Record',
      `Are you sure you want to delete order ${po.orderNumber} (${formatDate(po.date)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePurchaseOrder(po.id),
        },
      ]
    );
  };

  const handleEditPurchase = (po: PurchaseOrder) => {
    setOrderToEdit(po);
    setEditOrderModalVisible(true);
  };

  const handleSharePurchaseOrder = async (po: PurchaseOrder) => {
    let msg = `🛒 *PURCHASE ORDER*\n`;
    if (po.shopName) {
      msg += `🏪 *To:* *${po.shopName}*\n`;
    }
    msg += `📌 *Date:* *${formatDate(po.date)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *ORDERED ITEMS LIST:*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;

    po.items.forEach((item, index) => {
      msg += `🔹 *${index + 1}. ${item.productName.toUpperCase()}*  ➤  *${formatQuantityWithUnit(
        item.quantityKg,
        item.unit
      )}*\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *Total Items:* *${po.items.length}*\n`;
    if (po.notes) {
      msg += `📝 *Notes:* _${po.notes}_\n`;
    }
    msg += `\n_Please prepare and confirm availability. Thank you!_`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(msg)}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          message: msg,
          title: 'Purchase Order Details',
        });
      }
    } catch {
      await Share.share({
        message: msg,
        title: 'Purchase Order Details',
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Order #, Date (DD-MM-YYYY), Shop, or Item..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredPurchases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
        renderItem={({ item }) => (
          <View style={styles.purchaseCard}>
            <View style={styles.cardHeader}>
              <View style={styles.poNumberBadge}>
                <Ionicons name="cart" size={14} color="#16a34a" />
                <Text style={styles.poNumberText}>{item.orderNumber}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.dateText}>{formatDate(item.date)}</Text>
              </View>
            </View>

            {item.shopName ? (
              <View style={styles.shopNameRow}>
                <Ionicons name="storefront" size={15} color="#0f172a" />
                <Text style={styles.shopNameText}>{item.shopName}</Text>
              </View>
            ) : null}

            {/* Items List */}
            <View style={styles.productsList}>
              {item.items.map((it, idx) => (
                <View key={idx} style={styles.purchaseItemLine}>
                  <Text style={styles.purchaseItemName}>• {it.productName}</Text>
                  <Text style={styles.purchaseItemWeight}>
                    {formatQuantityWithUnit(it.quantityKg, it.unit)}
                  </Text>
                </View>
              ))}
            </View>

            {item.notes ? (
              <View style={styles.notesRow}>
                <Ionicons name="document-text-outline" size={13} color="#64748b" />
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            ) : null}

            <View style={styles.cardFooter}>
              <Text style={styles.weightText}>
                {item.items.length} {item.items.length === 1 ? 'item' : 'items'} •{' '}
                {formatWeight(item.totalWeightKg)}
              </Text>

              <View style={styles.actionButtons}>
                {/* Share to WhatsApp */}
                <TouchableOpacity
                  style={styles.shareWhatsAppBtn}
                  onPress={() => handleSharePurchaseOrder(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                  <Text style={styles.shareWhatsAppBtnText}>Share</Text>
                </TouchableOpacity>

                {/* Edit Record */}
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleEditPurchase(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={16} color="#0f172a" />
                </TouchableOpacity>

                {/* Delete Record */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeletePurchase(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Order History Yet</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No orders match your search criteria.'
                : 'Orders created in the "New Order" tab will be saved and tracked here.'}
            </Text>
          </View>
        }
      />

      {/* Edit Purchase Order Modal */}
      {orderToEdit && (
        <ShopOrderModal
          visible={editOrderModalVisible}
          onClose={() => {
            setEditOrderModalVisible(false);
            setOrderToEdit(null);
          }}
          orderToEdit={orderToEdit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  purchaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  poNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  poNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  shopNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  productsList: {
    marginBottom: 10,
    gap: 4,
  },
  purchaseItemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  purchaseItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  purchaseItemWeight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  notesText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  weightText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  shareWhatsAppBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  editBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  deleteBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
