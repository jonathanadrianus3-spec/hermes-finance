import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { formatIDR } from '../constants/categories';

interface LiquidGlassCardProps {
  totalSpent: number;
  dailyVelocity: number;
  momChangePct: number;
  monthName?: string;
  onPress?: () => void;
}

export const AppleWalletCard: React.FC<LiquidGlassCardProps> = ({
  totalSpent,
  dailyVelocity,
  momChangePct,
  monthName = 'September 2026',
  onPress,
}) => {
  const isSpendingReduced = momChangePct < 0;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.cardContainer}
    >
      <View style={styles.glassSurface}>
        {/* Top bar with Month-to-date Label & Month Badge */}
        <View style={styles.cardTop}>
          <Text style={styles.balanceLabel}>MONTH-TO-DATE SPENDING</Text>
          <View style={styles.monthBadge}>
            <Text style={styles.monthText}>{monthName}</Text>
          </View>
        </View>

        {/* Hero Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceAmount}>{formatIDR(totalSpent)}</Text>
        </View>

        {/* Android 17 Volume-Slider Style Daily Burn Rate Bar */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Daily Burn Rate</Text>
            <Text style={styles.sliderVal}>{formatIDR(dailyVelocity)}/day</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={styles.sliderFill}>
              <View style={styles.sliderThumb} />
            </View>
          </View>
        </View>

        {/* Bottom Trend Badge */}
        <View style={styles.cardBottom}>
          <View style={styles.trendBadge}>
            <Ionicons
              name={isSpendingReduced ? 'trending-down' : 'trending-up'}
              size={13}
              color={THEME.colors.primary}
            />
            <Text style={styles.trendText}>
              {Math.abs(momChangePct)}% vs last mo
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  glassSurface: {
    backgroundColor: THEME.colors.surfaceGlassElevated,
    borderRadius: THEME.radius.card,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chipGraphic: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(208, 188, 255, 0.18)',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardType: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    letterSpacing: 0.2,
  },
  cardSub: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
  },
  monthBadge: {
    backgroundColor: THEME.colors.surfacePill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 0.5,
    borderColor: THEME.colors.borderHairline,
  },
  monthText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  balanceSection: {
    marginVertical: 4,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: THEME.colors.text.secondary,
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  // Android 17 Volume Slider Bar Style
  sliderContainer: {
    marginTop: 18,
    backgroundColor: THEME.colors.surfaceSliderTrack,
    borderRadius: 16,
    padding: 12,
    borderWidth: 0.5,
    borderColor: THEME.colors.borderHairline,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text.secondary,
  },
  sliderVal: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  sliderTrack: {
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sliderFill: {
    width: '65%',
    height: '100%',
    backgroundColor: THEME.colors.accentTrack,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 2,
  },
  sliderThumb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  securityText: {
    fontSize: 11,
    color: THEME.colors.text.muted,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    backgroundColor: 'rgba(208, 188, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.20)',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
