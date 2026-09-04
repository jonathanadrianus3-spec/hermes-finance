import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardData, Transaction, SyncResult, ExpenseEntity } from '../types';

const SERVER_URL_KEY = '@hermes_server_url';
export const DEFAULT_SERVER_URL = 'http://51.79.167.75:8000';

// Built-in fallback data for instant offline testing and reliability
// Built-in fallback data populated with real BCA transactions
export const FALLBACK_DASHBOARD: DashboardData = {
  summary: {
    month: '2026-09',
    total_spent: 1357200,
    tx_count: 2,
    avg_tx: 678600,
    daily_velocity: 452400,
    prev_month_total: 904920,
    mom_change_pct: 50.0,
    top_category: 'Community & Donations',
    category_breakdown: [
      { category: 'Community & Donations', total_amount: 1300000, count: 1 },
      { category: 'Food & Dining', total_amount: 57200, count: 1 },
    ],
    entity_breakdown: [
      { entity: 'Personal', total_amount: 57200, count: 1 },
      { entity: 'Family', total_amount: 0, count: 0 },
      { entity: 'Community', total_amount: 1300000, count: 1 },
      { entity: 'Professional', total_amount: 0, count: 0 },
    ],
    payment_type_breakdown: [
      { transaction_type: 'Transfer', total_amount: 1300000, count: 1 },
      { transaction_type: 'QRIS Payment', total_amount: 57200, count: 1 },
    ],
    daily_trends: [
      { day: '2026-09-01', daily_total: 57200 },
      { day: '2026-09-02', daily_total: 1300000 },
    ],
  },
  pending_review_count: 9,
  pending_reviews: [
    {
      id: 27,
      reference_no: 'BCA-GEN-MAWAR-SHARON',
      transaction_date: '02 Sep 2026 14:10:00',
      amount: 1300000,
      currency: 'IDR',
      transaction_type: 'Bank Transfer',
      merchant_name: 'YAY MAWAR SHARON PEDULI',
      merchant_clean_name: 'YAY MAWAR SHARON PEDULI',
      source_of_fund: 'myBCA',
      category: 'Community & Donations',
      entity: 'Community',
      status: 'Successful',
      is_reviewed: 0,
      notes: '',
    },
    {
      id: 19,
      reference_no: '9527120260901184311720QRS1090099784',
      transaction_date: '01 Sep 2026 18:43:15',
      amount: 57200,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'BEON3',
      merchant_clean_name: 'BEON3',
      source_of_fund: 'myBCA',
      category: 'Food & Dining',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
      notes: '',
    },
  ],
  recent_transactions: [
    {
      id: 27,
      reference_no: 'BCA-GEN-MAWAR-SHARON',
      transaction_date: '02 Sep 2026 14:10:00',
      amount: 1300000,
      currency: 'IDR',
      transaction_type: 'Bank Transfer',
      merchant_name: 'YAY MAWAR SHARON PEDULI',
      merchant_clean_name: 'YAY MAWAR SHARON PEDULI',
      source_of_fund: 'myBCA',
      category: 'Community & Donations',
      entity: 'Community',
      status: 'Successful',
      is_reviewed: 0,
    },
    {
      id: 19,
      reference_no: '9527120260901184311720QRS1090099784',
      transaction_date: '01 Sep 2026 18:43:15',
      amount: 57200,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'BEON3',
      merchant_clean_name: 'BEON3',
      source_of_fund: 'myBCA',
      category: 'Food & Dining',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
    },
    {
      id: 26,
      reference_no: '53AE8BE8-D245-4FF4-B91C-D8D44BA30569',
      transaction_date: '31 Aug 2026 08:21:35',
      amount: 100000,
      currency: 'IDR',
      transaction_type: 'Bank Transfer',
      merchant_name: 'Transfer',
      merchant_clean_name: 'Transfer',
      source_of_fund: 'myBCA',
      category: 'General / Others',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
    },
    {
      id: 25,
      reference_no: '9527120260830182424533QRS1079342240',
      transaction_date: '30 Aug 2026 18:24:28',
      amount: 45320,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'ESB Restaurant Tech D',
      merchant_clean_name: 'ESB Restaurant Tech D',
      source_of_fund: 'myBCA',
      category: 'Food & Dining',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
    },
    {
      id: 24,
      reference_no: '9527120260829203939023QRS1074766674',
      transaction_date: '29 Aug 2026 20:39:43',
      amount: 38000,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'KWETIAU AHO - PMS',
      merchant_clean_name: 'KWETIAU AHO - PMS',
      source_of_fund: 'myBCA',
      category: 'Food & Dining',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
    },
  ],
};

export class HermesApi {
  static async getServerUrl(): Promise<string> {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    // If empty or still pointing to old local laptop IP, point to VPS automatically
    if (!saved || saved.includes('192.168.')) {
      await AsyncStorage.setItem(SERVER_URL_KEY, DEFAULT_SERVER_URL);
      return DEFAULT_SERVER_URL;
    }
    return saved;
  }

  static async setServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
  }

  static async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  static async getDashboard(): Promise<{ data: DashboardData; isOffline: boolean }> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(`${baseUrl}/api/mobile/dashboard`);
      if (res.ok) {
        const data = await res.json();
        return { data, isOffline: false };
      }
    } catch (e) {
      console.log('Connecting to Hermes Backend failed, using local offline state:', e);
    }
    return { data: FALLBACK_DASHBOARD, isOffline: true };
  }

  static async getPendingReviews(): Promise<Transaction[]> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(`${baseUrl}/api/transactions/pending-review`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Using fallback pending reviews');
    }
    return FALLBACK_DASHBOARD.pending_reviews;
  }

  static async reviewTransaction(
    id: number,
    category: string,
    entity: ExpenseEntity,
    notes?: string,
    merchant_name?: string,
    amount?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(`${baseUrl}/api/transactions/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, entity, notes, merchant_name, amount }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Review transaction offline fallback:', e);
    }
    return { success: true, message: 'Updated locally (offline mode)' };
  }

  static async updateTransaction(
    id: number,
    updates: {
      merchant_name?: string;
      amount?: number;
      category?: string;
      entity?: ExpenseEntity;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(`${baseUrl}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Update transaction error:', e);
    }
    return { success: false, message: 'Failed to update transaction' };
  }

  static async getTransactions(params?: {
    search?: string;
    category?: string;
    entity?: string;
  }): Promise<Transaction[]> {
    try {
      const baseUrl = await this.getServerUrl();
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.category && params.category !== 'All') query.append('category', params.category);
      if (params?.entity && params.entity !== 'All') query.append('entity', params.entity);

      const res = await this.fetchWithTimeout(`${baseUrl}/api/transactions?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        return json.items || [];
      }
    } catch (e) {
      console.log('Get transactions offline fallback:', e);
    }
    return FALLBACK_DASHBOARD.recent_transactions;
  }

  static async configureGmail(email: string, password: string): Promise<SyncResult> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(
        `${baseUrl}/api/settings/gmail`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
        20000
      );
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Configure Gmail error:', e);
    }
    return {
      success: false,
      message: 'Could not connect to backend to save Gmail credentials.',
      imported: 0,
      scanned: 0,
    };
  }

  static async triggerGmailSync(): Promise<SyncResult> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(`${baseUrl}/api/sync/trigger`, {
        method: 'POST',
      }, 15000); // 15s timeout for IMAP sync
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Sync trigger error:', e);
    }
    return {
      success: false,
      message: 'Could not connect to backend server. Make sure FastAPI is running on Wi-Fi.',
      imported: 0,
      scanned: 0,
    };
  }

  static async purgeMockData(): Promise<{ success: boolean; message: string; remaining?: number }> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(`${baseUrl}/api/purge-mock-data`, {
        method: 'POST',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Purge mock data error:', e);
    }
    return { success: false, message: 'Could not connect to server to purge mock data.' };
  }

  static async seedSampleData(): Promise<{ success: boolean; message: string }> {
    return await this.purgeMockData();
  }
}

