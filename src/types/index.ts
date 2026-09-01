export type AccountType = 'corriente' | 'ahorro' | 'inversion';
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
  is_liquid: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountSummary {
  liquid_total: string;
  savings_total: string;
  grand_total: string;
  projected_grand_total: string;
  accounts_count: number;
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
