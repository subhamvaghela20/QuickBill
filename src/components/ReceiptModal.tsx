import React from 'react';
import {
  FlatList,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Bill } from '../types';
import { formatDate, formatINR, formatQuantityWithUnit, formatRateWithUnit, formatWeight } from '../utils/formatters';
import { PriceDiffBadge } from './PriceDiffBadge';
import { calculatePriceDiff } from '../utils/calculations';

interface ReceiptModalProps {
  bill: Bill | null;
  visible: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ bill, visible, onClose }) => {
  if (!bill) return null;

  const handleShare = async () => {
    try {
      let text = `🧾 QuickBill Receipt - ${bill.billNumber}\n`;
      text += `📌 *Date:* ${formatDate(bill.date)}\n`;
      text += `------------------------------\n`;
      bill.items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.productName}\n`;
        text += `   ${formatQuantityWithUnit(item.quantityKg, item.unit)} @ ${formatRateWithUnit(item.ratePerKg, item.unit)} = ${formatINR(item.totalAmount)}\n`;
        if (item.previousRatePerKg) {
          const diff = item.ratePerKg - item.previousRatePerKg;
          const diffSign = diff > 0 ? `+${formatINR(diff)}` : formatINR(diff);
          text += `   (Prev: ${formatRateWithUnit(item.previousRatePerKg, item.unit)}, Diff: ${diffSign}/${item.unit || 'kg'})\n`;
        }
      });
      text += `------------------------------\n`;
      text += `⚖️ Total Weight: ${formatWeight(bill.totalWeightKg)}\n`;
      text += `💰 Grand Total: ${formatINR(bill.grandTotal)}\n`;
      text += `Generated with QuickBill App`;

      await Share.share({
        message: text,
      });
    } catch (err) {
      console.error('Error sharing bill:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brandTitle}>QuickBill Receipt</Text>
              <Text style={styles.billNumber}>{bill.billNumber} • {formatDate(bill.date)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Items List */}
          <FlatList
            data={bill.items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const diffResult = calculatePriceDiff(
                item.ratePerKg,
                item.previousRatePerKg,
                item.previousBillDate
              );

              return (
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>
                      {index + 1}. {item.productName}
                    </Text>
                    <Text style={styles.itemSubtext}>
                      {formatRateWithUnit(item.ratePerKg, item.unit)} × {formatQuantityWithUnit(item.quantityKg, item.unit)}
                    </Text>
                    <View style={{ marginTop: 4 }}>
                      <PriceDiffBadge diffResult={diffResult} compact />
                    </View>
                  </View>
                  <Text style={styles.itemTotal}>{formatINR(item.totalAmount)}</Text>
                </View>
              );
            }}
          />

          {/* Totals Section */}
          <View style={styles.totalSection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Weight</Text>
              <Text style={styles.summaryVal}>{formatWeight(bill.totalWeightKg)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalVal}>{formatINR(bill.grandTotal)}</Text>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#ffffff" />
              <Text style={styles.shareBtnText}>Share Bill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  billNumber: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  grandTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  grandTotalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#15803d',
  },
  footerActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  doneBtn: {
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
