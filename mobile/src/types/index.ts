export type AccountType = 'debito' | 'credito' | 'ahorro' | 'inversion' | 'corriente';
export type TransactionType = 'ingreso' | 'gasto' | 'transferencia';
export type RecurringType = 'ingreso_fijo' | 'gasto_fijo' | 'mensualidad';
export type Frequency = 'semanal' | 'quincenal' | 'mensual';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role?: string;
  apps_access?: {
    tasks?: boolean;
    video?: boolean;
    finance?: boolean;
  };
  created_at?: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  currency: string;
  current_balance: string;
  projected_balance: string;
  color: string;
  icon: string;
  bank_id?: string;
  is_liquid: boolean;
  card_product?: string | null;
  credit_limit?: string | number | null;
  cut_off_day?: number | null;
  payment_due_day?: number | null;
  payment_grace_days?: number | null;
  has_yield?: boolean;
  annual_yield_rate?: string | number | null;
  created_at: string;
  updated_at: string;
}


export interface AccountSummary {
  liquid_total: string;
  savings_total: string;
  grand_total: string;
  projected_grand_total: string;
  accounts_count: number;
  today_expenses?: number | string;
  today_income?: number | string;
  month_expenses?: number | string;
  month_income?: number | string;
  month_cashback?: number | string;
  month_points?: number;
  by_account?: Record<string, any>;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  destination_account_id?: string | null;
  amount: string;
  type: TransactionType;
  concept: string;
  category: string;
  date: string;
  notes?: string | null;
  is_recurring: boolean;
  recurring_item_id?: string | null;
  is_msi?: boolean;
  msi_months?: number | null;
  msi_monthly_amount?: string | number | null;
  cashback_earned?: string | number | null;
  points_earned?: number | null;
  is_external?: boolean;
  external_account_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface RecurringItem {
  id: string;
  user_id: string;
  name: string;
  type: RecurringType;
  amount: string;
  frequency: Frequency;
  day_of_month?: number | null;
  account_id: string;
  next_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncDeltaResponse {
  has_changes: boolean;
  server_time: string;
  accounts: Account[];
  transactions: Transaction[];
  recurring_items: RecurringItem[];
  deleted_account_ids: string[];
  deleted_transaction_ids: string[];
  deleted_recurring_ids: string[];
  summary: AccountSummary | null;
}
