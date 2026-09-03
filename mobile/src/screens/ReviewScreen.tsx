import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Transaction, ExpenseEntity } from '../types';
import { AmbientBackground } from '../components/AmbientBackground';
import { HermesApi } from '../services/api';
import { formatIDR, EXPENSE_ENTITIES, CATEGORIES_DATA } from '../constants/categories';

export const ReviewScreen: React.FC = () => {
  const [pendingList, setPendingList] = useState<Transaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<ExpenseEntity>('Personal');
  const [selectedCategory, setSelectedCategory] = useState<string>('Food & Dining');
  const [merchantName, setMerchantName] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const applyTxToState = (tx: Transaction) => {
    setSelectedEntity(tx.entity || 'Personal');
    setSelectedCategory(tx.category || 'Food & Dining');
    const rawName = tx.merchant_clean_name || tx.merchant_name || '';
    setMerchantName(rawName.toLowerCase() === 'unknown merchant' ? 'Transfer' : rawName);
    setAmountStr(String(Math.round(tx.amount)));
    setNotes(tx.notes || '');
  };

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const items = await HermesApi.getPendingReviews();
    setPendingList(items);
    if (items.length > 0) {
      setCurrentIndex(0);
      applyTxToState(items[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const currentTx: Transaction | undefined = pendingList[currentIndex];

  const handleEntityChange = (ent: ExpenseEntity) => {
    setSelectedEntity(ent);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
  };

  const handleApprove = async () => {
    if (!currentTx) return;
    setSaving(true);
    const parsedAmount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || currentTx.amount;
    const finalMerchant = merchantName.trim() || 'Transfer';

    await HermesApi.reviewTransaction(
      currentTx.id,
      selectedCategory,
      selectedEntity,
      notes,
      finalMerchant,
      parsedAmount
    );
    setSaving(false);

    // Remove from queue
    const nextList = pendingList.filter((_, idx) => idx !== currentIndex);
    setPendingList(nextList);

    if (nextList.length > 0) {
      const nextIdx = Math.min(currentIndex, nextList.length - 1);
      setCurrentIndex(nextIdx);
      applyTxToState(nextList[nextIdx]);
    }
  };

  if (loading) {
    return (
      <AmbientBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingSub}>Fetching unreviewed BCA transactions...</Text>
        </View>
      </AmbientBackground>
    );
  }

  // All caught up state
  if (!currentTx || pendingList.length === 0) {
    return (
      <AmbientBackground>
        <View style={styles.allCaughtUpContainer}>
          <View style={styles.trophyCircle}>
            <Ionicons name="checkmark-done" size={44} color={THEME.colors.primary} />
          </View>
          <Text style={styles.allCaughtUpTitle}>All Caught Up!</Text>
          <Text style={styles.allCaughtUpSub}>
            You have reviewed and categorized all BCA transactions. Your daily review reminder is scheduled for 21:00.
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            activeOpacity={0.7}
            onPress={fetchPending}
          >
            <Ionicons name="refresh" size={15} color="#160F2B" style={{ marginRight: 6 }} />
            <Text style={styles.refreshButtonText}>Check for New Emails</Text>
          </TouchableOpacity>
        </View>
      </AmbientBackground>
    );
  }

  const categoryKeys = Object.keys(CATEGORIES_DATA);

  return (
    <AmbientBackground>
      <View style={styles.container}>
        {/* Top Header & Progress */}
        <View style={styles.headerArea}>
          <View style={styles.headerTop}>
            <Text style={styles.screenTitle}>Daily Review</Text>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {currentIndex + 1} of {pendingList.length}
              </Text>
            </View>
          </View>

          {/* Android 17 Pill Slider Track */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${((currentIndex + 1) / pendingList.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Review Card with Editable Amount and Vendor */}
          <View style={styles.reviewCard}>
            <View style={styles.receiptTopRow}>
              <View style={styles.bcaTag}>
                <Text style={styles.bcaTagText}>BCA EMAIL DETECTED</Text>
              </View>
              <Text style={styles.txDate}>{currentTx.transaction_date}</Text>
            </View>

            {/* Editable Amount Section (for friend splits) */}
            <View style={styles.editableFieldContainer}>
              <Text style={styles.fieldLabel}>EXPENSE AMOUNT (TAP TO EDIT SHARE)</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>IDR</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountStr}
                  onChangeText={setAmountStr}
                  keyboardType="numeric"
                  placeholderTextColor={THEME.colors.text.muted}
                />
                <Ionicons name="pencil" size={14} color={THEME.colors.primary} />
              </View>
              <Text style={styles.fieldHint}>
                If you split this bill with friends, enter only your net share.
              </Text>
            </View>

            {/* Editable Vendor / Merchant Name */}
            <View style={styles.editableFieldContainer}>
              <Text style={styles.fieldLabel}>VENDOR / RECIPIENT NAME</Text>
              <View style={styles.merchantInputRow}>
                <Ionicons name="storefront-outline" size={16} color={THEME.colors.primary} />
                <TextInput
                  style={styles.merchantInput}
                  value={merchantName}
                  onChangeText={setMerchantName}
                  placeholder="e.g. Starbucks, Transfer, Gym..."
                  placeholderTextColor={THEME.colors.text.muted}
                />
                <Ionicons name="pencil" size={14} color={THEME.colors.primary} />
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="card-outline" size={13} color={THEME.colors.primary} />
                <Text style={styles.metaText}>{currentTx.transaction_type}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="wallet-outline" size={13} color={THEME.colors.primary} />
                <Text style={styles.metaText}>{currentTx.source_of_fund || 'Tahapan'}</Text>
              </View>
            </View>
          </View>

          {/* Section 1: Choose Entity */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ASSIGN TO ENTITY</Text>
            <View style={styles.entityGrid}>
              {EXPENSE_ENTITIES.map((ent) => {
                const isSelected = selectedEntity === ent;
                const config = THEME.colors.entities[ent];
                return (
                  <TouchableOpacity
                    key={ent}
                    activeOpacity={0.75}
                    onPress={() => handleEntityChange(ent)}
                    style={[
                      styles.entityButton,
                      {
                        backgroundColor: isSelected ? config.bg : THEME.colors.surfaceGlass,
                        borderColor: isSelected ? config.color : THEME.colors.borderGlass,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.entityDot,
                        { backgroundColor: isSelected ? config.color : THEME.colors.text.muted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.entityButtonText,
                        { color: isSelected ? config.color : THEME.colors.text.primary },
                      ]}
                    >
                      {ent}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 2: Choose Category */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>EXPENSE CATEGORY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScrollView}
              contentContainerStyle={styles.categoryScroll}
            >
              {categoryKeys.map((cat) => {
                const meta = CATEGORIES_DATA[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.7}
                    onPress={() => handleCategoryChange(cat)}
                    style={[
                      styles.catChip,
                      isSelected && {
                        backgroundColor: `${meta.color}25`,
                        borderColor: meta.color,
                      },
                    ]}
                  >
                    <Ionicons
                      name={meta.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={isSelected ? meta.color : THEME.colors.text.secondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.catChipText,
                        isSelected && { color: meta.color, fontWeight: '700' },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Section 3: Optional Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>NOTES / PURPOSE (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Lunch with team, monthly groceries, AWS invoice..."
              placeholderTextColor={THEME.colors.text.muted}
            />
          </View>

          {/* Approve Button */}
          <TouchableOpacity
            style={styles.approveButton}
            activeOpacity={0.8}
            onPress={handleApprove}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#160F2B" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#160F2B" style={{ marginRight: 8 }} />
                <Text style={styles.approveButtonText}>Confirm & Approve</Text>
              </>
            )}
          </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingSub: {
    color: THEME.colors.text.secondary,
    marginTop: 12,
    fontSize: 14,
  },
  headerArea: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    letterSpacing: -0.4,
  },
  counterBadge: {
    backgroundColor: THEME.colors.surfacePill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderHairline,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: THEME.colors.surfaceSliderTrack,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: THEME.colors.borderHairline,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 30,
  },
  reviewCard: {
    backgroundColor: THEME.colors.surfaceGlassElevated,
    borderRadius: THEME.radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    marginBottom: 20,
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  receiptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bcaTag: {
    backgroundColor: 'rgba(208, 188, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.sm,
  },
  bcaTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.6,
  },
  txDate: {
    fontSize: 12,
    color: THEME.colors.text.secondary,
  },
  editableFieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: THEME.colors.text.secondary,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 14, 38, 0.75)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    padding: 0,
  },
  fieldHint: {
    fontSize: 11,
    color: THEME.colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  merchantInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 14, 38, 0.75)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    gap: 8,
  },
  merchantInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    padding: 0,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderHairline,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: THEME.colors.text.secondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.colors.text.secondary,
    marginBottom: 10,
  },
  entityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  entityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
  },
  entityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  entityButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryScrollView: {
    flexGrow: 0,
  },
  categoryScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  catChipText: {
    fontSize: 13,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    includeFontPadding: false,
  },
  notesInput: {
    backgroundColor: THEME.colors.surfaceGlass,
    borderRadius: THEME.radius.md,
    padding: 14,
    color: THEME.colors.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 16,
    borderRadius: THEME.radius.pill,
    marginTop: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#160F2B',
  },
  allCaughtUpContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  trophyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(208, 188, 255, 0.16)',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  allCaughtUpTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    marginBottom: 8,
  },
  allCaughtUpSub: {
    fontSize: 14,
    color: THEME.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: THEME.radius.pill,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#160F2B',
  },
});
