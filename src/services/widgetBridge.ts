import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, AccountSummary, Transaction } from '../types';
import { getApiBaseUrl } from './api';

export const APP_GROUP_ID = 'group.com.ayeapps.ayefinance';

export const WIDGET_STORAGE_KEYS = {
  ACCOUNTS: 'ayefinance_accounts',
  TOKEN: 'ayefinance_token',
  ACCESS_TOKEN: 'ayefinance_access_token',
  API_URL: 'ayefinance_api_url',
  SUMMARY: 'ayefinance_summary',
} as const;

export interface WidgetAccountPayload {
  id: string;
  name: string;
  type: string;
  account_type?: string;
  balance: string;
  current_balance?: string;
  currency: string;
  color?: string;
}

export interface WidgetAccountMetrics {
  balance: string;
  today_expenses: string;
  today_income: string;
  month_expenses: string;
  month_income: string;
}

export interface WidgetSummaryPayload {
  grand_total: string;
  liquid_total: string;
  savings_total: string;
  accounts_count: number;
  today_expenses: string;
  today_income: string;
  month_expenses: string;
  month_income: string;
  by_account: Record<string, WidgetAccountMetrics>;
}

/**
 * Resilient helper to persist key-value pairs into iOS App Group UserDefaults.
 * Checks available native bridge modules dynamically.
 */
async function saveToNativeAppGroup(key: string, value: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const {
      WidgetBridge,
      SharedGroupPreferences,
      AppGroupDefaults,
      UserDefaultsBridge,
      RNSharedWidget,
    } = NativeModules;

    if (WidgetBridge) {
      if (typeof WidgetBridge.setItem === 'function') {
        await WidgetBridge.setItem(key, value, APP_GROUP_ID);
        return true;
      }
      if (typeof WidgetBridge.setSharedItem === 'function') {
        await WidgetBridge.setSharedItem(key, value, APP_GROUP_ID);
        return true;
      }
    }

    if (SharedGroupPreferences && typeof SharedGroupPreferences.setItem === 'function') {
      await SharedGroupPreferences.setItem(key, value, APP_GROUP_ID);
      return true;
    }

    if (AppGroupDefaults && typeof AppGroupDefaults.set === 'function') {
      await AppGroupDefaults.set(key, value, APP_GROUP_ID);
      return true;
    }

    if (UserDefaultsBridge && typeof UserDefaultsBridge.set === 'function') {
      await UserDefaultsBridge.set(key, value, APP_GROUP_ID);
      return true;
    }

    if (RNSharedWidget && typeof RNSharedWidget.setData === 'function') {
      await RNSharedWidget.setData(key, value, APP_GROUP_ID);
      return true;
    }
  } catch (err) {
    if (__DEV__) {
      console.warn(`[WidgetBridge] Native App Group setItem failed for key "${key}":`, err);
    }
  }

  return false;
}

/**
 * Resilient helper to remove a key from the iOS App Group.
 */
async function removeFromNativeAppGroup(key: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const {
      WidgetBridge,
      SharedGroupPreferences,
      AppGroupDefaults,
      UserDefaultsBridge,
      RNSharedWidget,
    } = NativeModules;

    if (WidgetBridge && typeof WidgetBridge.removeItem === 'function') {
      await WidgetBridge.removeItem(key, APP_GROUP_ID);
      return true;
    }

    if (SharedGroupPreferences && typeof SharedGroupPreferences.removeItem === 'function') {
      await SharedGroupPreferences.removeItem(key, APP_GROUP_ID);
      return true;
    }

    if (AppGroupDefaults && typeof AppGroupDefaults.remove === 'function') {
      await AppGroupDefaults.remove(key, APP_GROUP_ID);
      return true;
    }

    if (UserDefaultsBridge && typeof UserDefaultsBridge.remove === 'function') {
      await UserDefaultsBridge.remove(key, APP_GROUP_ID);
      return true;
    }

    if (RNSharedWidget && typeof RNSharedWidget.removeData === 'function') {
      await RNSharedWidget.removeData(key, APP_GROUP_ID);
      return true;
    }
  } catch (err) {
    if (__DEV__) {
      console.warn(`[WidgetBridge] Native App Group removeItem failed for key "${key}":`, err);
    }
  }

  return false;
}

/**
 * Requests iOS to reload all widget timelines if the native bridge supports it.
 */
function reloadNativeWidgets(): void {
  if (Platform.OS !== 'ios') return;

  try {
    const { WidgetBridge, RNSharedWidget } = NativeModules;
    if (WidgetBridge && typeof WidgetBridge.reloadTimelines === 'function') {
      WidgetBridge.reloadTimelines();
    } else if (RNSharedWidget && typeof RNSharedWidget.reloadAllTimelines === 'function') {
      RNSharedWidget.reloadAllTimelines();
    }
  } catch {}
}

/**
 * Frontend bridge service to synchronize account and auth token data
 * for native iOS widgets (App Group) with resilient local storage fallback.
 */
export const widgetBridge = {
  /**
   * Synchronizes active accounts, auth token, and API base URL.
   * On iOS, persists to App Group group.com.ayeapps.ayefinance and always saves to local storage.
   */
   async syncWidgetData(
    token: string,
    accounts: Account[],
    transactions?: Transaction[],
    summary?: AccountSummary
  ): Promise<void> {
    try {
      const apiUrl = getApiBaseUrl();

      // Format accounts to the required payload schema: [{ id, name, type, balance, currency }]
      const formattedAccounts: WidgetAccountPayload[] = (accounts || []).map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.account_type,
        account_type: acc.account_type,
        balance: acc.current_balance,
        current_balance: acc.current_balance,
        currency: acc.currency,
        color: acc.color,
      }));

      const accountsJson = JSON.stringify(formattedAccounts);

      // Compute quick fallback summary for widgets
      const liquidTotal = formattedAccounts
        .filter((a) => a.type === 'corriente')
        .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
      const savingsTotal = formattedAccounts
        .filter((a) => a.type === 'ahorro' || a.type === 'inversion')
        .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
      const grandTotal = formattedAccounts.reduce(
        (sum, a) => sum + (parseFloat(a.balance) || 0),
        0
      );

      // Compute today's and this month's expenses and income
      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonthStr = todayStr.substring(0, 7);

      let todayExpenses = 0;
      let todayIncome = 0;
      let monthExpenses = 0;
      let monthIncome = 0;

      const byAccount: Record<string, WidgetAccountMetrics> = {};

      for (const acc of formattedAccounts) {
        byAccount[acc.id] = {
          balance: acc.balance,
          today_expenses: '0.00',
          today_income: '0.00',
          month_expenses: '0.00',
          month_income: '0.00',
        };
      }

      if (Array.isArray(transactions)) {
        for (const tx of transactions) {
          const txAmount = Math.abs(parseFloat(tx.amount) || 0);
          const txDate = tx.date ? tx.date.split('T')[0] : '';
          const isToday = txDate === todayStr;
          const isCurrentMonth = txDate.startsWith(currentMonthStr);
          const isExpense = tx.type === 'gasto';
          const isIncome = tx.type === 'ingreso';

          if (isToday) {
            if (isExpense) todayExpenses += txAmount;
            if (isIncome) todayIncome += txAmount;
          }
          if (isCurrentMonth) {
            if (isExpense) monthExpenses += txAmount;
            if (isIncome) monthIncome += txAmount;
          }

          if (tx.account_id && byAccount[tx.account_id]) {
            const accMetrics = byAccount[tx.account_id];
            if (isToday) {
              if (isExpense) {
                accMetrics.today_expenses = (parseFloat(accMetrics.today_expenses) + txAmount).toFixed(2);
              }
              if (isIncome) {
                accMetrics.today_income = (parseFloat(accMetrics.today_income) + txAmount).toFixed(2);
              }
            }
            if (isCurrentMonth) {
              if (isExpense) {
                accMetrics.month_expenses = (parseFloat(accMetrics.month_expenses) + txAmount).toFixed(2);
              }
              if (isIncome) {
                accMetrics.month_income = (parseFloat(accMetrics.month_income) + txAmount).toFixed(2);
              }
            }
          }
        }
      }

      const summaryPayload: WidgetSummaryPayload = {
        grand_total: summary?.grand_total ? String(summary.grand_total) : grandTotal.toFixed(2),
        liquid_total: summary?.liquid_total ? String(summary.liquid_total) : liquidTotal.toFixed(2),
        savings_total: summary?.savings_total ? String(summary.savings_total) : savingsTotal.toFixed(2),
        accounts_count: summary?.accounts_count ?? formattedAccounts.length,
        today_expenses: summary?.today_expenses !== undefined ? String(summary.today_expenses) : todayExpenses.toFixed(2),
        today_income: summary?.today_income !== undefined ? String(summary.today_income) : todayIncome.toFixed(2),
        month_expenses: summary?.month_expenses !== undefined ? String(summary.month_expenses) : monthExpenses.toFixed(2),
        month_income: summary?.month_income !== undefined ? String(summary.month_income) : monthIncome.toFixed(2),
        by_account: (summary?.by_account && Object.keys(summary.by_account).length > 0) ? summary.by_account : byAccount,
      };

      const summaryJson = JSON.stringify(summaryPayload);

      // 1. On iOS Native, attempt saving to iOS App Group
      if (Platform.OS === 'ios') {
        await Promise.allSettled([
          saveToNativeAppGroup(WIDGET_STORAGE_KEYS.ACCOUNTS, accountsJson),
          saveToNativeAppGroup(WIDGET_STORAGE_KEYS.TOKEN, token),
          saveToNativeAppGroup(WIDGET_STORAGE_KEYS.ACCESS_TOKEN, token),
          saveToNativeAppGroup(WIDGET_STORAGE_KEYS.API_URL, apiUrl),
          saveToNativeAppGroup(WIDGET_STORAGE_KEYS.SUMMARY, summaryJson),
        ]);
        reloadNativeWidgets();
      }

      // 2. Resilient local storage persistence (offline fallback for all platforms)
      await Promise.all([
        AsyncStorage.setItem(WIDGET_STORAGE_KEYS.ACCOUNTS, accountsJson),
        AsyncStorage.setItem(WIDGET_STORAGE_KEYS.TOKEN, token),
        AsyncStorage.setItem(WIDGET_STORAGE_KEYS.ACCESS_TOKEN, token),
        AsyncStorage.setItem(WIDGET_STORAGE_KEYS.API_URL, apiUrl),
        AsyncStorage.setItem(WIDGET_STORAGE_KEYS.SUMMARY, summaryJson),
      ]);
    } catch (err) {
      if (__DEV__) {
        console.warn('[WidgetBridge] Error in syncWidgetData:', err);
      }
    }
  },

  /**
   * Clears widget data from both iOS App Group and local storage.
   */
  async clearWidgetData(): Promise<void> {
    try {
      // 1. Remove from iOS App Group
      if (Platform.OS === 'ios') {
        await Promise.allSettled([
          removeFromNativeAppGroup(WIDGET_STORAGE_KEYS.ACCOUNTS),
          removeFromNativeAppGroup(WIDGET_STORAGE_KEYS.TOKEN),
          removeFromNativeAppGroup(WIDGET_STORAGE_KEYS.ACCESS_TOKEN),
          removeFromNativeAppGroup(WIDGET_STORAGE_KEYS.API_URL),
          removeFromNativeAppGroup(WIDGET_STORAGE_KEYS.SUMMARY),
        ]);
        reloadNativeWidgets();
      }

      // 2. Remove from local storage
      await Promise.all([
        AsyncStorage.removeItem(WIDGET_STORAGE_KEYS.ACCOUNTS),
        AsyncStorage.removeItem(WIDGET_STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(WIDGET_STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(WIDGET_STORAGE_KEYS.API_URL),
        AsyncStorage.removeItem(WIDGET_STORAGE_KEYS.SUMMARY),
      ]);
    } catch (err) {
      if (__DEV__) {
        console.warn('[WidgetBridge] Error in clearWidgetData:', err);
      }
    }
  },

  /**
   * Reads currently stored widget data from local storage.
   */
  async getStoredWidgetData(): Promise<{
    accounts: WidgetAccountPayload[];
    token: string | null;
    apiUrl: string | null;
  }> {
    try {
      const [accountsRaw, token, apiUrl] = await Promise.all([
        AsyncStorage.getItem(WIDGET_STORAGE_KEYS.ACCOUNTS),
        AsyncStorage.getItem(WIDGET_STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(WIDGET_STORAGE_KEYS.API_URL),
      ]);

      const accounts: WidgetAccountPayload[] = accountsRaw ? JSON.parse(accountsRaw) : [];
      return { accounts, token, apiUrl };
    } catch {
      return { accounts: [], token: null, apiUrl: null };
    }
  },
};

// Standalone function exports for direct import convenience
export const syncWidgetData = widgetBridge.syncWidgetData;
export const clearWidgetData = widgetBridge.clearWidgetData;
