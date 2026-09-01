export type AccountType = 'corriente' | 'ahorro' | 'inversion';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  currency: string;
  current_balance: string | number;
  projected_balance: string | number;
  color: string;
  icon: string;
  is_liquid: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountSummary {
  liquid_total: string | number;
  savings_total: string | number;
  grand_total: string | number;
  projected_grand_total: string | number;
  accounts_count: number;
}

export type TransactionType = 'ingreso' | 'gasto' | 'transferencia';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  destination_account_id?: string | null;
  amount: string | number;
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

export type RecurringType = 'ingreso_fijo' | 'gasto_fijo' | 'mensualidad';
export type Frequency = 'semanal' | 'quincenal' | 'mensual';

export interface RecurringItem {
  id: string;
  user_id: string;
  name: string;
  type: RecurringType;
  amount: string | number;
  frequency: Frequency;
  day_of_month?: number | null;
  account_id: string;
  next_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  is_active: boolean;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  refresh_token?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
