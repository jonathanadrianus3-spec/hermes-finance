import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Transaction } from '../types';
import { formatIDR, getCategoryMeta, formatDateShort } from '../constants/categories';

interface TransactionItemProps {
  item: Transaction;
  onPress: (item: Transaction) => void;
  showDivider?: boolean;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  item,
  onPress,
  showDivider = true,
}) => {
  const catMeta = getCategoryMeta(item.category);
  const entityConfig = THEME.colors.entities[item.entity] || THEME.colors.entities.Personal;
  const isUnreviewed = item.is_reviewed === 0;

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={() => onPress(item)}
      style={styles.container}
    >
      <View style={styles.row}>
        {/* Minimalist Frosted Category Icon */}
        <View style={styles.iconBox}>
          <Ionicons
            name={catMeta.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={THEME.colors.primary}
          />
        </View>

        {/* Center: Merchant and Subtitle */}
        <View style={styles.centerSection}>
          <View style={styles.merchantRow}>
            <Text style={styles.merchantName} numberOfLines={1}>
              {item.merchant_clean_name || item.merchant_name}
            </Text>
            {isUnreviewed && (
              <View style={styles.unreviewedDot} />
            )}
          </View>

          <Text style={styles.subtext} numberOfLines={1}>
            {item.category} • {formatDateShort(item.transaction_date)}
          </Text>
        </View>

        {/* Right: Amount and Entity Badge */}
        <View style={styles.rightSection}>
          <Text style={styles.amount}>{formatIDR(item.amount)}</Text>
          
          <View
            style={[
              styles.entityPill,
              {
                backgroundColor: entityConfig.bg,
                borderColor: entityConfig.border,
              },
            ]}
          >
            <Text style={[styles.entityText, { color: entityConfig.color }]}>
              {item.entity}
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={14}
          color={THEME.colors.text.muted}
          style={{ marginLeft: 6 }}
        />
      </View>

      {showDivider && <View style={styles.divider} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(208, 188, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  centerSection: {
    flex: 1,
    marginRight: 8,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    letterSpacing: -0.2,
  },
  unreviewedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  subtext: {
    fontSize: 12,
    color: THEME.colors.text.secondary,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    letterSpacing: -0.2,
  },
  entityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.pill,
    borderWidth: 0.5,
    marginTop: 4,
  },
  entityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.borderHairline,
    marginLeft: 68,
  },
});
