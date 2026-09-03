import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { AnalyticsSummary, ExpenseEntity } from '../types';
import { AmbientBackground } from '../components/AmbientBackground';
import { HermesApi } from '../services/api';
import { formatIDR, getCategoryMeta } from '../constants/categories';

export const AnalyticsScreen: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const res = await HermesApi.getDashboard();
    setSummary(res.data.summary);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!summary) return null;

  const total = summary.total_spent || 1;

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.monthSub}>September 2026</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.primary}
            />
          }
        >
          {/* Multi-Entity Distribution Section */}
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>SPENDING BY ENTITY</Text>
            <Text style={styles.cardSub}>Personal • Family • Community • Professional</Text>

            {/* Combined Segmented Bar */}
            <View style={styles.segmentedBar}>
              {summary.entity_breakdown.map((ent) => {
                const pct = (ent.total_amount / total) * 100;
                const config = THEME.colors.entities[ent.entity] || THEME.colors.entities.Personal;
                if (pct === 0) return null;
                return (
                  <View
                    key={ent.entity}
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: config.color,
                    }}
                  />
                );
              })}
            </View>

            {/* Entity List Items */}
            <View style={styles.entityList}>
              {summary.entity_breakdown.map((ent) => {
                const config = THEME.colors.entities[ent.entity] || THEME.colors.entities.Personal;
                const pct = Math.round((ent.total_amount / total) * 100);

                return (
                  <View key={ent.entity} style={styles.entityRow}>
                    <View style={styles.entityLeft}>
                      <View
                        style={[styles.legendDot, { backgroundColor: config.color }]}
                      />
                      <Text style={styles.entityName}>{ent.entity}</Text>
                    </View>

                    <View style={styles.entityRight}>
                      <Text style={styles.entityAmount}>{formatIDR(ent.total_amount)}</Text>
                      <Text style={styles.entityPct}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Category Breakdown Section */}
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>EXPENSE CATEGORIES</Text>
            <Text style={styles.cardSub}>Progress against monthly target budgets</Text>

            <View style={styles.categoriesList}>
              {summary.category_breakdown.map((cat) => {
                const meta = getCategoryMeta(cat.category);
                const pctOfTotal = Math.round((cat.total_amount / total) * 100);
                const budgetUsage =
                  meta.budget > 0 ? Math.round((cat.total_amount / meta.budget) * 100) : 0;

                return (
                  <View key={cat.category} style={styles.categoryItem}>
                    <View style={styles.catHeader}>
                      <View style={styles.catLeft}>
                        <View
                          style={[
                            styles.catIconCircle,
                            { backgroundColor: `${meta.color}22` },
                          ]}
                        >
                          <Ionicons
                            name={meta.icon as keyof typeof Ionicons.glyphMap}
                            size={14}
                            color={meta.color}
                          />
                        </View>
                        <Text style={styles.catTitle}>{cat.category}</Text>
                      </View>

                      <Text style={styles.catAmount}>{formatIDR(cat.total_amount)}</Text>
                    </View>

                    {/* Volume Style Bar */}
                    <View style={styles.catTrack}>
                      <View
                        style={[
                          styles.catFill,
                          {
                            width: `${Math.min(pctOfTotal, 100)}%`,
                            backgroundColor: meta.color,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.catFooter}>
                      <Text style={styles.catFooterText}>{pctOfTotal}% of total spend</Text>
                      {meta.budget > 0 && (
                        <Text style={styles.catFooterText}>
                          {budgetUsage}% of {formatIDR(meta.budget)} target
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Payment Methods Breakdown */}
          {summary.payment_type_breakdown && summary.payment_type_breakdown.length > 0 && (
            <View style={styles.glassCard}>
              <Text style={styles.cardTitle}>BCA PAYMENT CHANNELS</Text>
              <View style={styles.paymentList}>
                {summary.payment_type_breakdown.map((pm) => (
                  <View key={pm.transaction_type} style={styles.paymentRow}>
                    <View style={styles.paymentLeft}>
                      <Ionicons
                        name={
                          pm.transaction_type.toLowerCase().includes('qris')
                            ? 'qr-code-outline'
                            : pm.transaction_type.toLowerCase().includes('virtual')
                            ? 'phone-portrait-outline'
                            : 'swap-horizontal-outline'
                        }
                        size={16}
                        color={THEME.colors.primary}
                      />
                      <Text style={styles.paymentTitle}>{pm.transaction_type}</Text>
                    </View>
                    <Text style={styles.paymentAmount}>{formatIDR(pm.total_amount)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </AmbientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.xs,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    letterSpacing: -0.4,
  },
  monthSub: {
    fontSize: 13,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 30,
  },
  glassCard: {
    backgroundColor: THEME.colors.surfaceGlass,
    borderRadius: THEME.radius.card,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.colors.text.secondary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: THEME.colors.text.muted,
    marginBottom: 16,
  },
  segmentedBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  entityList: {
    gap: 12,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entityName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  entityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entityAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
  entityPct: {
    fontSize: 13,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  categoriesList: {
    gap: 16,
  },
  categoryItem: {},
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
  catTrack: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: 3,
  },
  catFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  catFooterText: {
    fontSize: 11,
    color: THEME.colors.text.muted,
  },
  paymentList: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderHairline,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
});
