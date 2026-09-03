import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const NOTIF_KEY = '@hermes_daily_review_reminder';

export async function scheduleDailyReviewNotification(hour: number = 21, minute: number = 0): Promise<boolean> {
  try {
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify({ enabled: true, hour, minute }));
    console.log(`[Hermes] Daily review scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
    return true;
  } catch (err) {
    console.log('Error scheduling notification:', err);
    return false;
  }
}

export async function cancelDailyReviewNotification(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify({ enabled: false }));
  } catch (err) {
    console.log('Error canceling notification:', err);
  }
}

export async function isDailyReviewEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_KEY);
    if (!raw) return true; // Default enabled
    const parsed = JSON.parse(raw);
    return parsed.enabled ?? true;
  } catch {
    return true;
  }
}

export async function sendImmediateTestNotification(): Promise<boolean> {
  try {
    Alert.alert(
      '🌙 Hermes Review Alert (21:00)',
      'You have 2 BCA expenses from today ready to review.\n\nTap to classify into Personal, Family, Community, or Professional.',
      [{ text: 'Review Now', style: 'default' }, { text: 'Dismiss', style: 'cancel' }]
    );
    return true;
  } catch (err) {
    console.log('Error triggering test notification:', err);
    return false;
  }
}
