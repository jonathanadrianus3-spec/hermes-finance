export type ExpenseEntity = 'Personal' | 'Family' | 'Community' | 'Professional';

export interface Transaction {
  id: number;
  reference_no: string;
  rrn?: string;
  transaction_date: string;
  amount: number;
  currency: string;
  transaction_type: string;
  merchant_name: string;
  merchant_clean_name?: string;
  merchant_location?: string;
  source_of_fund?: string;
  category: string;
  subcategory?: string;
  entity: ExpenseEntity;
  status: string;
  is_reviewed: number;
  reviewed_at?: string;
  notes?: string;
  raw_text?: string;
  created_at?: string;
}

export interface EntityBreakdown {
  entity: ExpenseEntity;
  total_amount: number;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  total_amount: number;
  count: number;
}

export interface PaymentTypeBreakdown {
  transaction_type: string;
  total_amount: number;
  count: number;
}

export interface DailyTrend {
  day: string;
  daily_total: number;
}

export interface AnalyticsSummary {
  month: string;
  total_spent: number;
  tx_count: number;
  avg_tx: number;
  daily_velocity: number;
  prev_month_total: number;
  mom_change_pct: number;
  top_category: string;
  category_breakdown: CategoryBreakdown[];
  entity_breakdown: EntityBreakdown[];
  payment_type_breakdown: PaymentTypeBreakdown[];
  daily_trends: DailyTrend[];
}

export interface DashboardData {
  summary: AnalyticsSummary;
  pending_review_count: number;
  pending_reviews: Transaction[];
  recent_transactions: Transaction[];
}

export interface SyncResult {
  success: boolean;
  message?: string;
  imported: number;
  scanned: number;
}

export interface CategoryMeta {
  icon: string;
  color: string;
  budget: number;
}
