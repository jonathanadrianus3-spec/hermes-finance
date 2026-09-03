import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Transaction, ExpenseEntity } from '../types';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { AmbientBackground } from '../components/AmbientBackground';
import { HermesApi } from '../services/api';

const FILTER_ENTITIES = ['All', 'Personal', 'Family', 'Community', 'Professional'];

export const TransactionsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchTxs = useCallback(async () => {
    const list = await HermesApi.getTransactions({
      search: search || undefined,
      entity: selectedFilter !== 'All' ? selectedFilter : undefined,
    });
    setTransactions(list);
    setLoading(false);
  }, [search, selectedFilter]);

  useEffect(() => {
    fetchTxs();
  }, [fetchTxs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTxs();
    setRefreshing(false);
  };

  const handleTxPress = (tx: Transaction) => {
    setSelectedTx(tx);
    setModalVisible(true);
  };

  const handleUpdateEntity = async (txId: number, entity: ExpenseEntity) => {
    if (!selectedTx) return;
    await HermesApi.reviewTransaction(txId, selectedTx.category, entity, selectedTx.notes);
    setSelectedTx({ ...selectedTx, entity });
    await fetchTxs();
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
    await fetchTxs();
  };

  return (
    <AmbientBackground>
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Transactions</Text>
        </View>

        {/* Android 17 Glass Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={THEME.colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search merchant, reference, or notes..."
              placeholderTextColor={THEME.colors.text.muted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={THEME.colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_ENTITIES.map((ent) => {
            const isSelected = selectedFilter === ent;
            const entityColor =
              ent !== 'All'
                ? THEME.colors.entities[ent as ExpenseEntity]?.color || THEME.colors.primary
                : THEME.colors.primary;

            return (
              <TouchableOpacity
                key={ent}
                activeOpacity={0.7}
                onPress={() => setSelectedFilter(ent)}
                style={[
                  styles.filterChip,
                  isSelected && {
                    backgroundColor: `${entityColor}25`,
                    borderColor: entityColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected && { color: entityColor, fontWeight: '700' },
                  ]}
                >
                  {ent}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Transaction List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.primary}
            />
          }
        >
          {loading ? (
            <ActivityIndicator color={THEME.colors.primary} style={{ marginTop: 40 }} />
          ) : transactions.length > 0 ? (
            <View style={styles.groupedCard}>
              {transactions.map((item, index) => (
                <TransactionItem
                  key={item.id || index}
                  item={item}
                  onPress={handleTxPress}
                  showDivider={index < transactions.length - 1}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={THEME.colors.text.muted} />
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'Try adjusting your search keywords.'
                  : 'Transactions from BCA emails will appear here.'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Transaction Receipt Modal */}
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
  searchContainer: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.xs,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceGlass,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.text.primary,
    fontSize: 14,
  },
  filterScrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    gap: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text.secondary,
    includeFontPadding: false,
  },
  listContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 2,
    paddingBottom: 36,
  },
  groupedCard: {
    backgroundColor: THEME.colors.surfaceGlass,
    borderRadius: THEME.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginTop: 14,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.text.muted,
    textAlign: 'center',
  },
});
