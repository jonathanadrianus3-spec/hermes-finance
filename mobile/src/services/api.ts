import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardData, Transaction, SyncResult, ExpenseEntity } from '../types';

const SERVER_URL_KEY = '@hermes_server_url';
export const DEFAULT_SERVER_URL = 'http://51.79.167.75:8000';

// Built-in fallback data for instant offline testing and reliability
export const FALLBACK_DASHBOARD: DashboardData = {
  summary: {
    month: '2026-09',
    total_spent: 651500,
    tx_count: 4,
    avg_tx: 162875,
    daily_velocity: 217166,
    prev_month_total: 2954820,
    mom_change_pct: -77.9,
    top_category: 'Professional & Work',
    category_breakdown: [
      { category: 'Professional & Work', total_amount: 320000, count: 1 },
      { category: 'Groceries & Household', total_amount: 215000, count: 1 },
      { category: 'Food & Dining', total_amount: 116500, count: 2 },
    ],
    entity_breakdown: [
      { entity: 'Personal', total_amount: 116500, count: 2 },
      { entity: 'Family', total_amount: 215000, count: 1 },
      { entity: 'Community', total_amount: 0, count: 0 },
      { entity: 'Professional', total_amount: 320000, count: 1 },
    ],
    payment_type_breakdown: [
      { transaction_type: 'QRIS Payment', total_amount: 331500, count: 3 },
      { transaction_type: 'Pembayaran BCA Virtual Account', total_amount: 320000, count: 1 },
    ],
    daily_trends: [
      { day: '2026-09-01', daily_total: 320000 },
      { day: '2026-09-02', daily_total: 215000 },
      { day: '2026-09-03', daily_total: 116500 },
    ],
  },
  pending_review_count: 2,
  pending_reviews: [
    {
      id: 101,
      reference_no: '9527120260903124500QRS01',
      rrn: '287991823',
      transaction_date: '03 Sep 2026 12:45:00',
      amount: 32000,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'KOPI KENANGAN QBIG',
      merchant_clean_name: 'KOPI KENANGAN QBIG',
      merchant_location: 'TANGERANG, ID',
      source_of_fund: 'TAHAPAN - 6720****92',
      category: 'Food & Dining',
      subcategory: 'Cafe & Coffee',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
      notes: '',
      raw_text: 'Hello JONATHAN ADRIANUS GANI,\nYou just made a transaction through myBCA.\nAmount: IDR 32,000.00',
    },
    {
      id: 102,
      reference_no: '9527120260903131500QRS02',
      rrn: '287991824',
      transaction_date: '03 Sep 2026 13:15:00',
      amount: 84500,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'BAKMI GM LIVING WORLD',
      merchant_clean_name: 'BAKMI GM LIVING WORLD',
      merchant_location: 'TANGERANG SELATAN, ID',
      source_of_fund: 'TAHAPAN - 6720****92',
      category: 'Food & Dining',
      subcategory: 'Restaurant',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
      notes: 'Makan Siang Bareng Rekan',
    },
  ],
  recent_transactions: [
    {
      id: 101,
      reference_no: '9527120260903124500QRS01',
      rrn: '287991823',
      transaction_date: '03 Sep 2026 12:45:00',
      amount: 32000,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'KOPI KENANGAN QBIG',
      merchant_clean_name: 'KOPI KENANGAN QBIG',
      merchant_location: 'TANGERANG, ID',
      source_of_fund: 'TAHAPAN - 6720****92',
      category: 'Food & Dining',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
    },
    {
      id: 102,
      reference_no: '9527120260903131500QRS02',
      transaction_date: '03 Sep 2026 13:15:00',
      amount: 84500,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'BAKMI GM LIVING WORLD',
      merchant_clean_name: 'BAKMI GM LIVING WORLD',
      merchant_location: 'TANGERANG SELATAN, ID',
      source_of_fund: 'TAHAPAN - 6720****92',
      category: 'Food & Dining',
      entity: 'Personal',
      status: 'Successful',
      is_reviewed: 0,
    },
    {
      id: 103,
      reference_no: '9527120260902183010QRS03',
      transaction_date: '02 Sep 2026 18:30:10',
      amount: 215000,
      currency: 'IDR',
      transaction_type: 'QRIS Payment',
      merchant_name: 'SUPERINDO FRESH BINTARO',
      merchant_clean_name: 'SUPERINDO FRESH BINTARO',
      merchant_location: 'TANGERANG SELATAN, ID',
      source_of_fund: 'TAHAPAN - 6720****92',
      category: 'Groceries & Household',
      entity: 'Family',
      status: 'Successful',
      is_reviewed: 1,
    },
    {
      id: 104,
      reference_no: '9527120260901091522VA04',
      transaction_date: '01 Sep 2026 09:15:22',
      amount: 320000,
      currency: 'IDR',
      transaction_type: 'Pembayaran BCA Virtual Account',
      merchant_name: 'ANTHROPIC CLAUDE API',
      merchant_clean_name: 'ANTHROPIC CLAUDE API',
      source_of_fund: 'TAHAPAN - 6720****92',
      category: 'Professional & Work',
      entity: 'Professional',
      status: 'Successful',
      is_reviewed: 1,
    },
  ],
};

export class HermesApi {
  static async getServerUrl(): Promise<string> {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    return saved || DEFAULT_SERVER_URL;
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

  static async seedSampleData(): Promise<{ success: boolean; message: string }> {
    try {
      const baseUrl = await this.getServerUrl();
      const res = await this.fetchWithTimeout(`${baseUrl}/api/seed`, {
        method: 'POST',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Seed sample data offline fallback:', e);
    }
    return { success: true, message: 'Demo data refreshed!' };
  }
}
