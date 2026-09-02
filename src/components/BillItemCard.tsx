import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BillItem } from '../types';
import { formatINR, formatQuantityWithUnit, formatRateWithUnit } from '../utils/formatters';
import { PriceDiffBadge } from './PriceDiffBadge';
import { calculatePriceDiff } from '../utils/calculations';

interface BillItemCardProps {
  item: BillItem;
  onRemove?: () => void;
  index: number;
}

export const BillItemCard: React.FC<BillItemCardProps> = ({ item, onRemove, index }) => {
  const diffResult = calculatePriceDiff(
    item.ratePerKg,
    item.previousRatePerKg,
    item.previousBillDate
  );

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.indexCircle}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.formulaText}>
            {formatRateWithUnit(item.ratePerKg, item.unit)} × {formatQuantityWithUnit(item.quantityKg, item.unit)}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.totalAmount}>{formatINR(item.totalAmount)}</Text>
          {onRemove && (
            <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <PriceDiffBadge diffResult={diffResult} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  titleContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  formulaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  removeButton: {
    padding: 4,
  },
  bottomRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
});
