import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  TrendingUp,
  Wallet,
  Landmark,
  ArrowRight,
  CalendarClock,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  CreditCard,
  Layers,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../store/useLanguageStore';
import { api } from '../../services/api';
import { Account, AccountSummary, Transaction } from '../../types';
import { BankAvatar } from '../ui/BankAvatar';
import { MexicanBankId, detectBankFromName } from '../../constants/mexicanBanks';



interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onOpenQuickAdd: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate, onOpenQuickAdd }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const insets = useSafeAreaInsets();

  const { colors, isDark } = useTheme();
  const { t, language } = useTranslation();
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
        api.getTransactions(1, 6).catch(() => ({ items: [] } as any)),
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

  // Safe dock height: dock (~56px) + gap (12px) + home indicator
  const dockBottomOffset = Platform.OS === 'web'
    ? 24
    : Math.max(insets.bottom, 12) + (isDesktop ? 16 : 8);

  const actionBtnBottomOffset = Platform.OS === 'web'
    ? (isDesktop ? 94 : 84)
    : dockBottomOffset + (isDesktop ? 56 : 52);

  const scrollPaddingBottom = isDesktop
    ? actionBtnBottomOffset + 70
    : dockBottomOffset + 80;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollPaddingBottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Top Status Header Strip */}
        <View style={styles.topStatusStrip}>

          <View>
            <Text style={[styles.welcomeGreeting, { color: colors.textPrimary }]}>
              {user?.name ? user.name.toUpperCase() : 'BILLETERA PRINCIPAL'}
            </Text>
          </View>

          <View style={styles.liveMetricsTag}>
            <View style={[styles.statusDot, { backgroundColor: colors.accentSuccess }]} />
            <Text style={[styles.liveTagText, { color: colors.textSecondary }]}>
              {language === 'es' ? 'TIEMPO REAL: ACTIVO' : 'REALTIME: ACTIVE'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>
              [ CARGANDO FLUJO DE CAJA... ]
            </Text>
          </View>
        ) : (
          <>
            {/* 3 Metric Summary Cards (Neo-Brutalist Frame with Hard Shadows) */}
            <View style={[styles.metricsGrid, isDesktop && styles.metricsGridDesktop]}>
              {/* Card 1: Liquid Available */}
              <View
                style={[
                  styles.metricCard,
                  isDesktop && styles.metricCardDesktop,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderColor,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
              >
                <View style={styles.metricCardHeader}>
                  <View style={styles.metricLabelRow}>
                    <Wallet size={15} color={colors.accentSuccess} strokeWidth={2.5} />
                    <Text style={[styles.metricCode, { color: colors.accentSuccess }]}>
                      [ 01 // LÍQUIDO ]
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { borderColor: colors.accentSuccess, backgroundColor: colors.accentSuccessSubtle }]}>
                    <Text style={[styles.statusPillText, { color: colors.accentSuccess }]}>DISPONIBLE</Text>
                  </View>
                </View>

                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  ${summary?.liquid_total || '0.00'}
                </Text>

                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  Listo para gastar · Cuentas corrientes
                </Text>
              </View>

              {/* Card 2: Grand Total */}
              <View
                style={[
                  styles.metricCard,
                  isDesktop && styles.metricCardDesktop,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderColor,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
              >
                <View style={styles.metricCardHeader}>
                  <View style={styles.metricLabelRow}>
                    <Landmark size={15} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.metricCode, { color: colors.accent }]}>
                      [ 02 // PATRIMONIO ]
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { borderColor: colors.accent, backgroundColor: colors.accentSubtle }]}>
                    <Text style={[styles.statusPillText, { color: colors.accent }]}>TOTAL</Text>
                  </View>
                </View>

                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  ${summary?.grand_total || '0.00'}
                </Text>

                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  Patrimonio consolidado con ahorros
                </Text>
              </View>

              {/* Card 3: 30-Day Projection */}
              <View
                style={[
                  styles.metricCard,
                  isDesktop && styles.metricCardDesktop,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderColor,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
              >
                <View style={styles.metricCardHeader}>
                  <View style={styles.metricLabelRow}>
                    <TrendingUp size={15} color={colors.accentWarning} strokeWidth={2.5} />
                    <Text style={[styles.metricCode, { color: colors.accentWarning }]}>
                      [ 03 // PROYECCIÓN ]
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { borderColor: colors.accentWarning, backgroundColor: colors.accentWarningSubtle }]}>
                    <Text style={[styles.statusPillText, { color: colors.accentWarning }]}>30 DÍAS</Text>
                  </View>
                </View>

                <Text style={[styles.metricValue, { color: colors.accentWarning }]}>
                  ${summary?.projected_grand_total || '0.00'}
                </Text>

                <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                  Flujo neto proyectado tras recurrentes
                </Text>
              </View>
            </View>

            {/* Accounts Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Landmark size={16} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    MIS CUENTAS Y FONDOS
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => onNavigate('accounts')}
                  style={styles.seeAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seeAllText, { color: colors.accent }]}>
                    GESTIONAR
                  </Text>
                  <ArrowRight size={12} color={colors.accent} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {accounts.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    [ NO HAY CUENTAS CONFIGURADAS EN EL SISTEMA ]
                  </Text>
                </View>
              ) : (
                <View style={[styles.accountsGrid, isDesktop && styles.accountsGridDesktop]}>
                  {accounts.map((acc) => (
                    <View
                      key={acc.id}
                      style={[
                        styles.accountBox,
                        isDesktop && styles.accountBoxDesktop,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderColor,
                          shadowColor: colors.shadowColor,
                          ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                        },
                      ]}
                    >
                      <View style={styles.accountBoxTop}>
                        <View style={styles.accountTypeRow}>
                          <BankAvatar
                            bankId={
                              acc.bank_id && acc.bank_id !== 'generic'
                                ? (acc.bank_id as MexicanBankId)
                                : detectBankFromName(acc.name) || 'generic'
                            }
                            size={24}
                          />
                          <Text style={[styles.accountName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {acc.name.toUpperCase()}
                          </Text>
                        </View>


                        <View
                          style={[
                            styles.accountPillBadge,
                            { borderColor: colors.borderColor, backgroundColor: colors.bgBase },
                          ]}
                        >
                          <Text style={[styles.accountPillBadgeText, { color: colors.textSecondary }]}>
                            {acc.account_type.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.accountBalanceNumber, { color: colors.textPrimary }]}>
                        ${acc.current_balance}
                      </Text>

                      <View style={styles.accountFooterRow}>
                        <Text style={[styles.accountProjLabel, { color: colors.textMuted }]}>
                          PROYECTADO:
                        </Text>
                        <Text style={[styles.accountProjValue, { color: colors.accent }]}>
                          ${acc.projected_balance}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Recent Transactions Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Receipt size={16} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    LIBRO DE MOVIMIENTOS RECIENTES
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => onNavigate('transactions')}
                  style={styles.seeAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seeAllText, { color: colors.accent }]}>
                    VER TODO EL LIBRO
                  </Text>
                  <ArrowRight size={12} color={colors.accent} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {transactions.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    [ NINGÚN MOVIMIENTO REGISTRADO RECIENTEMENTE ]
                  </Text>
                </View>
              ) : (
                <View style={styles.txListContainer}>
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'ingreso';
                    return (
                      <View
                        key={tx.id}
                        style={[
                          styles.txRow,
                          {
                            backgroundColor: colors.bgSurface,
                            borderColor: colors.borderColor,
                            shadowColor: colors.shadowColor,
                            ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                          },
                        ]}
                      >
                        <View style={styles.txLeftCol}>
                          <View
                            style={[
                              styles.txIconBox,
                              {
                                borderColor: isIncome ? colors.accentSuccess : colors.accentDanger,
                                backgroundColor: isIncome ? colors.accentSuccessSubtle : colors.accentDangerSubtle,
                              },
                            ]}
                          >
                            {isIncome ? (
                              <ArrowDownLeft size={16} color={colors.accentSuccess} strokeWidth={2.5} />
                            ) : (
                              <ArrowUpRight size={16} color={colors.accentDanger} strokeWidth={2.5} />
                            )}
                          </View>

                          <View>
                            <Text style={[styles.txConceptText, { color: colors.textPrimary }]}>
                              {tx.concept || 'Movimiento'}
                            </Text>
                            <View style={styles.txMetaRow}>
                              <Text style={[styles.txCategoryTag, { color: colors.accent }]}>
                                [ {tx.category ? tx.category.toUpperCase() : 'GENERAL'} ]
                              </Text>
                              <Text style={[styles.txDateText, { color: colors.textMuted }]}>
                                {tx.date}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.txAmountText,
                            {
                              color: isIncome ? colors.accentSuccess : colors.textPrimary,
                            },
                          ]}
                        >
                          {isIncome ? '+' : '-'}${tx.amount}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Desktop Floating Action CTA: Docked right above the floating navigation dock */}
      {isDesktop && !isLoading && (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingActionRoot,
            { bottom: actionBtnBottomOffset },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.floatingActionBtn,
              {
                backgroundColor: colors.accent,
                borderColor: colors.borderColor,
                shadowColor: colors.shadowColor,
                maxWidth: 520,
                ...(Platform.OS === 'web' ? { boxShadow: `5px 5px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
            onPress={onOpenQuickAdd}
            activeOpacity={0.8}
            accessibilityLabel="Registrar nuevo movimiento"
          >
            <View style={styles.heroAddIconBox}>
              <Plus size={16} color="#000000" strokeWidth={3} />
            </View>
            <Text style={styles.floatingActionBtnText}>
              + REGISTRAR MOVIMIENTO
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topStatusStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  welcomeGreeting: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  liveMetricsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingLabel: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'column',
    gap: 14,
    marginBottom: 20,
  },
  metricsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  metricCard: {
    borderWidth: 2,
    padding: 18,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  metricCardDesktop: {
    flex: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricCode: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricSub: {
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 15,
  },
  heroAddBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  heroAddIconBox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingActionRoot: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 78 : 82,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    paddingHorizontal: 12,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    width: '100%',
    borderWidth: 2,
    paddingHorizontal: 16,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  floatingActionBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
    textTransform: 'uppercase',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  emptyBox: {
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  accountsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  accountsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accountBox: {
    borderWidth: 2,
    padding: 16,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  accountBoxDesktop: {
    width: '48.5%',
  },
  accountBoxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accountTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  accountPillBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  accountPillBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  accountBalanceNumber: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  accountFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
  },
  accountProjLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  accountProjValue: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  txListContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    padding: 12,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  txLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txConceptText: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  txCategoryTag: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  txDateText: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  txAmountText: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
