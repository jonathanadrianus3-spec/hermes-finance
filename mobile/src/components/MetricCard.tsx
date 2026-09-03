import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  trendText?: string;
  trendPositive?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  iconName = 'wallet-outline',
  accentColor = THEME.colors.primary,
  trendText,
  trendPositive,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.iconWrapper, { backgroundColor: `${accentColor}1A` }]}>
          <Ionicons name={iconName} size={16} color={accentColor} />
        </View>
      </View>

      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>

      <View style={styles.footerRow}>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {trendText && (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: trendPositive
                  ? 'rgba(255, 69, 58, 0.18)'
                  : 'rgba(48, 209, 88, 0.18)',
              },
            ]}
          >
            <Ionicons
              name={trendPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={trendPositive ? THEME.colors.appleRed : THEME.colors.appleGreen}
            />
            <Text
              style={[
                styles.trendText,
                { color: trendPositive ? THEME.colors.appleRed : THEME.colors.appleGreen },
              ]}
            >
              {trendText}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceGlass,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text.secondary,
    letterSpacing: 0.2,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: THEME.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.text.muted,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radius.pill,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
