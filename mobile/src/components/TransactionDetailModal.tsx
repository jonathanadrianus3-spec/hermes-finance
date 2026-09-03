import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Transaction, ExpenseEntity } from '../types';
import { formatIDR, getCategoryMeta, EXPENSE_ENTITIES } from '../constants/categories';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
  onUpdateEntity?: (txId: number, entity: ExpenseEntity) => void;
  onSaveEdit?: (txId: number, merchantName: string, amount: number) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  visible,
  onClose,
  onUpdateEntity,
  onSaveEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [amountStr, setAmountStr] = useState('');

  useEffect(() => {
    if (transaction) {
      const raw = transaction.merchant_clean_name || transaction.merchant_name || '';
      setMerchantName(raw.toLowerCase() === 'unknown merchant' ? 'Transfer' : raw);
      setAmountStr(String(Math.round(transaction.amount)));
      setIsEditing(false);
    }
  }, [transaction]);

  if (!transaction) return null;

  const catMeta = getCategoryMeta(transaction.category);

  const handleSave = () => {
    const num = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || transaction.amount;
    const name = merchantName.trim() || 'Transfer';
    if (onSaveEdit) {
      onSaveEdit(transaction.id, name, num);
    }
    setIsEditing(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.glassSheet}>
            {/* Grabber Handle */}
            <View style={styles.grabberWrapper}>
              <View style={styles.grabber} />
            </View>

            {/* Modal Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>BCA Transaction Receipt</Text>
              <View style={styles.headerRightButtons}>
                <TouchableOpacity
                  onPress={() => setIsEditing(!isEditing)}
                  style={styles.editToggleBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isEditing ? 'checkmark' : 'pencil'}
                    size={16}
                    color={THEME.colors.primary}
                  />
                  <Text style={styles.editToggleText}>
                    {isEditing ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={THEME.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Hero Amount & Merchant Section */}
              <View style={styles.heroSection}>
                <View style={styles.statusBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={THEME.colors.appleGreen}
                  />
                  <Text style={styles.statusText}>Payment Successful</Text>
                </View>

                {isEditing ? (
                  <View style={styles.editBox}>
                    <Text style={styles.editInputLabel}>EXPENSE AMOUNT (IDR)</Text>
                    <TextInput
                      style={styles.editAmountInput}
                      value={amountStr}
                      onChangeText={setAmountStr}
                      keyboardType="numeric"
                    />
                    <Text style={styles.editInputSub}>
                      Tip: Enter your net share if split with friends
                    </Text>

                    <Text style={[styles.editInputLabel, { marginTop: 12 }]}>
                      VENDOR / RECIPIENT NAME
                    </Text>
                    <TextInput
                      style={styles.editMerchantInput}
                      value={merchantName}
                      onChangeText={setMerchantName}
                      placeholder="Vendor name or Transfer"
                      placeholderTextColor={THEME.colors.text.muted}
                    />

                    <TouchableOpacity
                      style={styles.saveInlineBtn}
                      activeOpacity={0.7}
                      onPress={handleSave}
                    >
                      <Text style={styles.saveInlineBtnText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.heroAmount}>{formatIDR(transaction.amount)}</Text>
                    <Text style={styles.merchantHeadline}>
                      {transaction.merchant_clean_name && transaction.merchant_clean_name.toLowerCase() !== 'unknown merchant'
                        ? transaction.merchant_clean_name
                        : 'Transfer'}
                    </Text>
                  </>
                )}

                <Text style={styles.timestampText}>{transaction.transaction_date}</Text>
              </View>

              {/* Entity Selector Pills */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>CLASSIFIED ENTITY</Text>
                <View style={styles.entityRow}>
                  {EXPENSE_ENTITIES.map((ent) => {
                    const isSelected = transaction.entity === ent;
                    const config = THEME.colors.entities[ent];
                    return (
                      <TouchableOpacity
                        key={ent}
                        activeOpacity={0.7}
                        onPress={() => onUpdateEntity && onUpdateEntity(transaction.id, ent)}
                        style={[
                          styles.entityButton,
                          {
                            backgroundColor: isSelected ? config.bg : THEME.colors.surfaceSliderTrack,
                            borderColor: isSelected ? config.color : THEME.colors.borderGlass,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.entityButtonText,
                            { color: isSelected ? config.color : THEME.colors.text.secondary },
                          ]}
                        >
                          {ent}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Inset Details Card */}
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Payment Type</Text>
                  <Text style={styles.detailValue}>{transaction.transaction_type}</Text>
                </View>
                <View style={styles.rowDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Category</Text>
                  <View style={styles.catValueRow}>
                    <Ionicons
                      name={catMeta.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={catMeta.color}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.detailValue}>{transaction.category}</Text>
                  </View>
                </View>
                <View style={styles.rowDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Source of Fund</Text>
                  <Text style={styles.detailValue}>
                    {transaction.source_of_fund || 'myBCA'}
                  </Text>
                </View>
                <View style={styles.rowDivider} />

                {transaction.reference_no ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Reference No</Text>
                    <Text
                      style={[styles.detailValue, styles.monoText]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {transaction.reference_no}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Done button */}
              <TouchableOpacity
                style={styles.doneButton}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 10, 0.85)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  glassSheet: {
    backgroundColor: 'rgba(26, 18, 48, 0.96)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    overflow: 'hidden',
  },
  grabberWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(208, 188, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderHairline,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.appleGreen,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  merchantHeadline: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  timestampText: {
    fontSize: 13,
    color: THEME.colors.text.secondary,
    marginTop: 4,
  },
  editBox: {
    width: '100%',
    backgroundColor: 'rgba(18, 12, 34, 0.85)',
    padding: 14,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    marginBottom: 10,
  },
  editInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.text.secondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  editAmountInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderHairline,
  },
  editInputSub: {
    fontSize: 11,
    color: THEME.colors.text.muted,
    marginTop: 3,
    fontStyle: 'italic',
  },
  editMerchantInput: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderHairline,
  },
  saveInlineBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    alignItems: 'center',
    marginTop: 12,
  },
  saveInlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#160F2B',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.colors.text.secondary,
    marginBottom: 10,
  },
  entityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  entityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  entityButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: 'rgba(20, 14, 38, 0.65)',
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.borderHairline,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  detailKey: {
    fontSize: 13,
    color: THEME.colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  catValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.borderHairline,
  },
  doneButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.radius.pill,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#160F2B',
  },
});
