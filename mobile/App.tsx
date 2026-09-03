import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Platform,
  LogBox,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './src/constants/theme';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

// Suppress console warning overlays so they never block touch events on mobile
LogBox.ignoreAllLogs(true);

type TabName = 'Dashboard' | 'Review' | 'Transactions' | 'Analytics' | 'Settings';

interface TabConfig {
  name: TabName;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  {
    name: 'Dashboard',
    label: 'Home',
    iconActive: 'wallet',
    iconInactive: 'wallet-outline',
  },
  {
    name: 'Review',
    label: 'Review',
    iconActive: 'checkmark-circle',
    iconInactive: 'checkmark-circle-outline',
  },
  {
    name: 'Transactions',
    label: 'Activity',
    iconActive: 'receipt',
    iconInactive: 'receipt-outline',
  },
  {
    name: 'Analytics',
    label: 'Analytics',
    iconActive: 'pie-chart',
    iconInactive: 'pie-chart-outline',
  },
  {
    name: 'Settings',
    label: 'Settings',
    iconActive: 'settings',
    iconInactive: 'settings-outline',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <DashboardScreen
            onNavigateToReview={() => setActiveTab('Review')}
            onNavigateToTransactions={() => setActiveTab('Transactions')}
          />
        );
      case 'Review':
        return <ReviewScreen />;
      case 'Transactions':
        return <TransactionsScreen />;
      case 'Analytics':
        return <AnalyticsScreen />;
      case 'Settings':
        return <SettingsScreen />;
      default:
        return (
          <DashboardScreen
            onNavigateToReview={() => setActiveTab('Review')}
            onNavigateToTransactions={() => setActiveTab('Transactions')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />

        {/* Active Screen */}
        <View style={styles.screenContainer}>{renderScreen()}</View>

        {/* Android 17 Floating Frosted Glass Dock Pill */}
        <View style={styles.dockWrapper}>
          <View style={styles.glassDock}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              return (
                <TouchableOpacity
                  key={tab.name}
                  activeOpacity={0.65}
                  onPress={() => setActiveTab(tab.name)}
                  style={styles.dockItem}
                  hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
                >
                  <View
                    style={[
                      styles.dockIconPill,
                      isActive && styles.dockIconPillActive,
                    ]}
                  >
                    <Ionicons
                      name={isActive ? tab.iconActive : tab.iconInactive}
                      size={20}
                      color={isActive ? '#160F2B' : THEME.colors.text.secondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.dockLabel,
                      {
                        color: isActive
                          ? THEME.colors.primary
                          : THEME.colors.text.muted,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  dockWrapper: {
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderHairline,
  },
  // Floating capsule dock matching Android 17 bottom search pill
  glassDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(32, 23, 56, 0.90)',
    borderRadius: THEME.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  dockIconPill: {
    width: 54,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    overflow: 'hidden',
  },
  dockIconPillActive: {
    backgroundColor: THEME.colors.primary, // Radiant lavender active indicator
    borderRadius: 15,
    overflow: 'hidden',
  },
  dockLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
