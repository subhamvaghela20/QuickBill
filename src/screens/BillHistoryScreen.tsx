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
import { useApp } from '../context/AppContext';
import { Bill, PurchaseOrder } from '../types';
import { formatDate, formatINR, formatQuantityWithUnit, formatWeight } from '../utils/formatters';
import { ReceiptModal } from '../components/ReceiptModal';
import { ShopOrderModal } from '../components/ShopOrderModal';

type HistorySubTab = 'bills' | 'purchases';

export const BillHistoryScreen: React.FC = () => {
  const { bills, purchaseOrders, deleteBill, deletePurchaseOrder } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<HistorySubTab>('bills');
  const [searchQuery, setSearchQuery] = useState('');

  // Bill detail modal state
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);

  // Purchase order edit modal state
  const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
  const [editOrderModalVisible, setEditOrderModalVisible] = useState(false);

  // Filtered lists
  const filteredBills = bills.filter((b) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const matchDate = b.date.toLowerCase().includes(query);
    const matchNumber = b.billNumber.toLowerCase().includes(query);
    const matchProduct = b.items.some((it) =>
      it.productName.toLowerCase().includes(query)
    );
    return matchDate || matchNumber || matchProduct;
  });

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

  // Actions for Bills
  const handleDeleteBill = (bill: Bill) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete bill ${bill.billNumber} from ${formatDate(bill.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBill(bill.id),
        },
      ]
    );
  };

  const openReceipt = (bill: Bill) => {
    setSelectedBill(bill);
    setReceiptVisible(true);
  };

  // Actions for Purchase Orders
  const handleDeletePurchase = (po: PurchaseOrder) => {
    Alert.alert(
      'Delete Purchase Record',
      `Are you sure you want to delete ${po.orderNumber} (${formatDate(po.date)})?`,
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
      msg += `🔹 *${index + 1}. ${item.productName.toUpperCase()}*  ➤  *${formatQuantityWithUnit(item.quantityKg, item.unit)}*\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *Total Items:* *${po.items.length}*\n\n`;
    msg += `_Please prepare and confirm availability. Thank you!_`;

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
      {/* Sub-Tabs Switcher: Bill History vs Purchase History */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'bills' && styles.subTabActive]}
          onPress={() => setActiveSubTab('bills')}
        >
          <Ionicons
            name={activeSubTab === 'bills' ? 'receipt' : 'receipt-outline'}
            size={16}
            color={activeSubTab === 'bills' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[
              styles.subTabText,
              activeSubTab === 'bills' && styles.subTabTextActive,
            ]}
          >
            Bill History ({bills.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'purchases' && styles.subTabActive]}
          onPress={() => setActiveSubTab('purchases')}
        >
          <Ionicons
            name={activeSubTab === 'purchases' ? 'cart' : 'cart-outline'}
            size={16}
            color={activeSubTab === 'purchases' ? '#16a34a' : '#64748b'}
          />
          <Text
            style={[
              styles.subTabText,
              activeSubTab === 'purchases' && styles.subTabTextActiveGreen,
            ]}
          >
            Purchase History ({purchaseOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeSubTab === 'bills'
              ? 'Search bills by date, number, or product...'
              : 'Search purchases by date, shop, or product...'
          }
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

      {/* TAB 1: BILL HISTORY */}
      {activeSubTab === 'bills' && (
        <FlatList
          data={filteredBills}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.billCard}
              onPress={() => openReceipt(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.billNumberBadge}>
                  <Ionicons name="receipt-outline" size={14} color="#2563eb" />
                  <Text style={styles.billNumberText}>{item.billNumber}</Text>
                </View>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
              </View>

              <View style={styles.productsList}>
                {item.items.slice(0, 3).map((it, idx) => (
                  <Text key={idx} style={styles.productSnippet} numberOfLines={1}>
                    • {it.productName} ({formatWeight(it.quantityKg)})
                  </Text>
                ))}
                {item.items.length > 3 && (
                  <Text style={styles.moreSnippet}>
                    +{item.items.length - 3} more items...
                  </Text>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.weightText}>
                    {item.items.length} items • {formatWeight(item.totalWeightKg)}
                  </Text>
                  <Text style={styles.grandTotalText}>{formatINR(item.grandTotal)}</Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteBill(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>

                  <View style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>View Receipt</Text>
                    <Ionicons name="chevron-forward" size={14} color="#2563eb" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={50} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Bills Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Your saved quick bills for each date will appear here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* TAB 2: PURCHASE HISTORY */}
      {activeSubTab === 'purchases' && (
        <FlatList
          data={filteredPurchases}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.purchaseCard}>
              <View style={styles.cardHeader}>
                <View style={styles.poNumberBadge}>
                  <Ionicons name="cart-outline" size={14} color="#16a34a" />
                  <Text style={styles.poNumberText}>{item.orderNumber}</Text>
                </View>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
              </View>

              {item.shopName ? (
                <View style={styles.shopNameRow}>
                  <Ionicons name="storefront" size={14} color="#475569" />
                  <Text style={styles.shopNameText}>{item.shopName}</Text>
                </View>
              ) : null}

              {/* Items List */}
              <View style={styles.productsList}>
                {item.items.map((it, idx) => (
                  <View key={idx} style={styles.purchaseItemLine}>
                    <Text style={styles.purchaseItemName}>• {it.productName}</Text>
                    <Text style={styles.purchaseItemWeight}>{formatQuantityWithUnit(it.quantityKg, it.unit)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.weightText}>
                  {item.items.length} items • {formatWeight(item.totalWeightKg)}
                </Text>

                <View style={styles.actionButtons}>
                  {/* Share to WhatsApp */}
                  <TouchableOpacity
                    style={styles.shareWhatsAppBtn}
                    onPress={() => handleSharePurchaseOrder(item)}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                    <Text style={styles.shareWhatsAppBtnText}>Share</Text>
                  </TouchableOpacity>

                  {/* Edit Record */}
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleEditPurchase(item)}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#0284c7" />
                  </TouchableOpacity>

                  {/* Delete Record */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeletePurchase(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={50} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Purchase Records</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Orders created with "Order for Shop" will be saved here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        bill={selectedBill}
        visible={receiptVisible}
        onClose={() => setReceiptVisible(false)}
      />

      {/* Edit Purchase Order Modal */}
      <ShopOrderModal
        visible={editOrderModalVisible}
        orderToEdit={orderToEdit}
        onClose={() => {
          setEditOrderModalVisible(false);
          setOrderToEdit(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: '#f1f5f9',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  subTabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  subTabTextActiveGreen: {
    color: '#16a34a',
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  purchaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
  billNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  billNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  shopNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  productsList: {
    marginBottom: 10,
    gap: 4,
  },
  productSnippet: {
    fontSize: 13,
    color: '#334155',
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
  },
  purchaseItemWeight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  moreSnippet: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  weightText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803d',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
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
    backgroundColor: '#f0f9ff',
  },
  deleteBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
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
  },
});
