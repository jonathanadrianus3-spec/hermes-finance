import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { HermesApi, DEFAULT_SERVER_URL } from '../services/api';
import { AmbientBackground } from '../components/AmbientBackground';
import {
  scheduleDailyReviewNotification,
  cancelDailyReviewNotification,
  sendImmediateTestNotification,
} from '../services/notifications';

export const SettingsScreen: React.FC = () => {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [reviewReminderEnabled, setReviewReminderEnabled] = useState(true);
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [savingGmail, setSavingGmail] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    HermesApi.getServerUrl().then(setServerUrl);
    scheduleDailyReviewNotification(21, 0);
  }, []);

  const handleSaveUrl = async () => {
    await HermesApi.setServerUrl(serverUrl);
    Alert.alert('Saved', 'Server connection URL updated successfully.');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await HermesApi.fetchWithTimeout(`${serverUrl}/api/health`, {}, 4000);
      if (res.ok) {
        const json = await res.json();
        Alert.alert('Connected! ⚡', `Hermes Backend is online (${json.service}).`);
      } else {
        Alert.alert('Connection Warning', `Server responded with status ${res.status}.`);
      }
    } catch {
      Alert.alert(
        'Connection Failed',
        `Could not reach ${serverUrl}. Make sure your phone and PC are on the same Wi-Fi network.`
      );
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAndSyncGmail = async () => {
    if (!gmailUser.trim() || !gmailPassword.trim()) {
      Alert.alert('Missing Input', 'Please enter your Gmail address and 16-character App Password.');
      return;
    }
    setSavingGmail(true);
    const res = await HermesApi.configureGmail(gmailUser, gmailPassword);
    setSavingGmail(false);
    if (res.success) {
      Alert.alert(
        'Gmail Connected! ⚡',
        `Scanned ${res.scanned} emails, imported ${res.imported} BCA transactions.`
      );
    } else {
      Alert.alert('Gmail Sync Failed', res.message || 'Check your Gmail App Password.');
    }
  };

  const handleGmailSync = async () => {
    setSyncingGmail(true);
    const res = await HermesApi.triggerGmailSync();
    setSyncingGmail(false);
    if (res.success) {
      Alert.alert(
        'Gmail Ingestion Successful',
        `Scanned ${res.scanned} BCA emails, imported ${res.imported} new transactions.`
      );
    } else {
      Alert.alert('Gmail Sync', res.message || 'Check backend EMAIL_USER & EMAIL_PASSWORD settings.');
    }
  };

  const handleToggleReminder = async (val: boolean) => {
    setReviewReminderEnabled(val);
    if (val) {
      const ok = await scheduleDailyReviewNotification(21, 0);
      if (ok) {
        Alert.alert('Scheduled', 'Hermes will remind you at 21:00 every evening to review today\'s spending.');
      }
    } else {
      await cancelDailyReviewNotification();
    }
  };

  const handleTestNotification = async () => {
    const sent = await sendImmediateTestNotification();
    if (sent) {
      console.log('Test review notification triggered.');
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    const res = await HermesApi.seedSampleData();
    setSeeding(false);
    Alert.alert('Success', res.message || 'Realistic sample data loaded!');
  };

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Server Connection */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>HERMES SERVER CONNECTION</Text>
            <View style={styles.glassCard}>
              <View style={styles.inputRow}>
                <Ionicons name="server-outline" size={18} color={THEME.colors.primary} />
                <TextInput
                  style={styles.urlInput}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://192.168.x.x:8000"
                  placeholderTextColor={THEME.colors.text.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.7}
                  onPress={handleSaveUrl}
                >
                  <Text style={styles.secondaryBtnText}>Save URL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.7}
                  onPress={handleTestConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <ActivityIndicator size="small" color="#160F2B" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Test Connection</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section 2: Gmail BCA Ingestion */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>GMAIL BCA SYNC ENGINE</Text>
            <View style={styles.glassCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="mail-outline" size={20} color={THEME.colors.primary} />
                  <View>
                    <Text style={styles.infoTitle}>Connect Your Gmail Account</Text>
                    <Text style={styles.infoSub}>Requires a 16-character Google App Password</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.inputRow}>
                <Ionicons name="at-outline" size={18} color={THEME.colors.primary} />
                <TextInput
                  style={styles.urlInput}
                  value={gmailUser}
                  onChangeText={setGmailUser}
                  placeholder="your.email@gmail.com"
                  placeholderTextColor={THEME.colors.text.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.inputRow}>
                <Ionicons name="key-outline" size={18} color={THEME.colors.primary} />
                <TextInput
                  style={styles.urlInput}
                  value={gmailPassword}
                  onChangeText={setGmailPassword}
                  placeholder="16-character Google App Password"
                  placeholderTextColor={THEME.colors.text.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={true}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.7}
                  onPress={handleSaveAndSyncGmail}
                  disabled={savingGmail}
                >
                  {savingGmail ? (
                    <ActivityIndicator size="small" color="#160F2B" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Save & Ingest BCA Emails</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section 3: 21:00 Review Reminder */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DAILY EVENING REVIEW NOTIFICATIONS</Text>
            <View style={styles.glassCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Ionicons name="moon-outline" size={20} color={THEME.colors.primary} />
                  <View>
                    <Text style={styles.infoTitle}>21:00 Evening Review</Text>
                    <Text style={styles.infoSub}>Daily prompt to classify unreviewed expenses</Text>
                  </View>
                </View>
                <Switch
                  value={reviewReminderEnabled}
                  onValueChange={handleToggleReminder}
                  trackColor={{ false: THEME.colors.surfaceSliderTrack, true: THEME.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.7}
                onPress={handleTestNotification}
              >
                <Text style={styles.actionText}>Send Test Notification</Text>
                <Ionicons name="notifications-outline" size={16} color={THEME.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 4: Demo Data & Reset */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DEMO & UTILITIES</Text>
            <View style={styles.glassCard}>
              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.7}
                onPress={handleSeedData}
                disabled={seeding}
              >
                <Text style={styles.actionText}>Reset / Seed Demo BCA Transactions</Text>
                {seeding ? (
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                ) : (
                  <Ionicons name="cube-outline" size={16} color={THEME.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Hermes Finance for Android</Text>
            <Text style={styles.footerSub}>Android 17 Liquid Glass Edition</Text>
            <Text style={styles.footerSub}>Personal • Family • Community • Professional</Text>
          </View>
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
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.colors.text.secondary,
    marginBottom: 8,
  },
  glassCard: {
    backgroundColor: THEME.colors.surfaceGlass,
    borderRadius: THEME.radius.card,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  urlInput: {
    flex: 1,
    color: THEME.colors.text.primary,
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.borderHairline,
    marginLeft: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfacePill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderHairline,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#160F2B',
  },
  infoRow: {
    padding: 16,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  infoSub: {
    fontSize: 12,
    color: THEME.colors.text.secondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text.secondary,
  },
  footerSub: {
    fontSize: 11,
    color: THEME.colors.text.muted,
  },
});
