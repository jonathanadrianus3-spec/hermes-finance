import { CategoryMeta, ExpenseEntity } from '../types';

export const EXPENSE_ENTITIES: ExpenseEntity[] = [
  'Personal',
  'Family',
  'Community',
  'Professional',
];

export const CATEGORIES_DATA: Record<string, CategoryMeta> = {
  'Food & Dining': { icon: 'restaurant-outline', color: '#D0BCFF', budget: 3000000 },
  'Groceries & Household': { icon: 'cart-outline', color: '#E8DEF8', budget: 2000000 },
  'Shopping & Retail': { icon: 'bag-outline', color: '#F2C4DE', budget: 2000000 },
  'Transportation & Fuel': { icon: 'navigate-outline', color: '#C4B5FD', budget: 1500000 },
  'Bills & Utilities': { icon: 'flash-outline', color: '#DDD6FE', budget: 1200000 },
  'Subscriptions & Digital': { icon: 'sync-outline', color: '#A78BFA', budget: 800000 },
  'Healthcare & Wellness': { icon: 'fitness-outline', color: '#C7D2FE', budget: 600000 },
  'Family & Education': { icon: 'heart-circle-outline', color: '#FFD8D0', budget: 2500000 },
  'Community & Giving': { icon: 'gift-outline', color: '#F0ABFC', budget: 1000000 },
  'Professional & Work': { icon: 'briefcase-outline', color: '#BAE6FD', budget: 3000000 },
  'Transfer & Financial': { icon: 'swap-horizontal-outline', color: '#C4B5FD', budget: 0 },
  'General / Others': { icon: 'cube-outline', color: '#A69DB9', budget: 1000000 },
};

export function getCategoryMeta(categoryName: string): CategoryMeta {
  return (
    CATEGORIES_DATA[categoryName] || {
      icon: 'cube',
      color: '#94A3B8',
      budget: 1000000,
    }
  );
}

export function formatIDR(amount: number): string {
  if (isNaN(amount)) return 'IDR 0';
  return (
    'IDR ' +
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
