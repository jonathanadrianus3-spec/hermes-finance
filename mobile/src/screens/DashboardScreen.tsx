import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Header } from '../components/Header';
import { AppleWalletCard } from '../components/AppleWalletCard';
import { EntityPillsRow } from '../components/EntityPillsRow';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { AmbientBackground } from '../components/AmbientBackground';
import { HermesApi } from '../services/api';
import { DashboardData, Transaction, ExpenseEntity } from '../types';

interface DashboardScreenProps {
  onNavigateToReview: () => void;
  onNavigateToTransactions: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateToReview,
  onNavigateToTransactions,
}) => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    const res = await HermesApi.getDashboard();
    setDashboard(res.data);
    setIsOffline(res.isOffline);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSyncPress = async () => {
    setSyncing(true);
    const result = await HermesApi.triggerGmailSync();
    setSyncing(false);
    await loadData();

    if (result.success) {
      Alert.alert(
        'Gmail Ingestion Complete',
        `Scanned ${result.scanned} emails, imported ${result.imported} new BCA transactions.`
      );
    } else {
      Alert.alert(
        'Sync Notice',
        result.message || 'Connecting to Gmail via Hermes backend...'
      );
    }
  };

  const handleTxPress = (tx: Transaction) => {
    setSelectedTx(tx);
    setModalVisible(true);
  };

  const handleUpdateEntity = async (txId: number, entity: ExpenseEntity) => {
    if (!selectedTx) return;
    await HermesApi.reviewTransaction(txId, selectedTx.category, entity, selectedTx.notes);
    setSelectedTx({ ...selectedTx, entity });
    await loadData();
  };

  const handleSaveEdit = async (txId: number, merchantName: string, amount: number) => {
    if (!selectedTx) return;
    await HermesApi.updateTransaction(txId, {
      merchant_name: merchantName,
      amount: amount,
    });
    setSelectedTx({
      ...selectedTx,
      merchant_name: merchantName,
      merchant_clean_name: merchantName,
      amount,
    });
    await loadData();
  };

  if (!dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Hermes Finance...</Text>
      </View>
    );
  }

  const { summary, pending_review_count, recent_transactions } = dashboard;

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <Header
          isOffline={isOffline}
          isSyncing={syncing}
          onSyncPress={handleSyncPress}
        />

        <ScrollView
          style={styles.scroll}
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
          {/* Android 17 Liquid Glass Hero Card */}
          <AppleWalletCard
            totalSpent={summary.total_spent}
            dailyVelocity={summary.daily_velocity}
            momChangePct={summary.mom_change_pct}
            monthName="September 2026"
          />

          {/* Pending Review Alert Banner */}
          {pending_review_count > 0 && (
            <TouchableOpacity
              style={styles.reviewBanner}
              activeOpacity={0.75}
              onPress={onNavigateToReview}
            >
              <View style={styles.reviewBannerLeft}>
                <View style={styles.reviewBadgeIcon}>
                  <Ionicons name="sparkles" size={16} color="#160F2B" />
                </View>
                <View>
                  <Text style={styles.reviewBannerTitle}>
                    {pending_review_count} BCA expense{pending_review_count > 1 ? 's' : ''} to review
                  </Text>
                  <Text style={styles.reviewBannerSub}>
                    Tap to classify into Personal, Family, Community, or Work
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={THEME.colors.text.secondary} />
            </TouchableOpacity>
          )}

          {/* Entity Distribution Row */}
          <EntityPillsRow
            entities={summary.entity_breakdown}
            totalSpent={summary.total_spent}
            onSelectEntity={() => onNavigateToTransactions()}
          />

          {/* Recent Transactions Section */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECENT BCA ACTIVITY</Text>
              <TouchableOpacity onPress={onNavigateToTransactions} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.insetGroupedCard}>
              {recent_transactions && recent_transactions.length > 0 ? (
                recent_transactions.map((item, index) => (
                  <TransactionItem
                    key={item.id || index}
                    item={item}
                    onPress={handleTxPress}
                    showDivider={index < recent_transactions.length - 1}
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No recent transactions yet.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Transaction Detail Sheet Modal */}
        <TransactionDetailModal
          transaction={selectedTx}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onUpdateEntity={handleUpdateEntity}
          onSaveEdit={handleSaveEdit}
        />
      </View>
    </AmbientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090614',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: THEME.colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.sm,
    backgroundColor: THEME.colors.surfaceGlassElevated,
    padding: 16,
    borderRadius: THEME.radius.card,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  reviewBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  reviewBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
  reviewBannerSub: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    marginTop: 2,
  },
  transactionsSection: {
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.colors.text.secondary,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  insetGroupedCard: {
    backgroundColor: THEME.colors.surfaceGlass,
    borderRadius: THEME.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.text.muted,
    fontSize: 14,
  },
});
