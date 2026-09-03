import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  isOffline?: boolean;
  isSyncing?: boolean;
  onSyncPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Hermes',
  subtitle,
  isOffline = false,
  isSyncing = false,
  onSyncPress,
}) => {
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }} />
        {/* Minimalist Android 17 Sync / Status Action Pill */}
        {onSyncPress && (
          <TouchableOpacity
            style={styles.syncGlassPill}
            onPress={onSyncPress}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={THEME.colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={isOffline ? 'cloud-offline-outline' : 'sparkles'}
                  size={12}
                  color={THEME.colors.primary}
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.syncPillText}>
                  {isOffline ? 'Offline' : 'Sync BCA'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xs,
    paddingBottom: THEME.spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.text.secondary,
    letterSpacing: 0.2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.surfaceGlass,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    letterSpacing: -0.5,
  },
  syncGlassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceGlassElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  syncPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
