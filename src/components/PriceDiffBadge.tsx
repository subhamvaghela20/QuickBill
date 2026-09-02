import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PriceDiffResult } from '../types';
import { formatDate, formatINR } from '../utils/formatters';

interface PriceDiffBadgeProps {
  diffResult: PriceDiffResult;
  compact?: boolean;
}

export const PriceDiffBadge: React.FC<PriceDiffBadgeProps> = ({ diffResult, compact = false }) => {
  const { status, diff, percent, previousRate, previousDate } = diffResult;

  if (status === 'new') {
    return (
      <View style={[styles.badge, styles.badgeNew]}>
        <Ionicons name="sparkles" size={12} color="#4338ca" />
        <Text style={[styles.badgeText, styles.textNew]}>New Item</Text>
      </View>
    );
  }

  if (status === 'same') {
    return (
      <View style={[styles.badge, styles.badgeSame]}>
        <Ionicons name="remove-circle-outline" size={12} color="#6b7280" />
        <Text style={[styles.badgeText, styles.textSame]}>
          {compact ? 'Same rate' : `Same (${formatINR(previousRate || 0)}/kg)`}
        </Text>
      </View>
    );
  }

  if (status === 'increased') {
    return (
      <View style={[styles.badge, styles.badgeIncreased]}>
        <Ionicons name="arrow-up" size={12} color="#dc2626" />
        <Text style={[styles.badgeText, styles.textIncreased]}>
          +{formatINR(diff)}/kg (+{percent}%)
          {!compact && previousDate ? ` vs ${formatDate(previousDate)}` : ''}
        </Text>
      </View>
    );
  }

  // status === 'decreased'
  return (
    <View style={[styles.badge, styles.badgeDecreased]}>
      <Ionicons name="arrow-down" size={12} color="#16a34a" />
      <Text style={[styles.badgeText, styles.textDecreased]}>
        {formatINR(diff)}/kg ({percent}%)
        {!compact && previousDate ? ` vs ${formatDate(previousDate)}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  badgeNew: {
    backgroundColor: '#e0e7ff',
  },
  textNew: {
    color: '#4338ca',
  },
  badgeSame: {
    backgroundColor: '#f3f4f6',
  },
  textSame: {
    color: '#4b5563',
  },
  badgeIncreased: {
    backgroundColor: '#fee2e2',
  },
  textIncreased: {
    color: '#b91c1c',
  },
  badgeDecreased: {
    backgroundColor: '#dcfce7',
  },
  textDecreased: {
    color: '#15803d',
  },
});
