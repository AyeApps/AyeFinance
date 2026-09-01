import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LogOut, Plus, TrendingUp, Wallet, DollarSign } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../store/useLanguageStore';
import { api } from '../../services/api';
import { Account, AccountSummary, Transaction } from '../../types';

export const DashboardScreen: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sumRes, accRes, txRes] = await Promise.all([
        api.getSummary().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getTransactions(1, 5).catch(() => ({ items: [] } as any)),
      ]);
      setSummary(sumRes);
      setAccounts(accRes);
      setTransactions(txRes.items || []);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Top App Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderMuted }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Bienvenido,</Text>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user?.name || user?.email || 'Usuario'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={[styles.logoutBtn, { borderColor: colors.borderMuted }]}>
          <LogOut size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Metric Summary Cards */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: colors.bgSecondary, borderColor: '#10B981' }]}>
                <View style={styles.metricHeader}>
                  <Wallet size={16} color="#10B981" />
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    {t.dashboard.liquidAvailable}
                  </Text>
                </View>
                <Text style={[styles.metricValue, { color: '#10B981' }]}>
                  ${summary?.liquid_total || '0.00'}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  {t.dashboard.liquidSubtitle}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.bgSecondary, borderColor: '#0EA5E9' }]}>
                <View style={styles.metricHeader}>
                  <DollarSign size={16} color="#0EA5E9" />
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    {t.dashboard.totalSavings}
                  </Text>
                </View>
                <Text style={[styles.metricValue, { color: '#0EA5E9' }]}>
                  ${summary?.grand_total || '0.00'}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  {t.dashboard.totalSubtitle}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.bgSecondary, borderColor: colors.accent }]}>
                <View style={styles.metricHeader}>
                  <TrendingUp size={16} color={colors.accent} />
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    {t.dashboard.projectedTotal}
                  </Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.accent }]}>
                  ${summary?.projected_grand_total || '0.00'}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  {t.dashboard.projectedSubtitle}
                </Text>
              </View>
            </View>

            {/* Accounts Horizontal Carousel */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t.dashboard.myAccounts}</Text>
                <TouchableOpacity onPress={() => onNavigate('accounts')}>
                  <Text style={[styles.seeAllText, { color: colors.accent }]}>Ver todas</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {accounts.map((acc) => (
                  <View
                    key={acc.id}
                    style={[styles.accountCard, { backgroundColor: colors.bgSecondary, borderColor: acc.color || colors.borderMuted }]}
                  >
                    <Text style={[styles.accountName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {acc.name}
                    </Text>
                    <Text style={[styles.accountBalance, { color: colors.accent }]}>${acc.current_balance}</Text>
                    <Text style={[styles.accountSub, { color: colors.textMuted }]}>
                      Proy: ${acc.projected_balance}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Recent Transactions List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t.dashboard.recentTx}</Text>
                <TouchableOpacity onPress={() => onNavigate('transactions')}>
                  <Text style={[styles.seeAllText, { color: colors.accent }]}>Historial</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.txList}>
                {transactions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay movimientos registrados</Text>
                ) : (
                  transactions.map((tx) => (
                    <View
                      key={tx.id}
                      style={[styles.txItem, { backgroundColor: colors.bgSecondary, borderColor: colors.borderMuted }]}
                    >
                      <View>
                        <Text style={[styles.txConcept, { color: colors.textPrimary }]}>{tx.concept}</Text>
                        <Text style={[styles.txCategory, { color: colors.textMuted }]}>{tx.category}</Text>
                      </View>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: tx.type === 'ingreso' ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {tx.type === 'ingreso' ? '+' : '-'}${tx.amount}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => onNavigate('transactions')}
      >
        <Plus size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 11,
    fontWeight: '600',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  metricSub: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  accountCard: {
    width: 140,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '900',
  },
  accountSub: {
    fontSize: 10,
    marginTop: 4,
  },
  txList: {
    gap: 8,
  },
  txItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txConcept: {
    fontSize: 13,
    fontWeight: '600',
  },
  txCategory: {
    fontSize: 11,
    marginTop: 1,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
