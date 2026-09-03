import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { EntityBreakdown, ExpenseEntity } from '../types';
import { formatIDR } from '../constants/categories';

interface EntityPillsRowProps {
  entities: EntityBreakdown[];
  totalSpent: number;
  selectedEntity?: string;
  onSelectEntity?: (entity: ExpenseEntity) => void;
}

const ENTITY_ICONS: Record<ExpenseEntity, keyof typeof Ionicons.glyphMap> = {
  Personal: 'person',
  Family: 'people',
  Community: 'heart',
  Professional: 'briefcase',
};

export const EntityPillsRow: React.FC<EntityPillsRowProps> = ({
  entities,
  totalSpent,
  selectedEntity,
  onSelectEntity,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>SPENDING BY ENTITY</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {entities.map((item) => {
          const config = THEME.colors.entities[item.entity] || THEME.colors.entities.Personal;
          const isSelected = selectedEntity === item.entity;
          const pct = totalSpent > 0 ? Math.round((item.total_amount / totalSpent) * 100) : 0;
          const iconName = ENTITY_ICONS[item.entity] || 'wallet';

          return (
            <TouchableOpacity
              key={item.entity}
              activeOpacity={0.75}
              onPress={() => onSelectEntity && onSelectEntity(item.entity)}
              style={[
                styles.glassCard,
                {
                  borderColor: isSelected ? config.color : THEME.colors.borderGlass,
                  backgroundColor: isSelected
                    ? config.bg
                    : THEME.colors.surfaceGlass,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${config.color}25` },
                  ]}
                >
                  <Ionicons name={iconName} size={13} color={config.color} />
                </View>
                <View style={styles.pctPill}>
                  <Text style={[styles.pctText, { color: config.color }]}>
                    {pct}%
                  </Text>
                </View>
              </View>

              <Text style={styles.entityName}>{item.entity}</Text>
              <Text style={styles.entityAmount}>{formatIDR(item.total_amount)}</Text>
              <Text style={styles.txCount}>{item.count} txs</Text>

              {/* Android 17 Slider Style Pill Bar */}
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(pct, 8)}%`,
                      backgroundColor: config.color,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.colors.text.secondary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: THEME.colors.text.muted,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 12,
  },
  glassCard: {
    width: 144,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.radius.pill,
  },
  pctText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entityName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginBottom: 2,
  },
  entityAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    marginBottom: 2,
  },
  txCount: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    marginBottom: 10,
  },
  track: {
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
