import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { authStorage } from '../services/authStorage';
import { widgetBridge } from '../services/widgetBridge';
import { Account, AccountSummary, RecurringItem, Transaction } from '../types';

const FINANCE_CACHE_KEY = '@ayefinance_cache_v1';
const SYNC_TIMESTAMP_KEY = '@ayefinance_last_synced_v1';

interface FinanceCacheData {
  accounts: Account[];
  transactions: Transaction[];
  recurringItems: RecurringItem[];
  summary: AccountSummary | null;
  lastSyncedAt: string | null;
}

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  recurringItems: RecurringItem[];
  summary: AccountSummary | null;
  lastSyncedAt: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  initializeStore: () => Promise<void>;
  syncDelta: (forceFull?: boolean) => Promise<void>;
  addTransactionOptimistic: (data: any) => Promise<Transaction>;
  deleteTransactionOptimistic: (id: string) => Promise<void>;
  addAccountOptimistic: (data: any) => Promise<Account>;
  updateAccountOptimistic: (id: string, data: any) => Promise<Account>;
  deleteAccountOptimistic: (id: string) => Promise<void>;
  addRecurringOptimistic: (data: any) => Promise<RecurringItem>;
  deleteRecurringOptimistic: (id: string) => Promise<void>;
  applyRecurringOptimistic: (id: string) => Promise<Transaction>;
  clearStore: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  transactions: [],
  recurringItems: [],
  summary: null,
  lastSyncedAt: null,
  isLoading: true,
  isSyncing: false,
  error: null,

  initializeStore: async () => {
    try {
      // 1. Read persistent local cache for 0-delay instant startup
      const [cachedDataRaw, lastSynced] = await Promise.all([
        AsyncStorage.getItem(FINANCE_CACHE_KEY),
        AsyncStorage.getItem(SYNC_TIMESTAMP_KEY),
      ]);

      if (cachedDataRaw) {
        try {
          const parsed: FinanceCacheData = JSON.parse(cachedDataRaw);
          set({
            accounts: parsed.accounts || [],
            transactions: parsed.transactions || [],
            recurringItems: parsed.recurringItems || [],
            summary: parsed.summary || null,
            lastSyncedAt: lastSynced || parsed.lastSyncedAt || null,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }

      // 2. Perform delta sync in background to fetch only newest server changes
      await get().syncDelta(false);
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Error al inicializar almacén' });
    }
  },

  syncDelta: async (forceFull = false) => {
    if (get().isSyncing) return;
    set({ isSyncing: true, error: null });

    try {
      const sinceTimestamp = forceFull ? null : get().lastSyncedAt;
      const delta = await api.getSyncDelta(sinceTimestamp);

      if (!delta.has_changes) {
        // No modifications on server. Update sync cursor with zero UI re-rendering.
        const newSyncTime = delta.server_time;
        set({ lastSyncedAt: newSyncTime, isSyncing: false });
        await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, newSyncTime);
        return;
      }

      // Delta changes present: merge updates cleanly
      const currentAccounts = forceFull ? [] : [...get().accounts];
      const currentTransactions = forceFull ? [] : [...get().transactions];
      const currentRecurring = forceFull ? [] : [...get().recurringItems];

      // 1. Merge Accounts
      const deletedAccIds = new Set(delta.deleted_account_ids || []);
      const filteredAccounts = currentAccounts.filter((a) => !deletedAccIds.has(a.id));
      const accMap = new Map(filteredAccounts.map((a) => [a.id, a]));
      for (const updatedAcc of delta.accounts || []) {
        accMap.set(updatedAcc.id, updatedAcc);
      }
      const nextAccounts = Array.from(accMap.values());

      // 2. Merge Transactions
      const deletedTxIds = new Set(delta.deleted_transaction_ids || []);
      const filteredTransactions = currentTransactions.filter((t) => !deletedTxIds.has(t.id));
      const txMap = new Map(filteredTransactions.map((t) => [t.id, t]));
      for (const updatedTx of delta.transactions || []) {
        txMap.set(updatedTx.id, updatedTx);
      }
      const nextTransactions = Array.from(txMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // 3. Merge Recurring
      const deletedRecIds = new Set(delta.deleted_recurring_ids || []);
      const filteredRecurring = currentRecurring.filter((r) => !deletedRecIds.has(r.id));
      const recMap = new Map(filteredRecurring.map((r) => [r.id, r]));
      for (const updatedRec of delta.recurring_items || []) {
        recMap.set(updatedRec.id, updatedRec);
      }
      const nextRecurring = Array.from(recMap.values());

      // 4. Update Summary
      const nextSummary = delta.summary || get().summary;
      const newSyncTime = delta.server_time;

      set({
        accounts: nextAccounts,
        transactions: nextTransactions,
        recurringItems: nextRecurring,
        summary: nextSummary,
        lastSyncedAt: newSyncTime,
        isSyncing: false,
      });

      // Persist to local storage
      const cachePayload: FinanceCacheData = {
        accounts: nextAccounts,
        transactions: nextTransactions,
        recurringItems: nextRecurring,
        summary: nextSummary,
        lastSyncedAt: newSyncTime,
      };
      await Promise.all([
        AsyncStorage.setItem(FINANCE_CACHE_KEY, JSON.stringify(cachePayload)),
        AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, newSyncTime),
      ]);

      // Sync iOS Widget bridge if active
      authStorage.getAccessToken().then((token) => {
        if (token) {
          widgetBridge.syncWidgetData(token, nextAccounts, nextTransactions, nextSummary || undefined).catch(() => {});
        }
      });
    } catch (err: any) {
      set({ isSyncing: false, error: err?.message || 'Error en sincronización' });
    }
  },

  addTransactionOptimistic: async (data: any) => {
    const tempId = `temp_${Date.now()}`;
    const prevAccounts = [...get().accounts];
    const prevTransactions = [...get().transactions];

    const parsedAmount = parseFloat(String(data.amount || '0')) || 0;
    const originAccountId = data.account_id;
    const destAccountId = data.destination_account_id;
    const txType = data.type;

    // Apply local balance changes to accounts
    const nextAccounts = prevAccounts.map((acc) => {
      let balanceNum = parseFloat(acc.current_balance) || 0;
      if (acc.id === originAccountId) {
        if (acc.account_type === 'credito') {
          balanceNum = txType === 'ingreso' ? balanceNum - parsedAmount : balanceNum + parsedAmount;
        } else {
          balanceNum = txType === 'ingreso' ? balanceNum + parsedAmount : balanceNum - parsedAmount;
        }
        return { ...acc, current_balance: balanceNum.toFixed(2) };
      }
      if (acc.id === destAccountId && txType === 'transferencia') {
        if (acc.account_type === 'credito') {
          balanceNum = balanceNum - parsedAmount;
        } else {
          balanceNum = balanceNum + parsedAmount;
        }
        return { ...acc, current_balance: balanceNum.toFixed(2) };
      }
      return acc;
    });

    const optimisticTx: Transaction = {
      id: tempId,
      user_id: '',
      account_id: originAccountId,
      destination_account_id: destAccountId,
      amount: String(parsedAmount),
      type: txType,
      concept: data.concept || 'Movimiento',
      category: data.category || 'General',
      date: data.date || new Date().toISOString(),
      notes: data.notes || null,
      is_recurring: Boolean(data.is_recurring),
      recurring_item_id: data.recurring_item_id || null,
      is_msi: Boolean(data.is_msi),
      msi_months: data.msi_months || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Instant local UI update (0ms perceived latency)
    set({
      transactions: [optimisticTx, ...prevTransactions],
      accounts: nextAccounts,
    });

    try {
      const realTx = await api.createTransaction(data);
      // Replace temp transaction with real server transaction
      const reconciledTransactions = get().transactions.map((t) => (t.id === tempId ? realTx : t));
      set({ transactions: reconciledTransactions });

      // Save cache locally
      AsyncStorage.setItem(
        FINANCE_CACHE_KEY,
        JSON.stringify({
          accounts: get().accounts,
          transactions: reconciledTransactions,
          recurringItems: get().recurringItems,
          summary: get().summary,
          lastSyncedAt: get().lastSyncedAt,
        })
      ).catch(() => {});

      // Silent delta sync to refresh backend summaries and projected balances
      get().syncDelta(false).catch(() => {});

      return realTx;
    } catch (err) {
      // Revert optimistic state on network error
      set({
        transactions: prevTransactions,
        accounts: prevAccounts,
      });
      throw err;
    }
  },

  deleteTransactionOptimistic: async (id: string) => {
    const prevTransactions = [...get().transactions];
    const prevAccounts = [...get().accounts];

    const targetTx = prevTransactions.find((t) => t.id === id);
    if (!targetTx) return;

    const parsedAmount = parseFloat(targetTx.amount) || 0;
    const originAccountId = targetTx.account_id;
    const destAccountId = targetTx.destination_account_id;
    const txType = targetTx.type;

    // Reverse local balance changes
    const nextAccounts = prevAccounts.map((acc) => {
      let balanceNum = parseFloat(acc.current_balance) || 0;
      if (acc.id === originAccountId) {
        if (acc.account_type === 'credito') {
          balanceNum = txType === 'ingreso' ? balanceNum + parsedAmount : balanceNum - parsedAmount;
        } else {
          balanceNum = txType === 'ingreso' ? balanceNum - parsedAmount : balanceNum + parsedAmount;
        }
        return { ...acc, current_balance: balanceNum.toFixed(2) };
      }
      if (acc.id === destAccountId && txType === 'transferencia') {
        if (acc.account_type === 'credito') {
          balanceNum = balanceNum + parsedAmount;
        } else {
          balanceNum = balanceNum - parsedAmount;
        }
        return { ...acc, current_balance: balanceNum.toFixed(2) };
      }
      return acc;
    });

    // Instant local removal
    set({
      transactions: prevTransactions.filter((t) => t.id !== id),
      accounts: nextAccounts,
    });

    try {
      await api.deleteTransaction(id);
      AsyncStorage.setItem(
        FINANCE_CACHE_KEY,
        JSON.stringify({
          accounts: nextAccounts,
          transactions: get().transactions,
          recurringItems: get().recurringItems,
          summary: get().summary,
          lastSyncedAt: get().lastSyncedAt,
        })
      ).catch(() => {});

      get().syncDelta(false).catch(() => {});
    } catch (err) {
      set({ transactions: prevTransactions, accounts: prevAccounts });
      throw err;
    }
  },

  addAccountOptimistic: async (data: any) => {
    const acc = await api.createAccount(data);
    const nextAccounts = [...get().accounts, acc];
    set({ accounts: nextAccounts });

    AsyncStorage.setItem(
      FINANCE_CACHE_KEY,
      JSON.stringify({
        accounts: nextAccounts,
        transactions: get().transactions,
        recurringItems: get().recurringItems,
        summary: get().summary,
        lastSyncedAt: get().lastSyncedAt,
      })
    ).catch(() => {});

    get().syncDelta(false).catch(() => {});
    return acc;
  },

  updateAccountOptimistic: async (id: string, data: any) => {
    const prevAccounts = [...get().accounts];
    const acc = await api.updateAccount(id, data);
    const nextAccounts = prevAccounts.map((a) => (a.id === id ? acc : a));
    set({ accounts: nextAccounts });

    AsyncStorage.setItem(
      FINANCE_CACHE_KEY,
      JSON.stringify({
        accounts: nextAccounts,
        transactions: get().transactions,
        recurringItems: get().recurringItems,
        summary: get().summary,
        lastSyncedAt: get().lastSyncedAt,
      })
    ).catch(() => {});

    get().syncDelta(false).catch(() => {});
    return acc;
  },

  deleteAccountOptimistic: async (id: string) => {
    const prevAccounts = [...get().accounts];
    set({ accounts: prevAccounts.filter((a) => a.id !== id) });

    try {
      await api.deleteAccount(id);
      AsyncStorage.setItem(
        FINANCE_CACHE_KEY,
        JSON.stringify({
          accounts: get().accounts,
          transactions: get().transactions,
          recurringItems: get().recurringItems,
          summary: get().summary,
          lastSyncedAt: get().lastSyncedAt,
        })
      ).catch(() => {});

      get().syncDelta(false).catch(() => {});
    } catch (err) {
      set({ accounts: prevAccounts });
      throw err;
    }
  },

  addRecurringOptimistic: async (data: any) => {
    const item = await api.createRecurring(data);
    const nextRecurring = [...get().recurringItems, item];
    set({ recurringItems: nextRecurring });

    AsyncStorage.setItem(
      FINANCE_CACHE_KEY,
      JSON.stringify({
        accounts: get().accounts,
        transactions: get().transactions,
        recurringItems: nextRecurring,
        summary: get().summary,
        lastSyncedAt: get().lastSyncedAt,
      })
    ).catch(() => {});

    get().syncDelta(false).catch(() => {});
    return item;
  },

  deleteRecurringOptimistic: async (id: string) => {
    const prevRecurring = [...get().recurringItems];
    set({ recurringItems: prevRecurring.filter((r) => r.id !== id) });

    try {
      await api.deleteRecurring(id);
      AsyncStorage.setItem(
        FINANCE_CACHE_KEY,
        JSON.stringify({
          accounts: get().accounts,
          transactions: get().transactions,
          recurringItems: get().recurringItems,
          summary: get().summary,
          lastSyncedAt: get().lastSyncedAt,
        })
      ).catch(() => {});

      get().syncDelta(false).catch(() => {});
    } catch (err) {
      set({ recurringItems: prevRecurring });
      throw err;
    }
  },

  applyRecurringOptimistic: async (id: string) => {
    const tx = await api.applyRecurring(id);
    await get().syncDelta(false);
    return tx;
  },

  clearStore: async () => {
    set({
      accounts: [],
      transactions: [],
      recurringItems: [],
      summary: null,
      lastSyncedAt: null,
      isLoading: false,
      isSyncing: false,
      error: null,
    });
    await Promise.all([
      AsyncStorage.removeItem(FINANCE_CACHE_KEY).catch(() => {}),
      AsyncStorage.removeItem(SYNC_TIMESTAMP_KEY).catch(() => {}),
    ]);
  },
}));
