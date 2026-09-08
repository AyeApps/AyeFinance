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
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  CreditCard,
  Layers,
  PiggyBank,
  Zap,
  Sparkles,
  Coins,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../store/useLanguageStore';
import { api } from '../../services/api';
import { widgetBridge } from '../../services/widgetBridge';
import { authStorage } from '../../services/authStorage';
import { Account, AccountSummary, Transaction } from '../../types';
import { BankAvatar } from '../ui/BankAvatar';
import {
  MexicanBankId,
  detectBankFromName,
  getBankDefinition,
  cleanAccountDisplayName,
} from '../../constants/mexicanBanks';
import {
  evaluateFinancingCycle,
  calculateAllCreditCardsPaymentSummary,
  CreditCardPaymentEstimates,
} from '../../utils/cardBenefits';
import { QuickAddInitialData } from '../transactions/QuickAddModal';

export const formatMoney = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onOpenQuickAdd: (initialData?: QuickAddInitialData) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate, onOpenQuickAdd }) => {
  const { width } = useWindowDimensions();
  const isPhone = width < 640;
  const isSmallPhone = width < 380;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;
  const isExpanded = width >= 640;
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
        api.getTransactions(1, 40).catch(() => ({ items: [] } as any)),
      ]);
      setSummary(sumRes);
      setAccounts(accRes);
      const items = txRes.items || [];
      setTransactions(items.slice(0, 6));

      authStorage.getAccessToken().then((token) => {
        if (token && Array.isArray(accRes)) {
          widgetBridge.syncWidgetData(token, accRes, items, sumRes || undefined).catch(() => {});
        }
      });
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
    : Math.max(insets.bottom, 12) + (isExpanded ? 16 : 8);

  const actionBtnBottomOffset = Platform.OS === 'web'
    ? (isDesktop ? 94 : 84)
    : dockBottomOffset + (isDesktop ? 56 : 52);

  const scrollPaddingBottom = isExpanded
    ? dockBottomOffset + 80
    : dockBottomOffset + 96;

  // Computed balances & flow velocity metrics
  const liquidNum = parseFloat(String(summary?.liquid_total || '0').replace(/[^0-9.-]/g, '')) || 0;
  const savingsNum = parseFloat(String(summary?.savings_total || '0').replace(/[^0-9.-]/g, '')) || 0;
  const grandNum = parseFloat(String(summary?.grand_total || '0').replace(/[^0-9.-]/g, '')) || (liquidNum + savingsNum);

  const liquidPct = grandNum > 0 ? Math.max(0, Math.min(100, Math.round((liquidNum / grandNum) * 100))) : 50;
  const savingsPct = 100 - liquidPct;

  const todayExp = parseFloat(String(summary?.today_expenses ?? '0').replace(/[^0-9.-]/g, '')) || 0;
  const todayInc = parseFloat(String(summary?.today_income ?? '0').replace(/[^0-9.-]/g, '')) || 0;
  const todayNet = todayInc - todayExp;

  const monthExp = parseFloat(String(summary?.month_expenses ?? '0').replace(/[^0-9.-]/g, '')) || 0;
  const monthInc = parseFloat(String(summary?.month_income ?? '0').replace(/[^0-9.-]/g, '')) || 0;
  const monthNet = monthInc - monthExp;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isPhone ? 16 : isTablet ? 24 : 32,
            paddingTop: isPhone ? 16 : 24,
            paddingBottom: scrollPaddingBottom,
          },
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

          <View style={styles.topHeaderActions}>

            {isExpanded && (
              <TouchableOpacity
                style={[
                  styles.topRegisterBtn,
                  {
                    backgroundColor: colors.accent,
                    borderColor: colors.borderColor,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={() => onOpenQuickAdd()}
                activeOpacity={0.8}
                accessibilityLabel="Registrar nuevo movimiento"
              >
                <Plus size={13} color="#000000" strokeWidth={3} />
                <Text style={styles.topRegisterBtnText}>+ REGISTRAR</Text>
              </TouchableOpacity>
            )}
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
            {/* 4 Metric Summary Cards: Liquid, Savings, Grand Total, Projection */}
            <View style={[styles.metricsGrid, isDesktop && styles.metricsGridDesktop]}>
              {/* Card 1: Liquid Available */}
              <View
                style={[
                  styles.metricCard,
                  isSmallPhone && styles.metricCardSmallPhone,
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
                    <Wallet size={14} color={colors.accentSuccess} strokeWidth={2.5} />
                    <Text style={[styles.metricCode, { color: colors.accentSuccess }]}>
                      [ 01 // LÍQUIDO ]
                    </Text>
                  </View>
                  {isExpanded && (
                    <View style={[styles.statusPill, { borderColor: colors.accentSuccess, backgroundColor: colors.accentSuccessSubtle }]}>
                      <Text style={[styles.statusPillText, { color: colors.accentSuccess }]}>
                        {isDesktop ? t.dashboard.liquidRatio.toUpperCase() : `${liquidPct}%`}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  ${formatMoney(summary?.liquid_total)}
                </Text>

                <Text style={[styles.metricSub, { color: colors.textMuted }]} numberOfLines={2}>
                  {t.dashboard.liquidSubtitle}
                </Text>
              </View>

              {/* Card 2: Savings Reserve */}
              <View
                style={[
                  styles.metricCard,
                  isSmallPhone && styles.metricCardSmallPhone,
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
                    <PiggyBank size={14} color="#38bdf8" strokeWidth={2.5} />
                    <Text style={[styles.metricCode, { color: '#38bdf8' }]}>
                      [ 02 // RESERVA ]
                    </Text>
                  </View>
                  {isExpanded && (
                    <View style={[styles.statusPill, { borderColor: '#38bdf8', backgroundColor: isDark ? '#0c263b' : '#e0f2fe' }]}>
                      <Text style={[styles.statusPillText, { color: '#38bdf8' }]}>
                        {isDesktop ? t.dashboard.savingsRatio.toUpperCase() : `${savingsPct}%`}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  ${formatMoney(summary?.savings_total)}
                </Text>

                <Text style={[styles.metricSub, { color: colors.textMuted }]} numberOfLines={2}>
                  {t.dashboard.savingsSubtitle}
                </Text>
              </View>

              {/* Card 3: Grand Total */}
              <View
                style={[
                  styles.metricCard,
                  isSmallPhone && styles.metricCardSmallPhone,
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
                    <Landmark size={14} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.metricCode, { color: colors.accent }]}>
                      [ 03 // TOTAL ]
                    </Text>
                  </View>
                  {isExpanded && null}
                </View>

                <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  ${formatMoney(summary?.grand_total)}
                </Text>

                <Text style={[styles.metricSub, { color: colors.textMuted }]} numberOfLines={2}>
                  {t.dashboard.totalSubtitle}
                </Text>
              </View>

              {/* Card 4: 30-Day Projection */}
              <View
                style={[
                  styles.metricCard,
                  isSmallPhone && styles.metricCardSmallPhone,
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
                    <TrendingUp size={14} color={colors.accentWarning} strokeWidth={2.5} />
                    <Text style={[styles.metricCode, { color: colors.accentWarning }]}>
                      [ 04 // PROYECCIÓN ]
                    </Text>
                  </View>
                  {isExpanded && (
                    <View style={[styles.statusPill, { borderColor: colors.accentWarning, backgroundColor: colors.accentWarningSubtle }]}>
                      <Text style={[styles.statusPillText, { color: colors.accentWarning }]}>
                        30D
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.metricValue, { color: colors.accentWarning }]} numberOfLines={1} adjustsFontSizeToFit>
                  ${formatMoney(summary?.projected_grand_total)}
                </Text>

                <Text style={[styles.metricSub, { color: colors.textMuted }]} numberOfLines={2}>
                  {t.dashboard.projectedSubtitle}
                </Text>
              </View>
            </View>

            {/* Capital Allocation & Liquidity Ratio Bar */}
            <View
              style={[
                styles.allocationCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderColor,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
            >
              <View style={[styles.allocationHeader, isPhone && styles.allocationHeaderMobile]}>
                <View style={styles.allocationTitleRow}>
                  <Layers size={13} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.allocationTitle, { color: colors.textPrimary }]}>
                    {t.dashboard.capitalDistribution}
                  </Text>
                </View>
                <Text style={[styles.allocationRatioText, { color: colors.accent }]}>
                  [ {liquidPct}% {t.dashboard.liquidRatio.toUpperCase()} · {savingsPct}% {t.dashboard.savingsRatio.toUpperCase()} ]
                </Text>
              </View>

              <View style={[styles.allocationTrack, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                <View
                  style={[
                    styles.allocationSegment,
                    {
                      width: `${liquidPct}%`,
                      backgroundColor: colors.accentSuccess,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.allocationSegment,
                    {
                      width: `${savingsPct}%`,
                      backgroundColor: '#38bdf8',
                    },
                  ]}
                />
              </View>

              <View style={styles.allocationLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentSuccess }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    {t.dashboard.liquidRatio}: ${formatMoney(liquidNum)}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#38bdf8' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    {t.dashboard.savingsRatio}: ${formatMoney(savingsNum)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Velocity of Cash Flow & Consumption Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <CalendarClock size={16} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t.dashboard.flowVelocityTitle}
                  </Text>
                </View>
              </View>

              <View style={[styles.flowGrid, isExpanded && styles.flowGridDesktop]}>
                {/* Flow Card 1: Today's Velocity */}
                <View
                  style={[
                    styles.flowCard,
                    isExpanded && styles.flowCardDesktop,
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
                      <Zap size={15} color={todayExp > 0 ? colors.accentDanger : colors.accentSuccess} strokeWidth={2.5} />
                      <Text
                        style={[
                          styles.metricCode,
                          { color: todayExp > 0 ? colors.accentDanger : colors.accentSuccess },
                        ]}
                      >
                        [ 01 // {t.dashboard.todaySpend.toUpperCase()} ]
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.flowHeroValue,
                      { color: todayExp > 0 ? colors.accentDanger : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    ${formatMoney(todayExp)}
                  </Text>

                  <View style={[styles.flowTelemetryRow, { borderTopColor: colors.borderColor }]}>
                    <View style={styles.flowTelemetryItem}>
                      <Text style={[styles.flowTelemetryLabel, { color: colors.textMuted }]}>
                        {t.dashboard.todayIncome}
                      </Text>
                      <Text style={[styles.flowTelemetryValue, { color: colors.accentSuccess }]}>
                        +${formatMoney(todayInc)}
                      </Text>
                    </View>

                    <View style={[styles.flowTelemetryItem, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.flowTelemetryLabel, { color: colors.textMuted }]}>
                        {t.dashboard.todayNet}
                      </Text>
                      <Text
                        style={[
                          styles.flowTelemetryValue,
                          {
                            color:
                              todayNet > 0
                                ? colors.accentSuccess
                                : todayNet < 0
                                ? colors.accentDanger
                                : colors.textPrimary,
                          },
                        ]}
                      >
                        {todayNet > 0 ? '+' : ''}${formatMoney(todayNet)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Flow Card 2: This Month's Consumption */}
                <View
                  style={[
                    styles.flowCard,
                    isExpanded && styles.flowCardDesktop,
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
                      <Calendar size={15} color={colors.accent} strokeWidth={2.5} />
                      <Text style={[styles.metricCode, { color: colors.accent }]}>
                        [ 02 // {t.dashboard.monthSpend.toUpperCase()} ]
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          borderColor: monthNet >= 0 ? colors.accentSuccess : colors.accentDanger,
                          backgroundColor: monthNet >= 0 ? colors.accentSuccessSubtle : colors.accentDangerSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: monthNet >= 0 ? colors.accentSuccess : colors.accentDanger },
                        ]}
                      >
                        {monthNet >= 0 ? t.dashboard.surplus : t.dashboard.deficit}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.flowHeroValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${formatMoney(monthExp)}
                  </Text>

                  <View style={[styles.flowTelemetryRow, { borderTopColor: colors.borderColor }]}>
                    <View style={styles.flowTelemetryItem}>
                      <Text style={[styles.flowTelemetryLabel, { color: colors.textMuted }]}>
                        {t.dashboard.monthIncome}
                      </Text>
                      <Text style={[styles.flowTelemetryValue, { color: colors.accentSuccess }]}>
                        +${formatMoney(monthInc)}
                      </Text>
                    </View>

                    <View style={[styles.flowTelemetryItem, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.flowTelemetryLabel, { color: colors.textMuted }]}>
                        {t.dashboard.monthNet}
                      </Text>
                      <Text
                        style={[
                          styles.flowTelemetryValue,
                          {
                            color:
                              monthNet > 0
                                ? colors.accentSuccess
                                : monthNet < 0
                                ? colors.accentDanger
                                : colors.textPrimary,
                          },
                        ]}
                      >
                        {monthNet > 0 ? '+' : ''}${formatMoney(monthNet)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Intelligent Rewards & Financing Strategy Modules */}
            {((parseFloat(String(summary?.month_cashback ?? '0')) > 0 || Number(summary?.month_points ?? 0) > 0) || accounts.some((a) => a.account_type === 'credito' && a.cut_off_day)) && (
              <View style={styles.sectionContainer}>
                {/* 1. Monthly Rewards & Cashback Summary Pill/Card */}
                {(parseFloat(String(summary?.month_cashback ?? '0')) > 0 || Number(summary?.month_points ?? 0) > 0) && (
                  <View
                    style={[
                      styles.rewardsDashboardCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: '#00e676',
                        shadowColor: colors.shadowColor,
                        ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                      },
                    ]}
                  >
                    <View style={styles.rewardsDashboardHeader}>
                      <View style={styles.rewardsHeaderLeft}>
                        <Sparkles size={15} color="#00e676" strokeWidth={2.5} />
                        <Text style={[styles.rewardsDashboardTag, { color: '#00e676' }]}>
                          RECOMPENSAS ACUMULADAS EN EL MES
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rewardsAmountsRow}>
                      {parseFloat(String(summary?.month_cashback ?? '0')) > 0 && (
                        <View style={styles.rewardsAmountCol}>
                          <Text style={[styles.rewardsAmountValue, { color: '#00e676' }]}>
                            +${formatMoney(summary?.month_cashback)} MXN
                          </Text>
                          <Text style={[styles.rewardsAmountLabel, { color: colors.textSecondary }]}>
                            CASHBACK DIRECTO
                          </Text>
                        </View>
                      )}

                      {Number(summary?.month_points ?? 0) > 0 && (
                        <View style={styles.rewardsAmountCol}>
                          <Text style={[styles.rewardsAmountValue, { color: '#004481' }]}>
                            +{Number(summary?.month_points).toLocaleString()}
                          </Text>
                          <Text style={[styles.rewardsAmountLabel, { color: colors.textSecondary }]}>
                            PUNTOS BBVA
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* 2. Best Card To Buy Strategy ("Hasta 50 Días Gratis") */}
                {(() => {
                  const creditCardsWithCycle = accounts
                    .filter((a) => a.account_type === 'credito' && a.cut_off_day)
                    .map((a) => ({
                      account: a,
                      cycle: evaluateFinancingCycle(a.cut_off_day, a.payment_due_day, a.payment_grace_days),
                    }))
                    .sort((a, b) => b.cycle.daysOfFinancing - a.cycle.daysOfFinancing);

                  if (creditCardsWithCycle.length === 0) return null;
                  const best = creditCardsWithCycle[0];

                  return (
                    <View
                      style={[
                        styles.bestCardBanner,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.accent,
                          shadowColor: colors.shadowColor,
                          marginTop: (parseFloat(String(summary?.month_cashback ?? '0')) > 0 || Number(summary?.month_points ?? 0) > 0) ? 12 : 0,
                          ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                        },
                      ]}
                    >
                      <View style={styles.bestCardHeader}>
                        <View style={styles.bestCardHeaderLeft}>
                          <Zap size={14} color={colors.accent} strokeWidth={2.5} />
                          <Text style={[styles.bestCardBadgeText, { color: colors.accent }]}>
                            ESTRATEGIA // MEJOR TARJETA PARA COMPRAR HOY
                          </Text>
                        </View>
                        <View style={[styles.statusPill, { borderColor: colors.accent, backgroundColor: colors.accentSubtle }]}>
                          <Text style={[styles.statusPillText, { color: colors.accent }]}>
                            {best.cycle.daysOfFinancing} DÍAS LIBRES
                          </Text>
                        </View>
                      </View>

                      <View style={styles.bestCardBody}>
                        <View style={styles.bestCardMainRow}>
                          <CreditCard size={17} color={colors.textPrimary} strokeWidth={2.5} />
                          <Text style={[styles.bestCardName, { color: colors.textPrimary }]}>
                            {best.account.name.toUpperCase()}
                          </Text>
                          {best.account.card_product ? (
                            <View style={[styles.productPill, { borderColor: colors.borderMuted, backgroundColor: colors.bgBase }]}>
                              <Text style={[styles.productPillText, { color: colors.accent }]}>
                                {best.account.card_product.toUpperCase()}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={[styles.bestCardAdvice, { color: colors.textSecondary }]}>
                          {best.cycle.advice}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* 3. Intelligent Credit Cards Payment Estimator (Banxico / Condusef) */}
            {(() => {
              const paymentSummary = calculateAllCreditCardsPaymentSummary(accounts);
              if (paymentSummary.cardsWithDebt.length === 0) return null;

              return (
                <View style={styles.sectionContainer}>
                  <View
                    style={[
                      styles.creditPaymentsCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderColor,
                        shadowColor: colors.shadowColor,
                        ...(Platform.OS === 'web' ? { boxShadow: `6px 6px 0px 0px ${colors.shadowColor}` } : {}),
                      },
                    ]}
                  >
                    {/* Header */}
                    <View style={[styles.creditPaymentsHeader, { borderBottomColor: colors.borderColor }]}>
                      <View style={styles.creditPaymentsHeaderLeft}>
                        <CreditCard size={16} color={colors.accent} strokeWidth={2.5} />
                        <View>
                          <Text style={[styles.creditPaymentsTitle, { color: colors.textPrimary }]}>
                            PRÓXIMOS PAGOS DE TARJETAS DE CRÉDITO
                          </Text>
                          <Text style={[styles.creditPaymentsSub, { color: colors.accent }]}>
                            // ESTIMACIÓN INTELIGENTE BANXICO · {paymentSummary.cardsWithDebt.length} {paymentSummary.cardsWithDebt.length === 1 ? 'TARJETA CON SALDO' : 'TARJETAS CON SALDO'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Total Summary Row */}
                    <View
                      style={[
                        styles.creditTotalsBanner,
                        isSmallPhone && styles.creditTotalsBannerMobile,
                        { backgroundColor: colors.bgBase, borderColor: colors.borderMuted },
                      ]}
                    >
                      <View style={styles.creditTotalCol}>
                        <Text style={[styles.creditTotalLabel, { color: colors.textSecondary }]}>
                          TOTAL PARA NO GENERAR INTERESES
                        </Text>
                        <Text
                          style={[styles.creditTotalVal, { color: colors.accentSuccess }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          ${formatMoney(paymentSummary.totalNoInterest)} MXN
                        </Text>
                        <Text style={[styles.creditTotalHint, { color: colors.textMuted }]}>
                          Liquidación total de saldo dispuesto
                        </Text>
                      </View>

                      {!isSmallPhone && (
                        <View style={[styles.creditTotalColDivider, { backgroundColor: colors.borderMuted }]} />
                      )}

                      <View style={styles.creditTotalCol}>
                        <Text style={[styles.creditTotalLabel, { color: colors.textSecondary }]}>
                          TOTAL PAGOS MÍNIMOS ESTIMADOS
                        </Text>
                        <Text
                          style={[styles.creditTotalVal, { color: colors.accentWarning }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          ${formatMoney(paymentSummary.totalMinimum)} MXN
                        </Text>
                        <Text style={[styles.creditTotalHint, { color: colors.textMuted }]}>
                          Cálculo regulatorio Banxico/Condusef
                        </Text>
                      </View>
                    </View>

                    {/* Card Breakdown List */}
                    <View style={styles.creditCardsBreakdownList}>
                      {paymentSummary.cardsWithDebt.map((card) => {
                        return (
                          <View
                            key={card.account.id}
                            style={[
                              styles.creditCardBreakdownItem,
                              {
                                borderColor: colors.borderMuted,
                                backgroundColor: colors.bgBase,
                              },
                            ]}
                          >
                            <View style={styles.creditCardItemTop}>
                              <View style={styles.creditCardItemLeft}>
                                <BankAvatar
                                  bankId={
                                    card.account.bank_id && card.account.bank_id !== 'generic'
                                      ? (card.account.bank_id as MexicanBankId)
                                      : detectBankFromName(card.account.name) || 'generic'
                                  }
                                  size={24}
                                  showBorder={false}
                                />
                                <View style={{ flexShrink: 1 }}>
                                  <View style={styles.creditCardTitleRow}>
                                    <Text style={[styles.creditCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                                      {card.account.name.toUpperCase()}
                                    </Text>
                                    <View style={[styles.productPill, { borderColor: colors.borderMuted, backgroundColor: colors.bgSurface }]}>
                                      <Text style={[styles.productPillText, { color: colors.accentDanger }]}>
                                        TDC
                                      </Text>
                                    </View>
                                  </View>
                                  {card.dueDateLabel ? (
                                    <View style={styles.creditCardDueRow}>
                                      <CalendarClock size={11} color={card.isOverdueRisk ? colors.accentDanger : colors.accent} strokeWidth={2.5} />
                                      <Text
                                        style={[
                                          styles.creditCardDueText,
                                          { color: card.isOverdueRisk ? colors.accentDanger : colors.textSecondary },
                                        ]}
                                      >
                                        LÍMITE: <Text style={{ fontWeight: '900', color: card.isOverdueRisk ? colors.accentDanger : colors.textPrimary }}>{card.dueDateLabel.toUpperCase()}</Text>
                                        {card.daysUntilDue !== undefined && (
                                          <Text style={{ color: card.isOverdueRisk ? colors.accentDanger : colors.accent, fontWeight: '900' }}> ({card.daysUntilDue}d)</Text>
                                        )}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>

                              {/* Pay Button */}
                              <TouchableOpacity
                                style={[
                                  styles.cardPayBtn,
                                  {
                                    backgroundColor: colors.accent,
                                    borderColor: colors.borderColor,
                                    shadowColor: colors.shadowColor,
                                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                                  },
                                ]}
                                onPress={() => {
                                  onOpenQuickAdd({
                                    type: 'transferencia',
                                    transferTarget: 'own',
                                    destinationAccountId: card.account.id,
                                    amount: String(card.noInterestPayment),
                                    concept: `Pago TDC: ${card.account.name}`,
                                  });
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.cardPayBtnText}>PAGAR</Text>
                                <ArrowRight size={12} color="#000000" strokeWidth={3} />
                              </TouchableOpacity>
                            </View>

                            {/* Dual Amount Pills */}
                            <View style={styles.cardAmountsRow}>
                              <View style={[styles.cardAmountPill, { borderColor: colors.accentSuccess, backgroundColor: colors.bgSurface }]}>
                                <Text style={[styles.cardAmountPillLabel, { color: colors.textSecondary }]}>
                                  NO GENERAR INTERESES
                                </Text>
                                <Text style={[styles.cardAmountPillValue, { color: colors.accentSuccess }]}>
                                  ${formatMoney(card.noInterestPayment)}
                                </Text>
                              </View>

                              <View style={[styles.cardAmountPill, { borderColor: colors.accentWarning, backgroundColor: colors.bgSurface }]}>
                                <Text style={[styles.cardAmountPillLabel, { color: colors.textSecondary }]}>
                                  PAGO MÍNIMO EST.
                                </Text>
                                <Text style={[styles.cardAmountPillValue, { color: colors.accentWarning }]}>
                                  ${formatMoney(card.minimumPayment)}
                                </Text>
                              </View>

                              <View style={[styles.cardAmountPill, { borderColor: colors.borderMuted, backgroundColor: colors.bgSurface }]}>
                                <Text style={[styles.cardAmountPillLabel, { color: colors.textSecondary }]}>
                                  SALDO UTILIZADO
                                </Text>
                                <Text style={[styles.cardAmountPillValue, { color: colors.textPrimary }]}>
                                  ${formatMoney(card.currentDebt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Responsive Multi-Screen Layout: 2-Column Split on Desktop, Stacked on Mobile/Tablet */}
            <View style={[styles.dualColumnContainer, isDesktop && styles.dualColumnContainerDesktop]}>
              {/* Left Column: Accounts & Funds */}
              <View style={[styles.dualColumnCol, isDesktop && styles.dualColumnColDesktop]}>
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
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Gestionar cuentas"
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
                    <View style={[styles.accountsGrid, isExpanded && !isDesktop && styles.accountsGridDesktop]}>
                      {accounts.map((acc) => {
                        const resolvedBankId =
                          acc.bank_id && acc.bank_id !== 'generic'
                            ? (acc.bank_id as MexicanBankId)
                            : detectBankFromName(acc.name) || 'generic';
                        const bankDef = getBankDefinition(resolvedBankId);
                        const displayName = cleanAccountDisplayName(acc.name, resolvedBankId);

                        return (
                          <View
                            key={acc.id}
                            style={[
                              styles.accountBox,
                              isExpanded && !isDesktop && styles.accountBoxDesktop,
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
                                <BankAvatar bankId={resolvedBankId} size={28} />
                                <View style={styles.accountInfoCol}>
                                  {resolvedBankId !== 'generic' && (
                                    <Text style={[styles.accountBankSub, { color: colors.accent }]} numberOfLines={1}>
                                      {bankDef.shortName.toUpperCase()} {acc.card_product ? `• ${acc.card_product.toUpperCase()}` : ''}
                                    </Text>
                                  )}
                                  <Text style={[styles.accountName, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {displayName}
                                  </Text>
                                </View>
                              </View>

                              <View
                                style={[
                                  styles.accountPillBadge,
                                  { borderColor: colors.borderColor, backgroundColor: colors.bgBase },
                                ]}
                              >
                                <Text style={[styles.accountPillBadgeText, { color: colors.textSecondary }]}>
                                  {acc.account_type === 'corriente' ? 'DÉBITO' : acc.account_type.toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            <Text style={[styles.accountBalanceNumber, { color: colors.textPrimary }]}>
                              ${formatMoney(acc.current_balance)}
                            </Text>

                            <View style={styles.accountFooterRow}>
                              <Text style={[styles.accountProjLabel, { color: colors.textMuted }]}>
                                {acc.account_type === 'credito' && acc.credit_limit ? 'DISPONIBLE:' : 'PROYECTADO:'}
                              </Text>
                              <Text
                                style={[
                                  styles.accountProjValue,
                                  {
                                    color:
                                      acc.account_type === 'credito' && acc.credit_limit
                                        ? colors.accentSuccess
                                        : colors.accent,
                                  },
                                ]}
                              >
                                ${acc.account_type === 'credito' && acc.credit_limit
                                  ? formatMoney(Math.max(0, (parseFloat(String(acc.credit_limit)) || 0) - (parseFloat(String(acc.current_balance)) || 0)))
                                  : formatMoney(acc.projected_balance)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>

              {/* Right Column: Recent Transactions Ledger */}
              <View style={[styles.dualColumnCol, isDesktop && styles.dualColumnColDesktop]}>
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
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Ver todo el libro de movimientos"
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

                              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                                <Text style={[styles.txConceptText, { color: colors.textPrimary }]} numberOfLines={1}>
                                  {tx.concept || 'Movimiento'}
                                </Text>
                                <View style={styles.txMetaRow}>
                                  <Text style={[styles.txCategoryTag, { color: colors.accent }]}>
                                    [ {tx.category ? tx.category.toUpperCase() : 'GENERAL'} ]
                                  </Text>
                                  <Text style={[styles.txDateText, { color: colors.textMuted }]}>
                                    {tx.date}
                                  </Text>
                                  {Boolean(tx.is_msi && tx.msi_months) && (
                                    <Text style={[styles.txMsiTag, { color: colors.accentWarning }]}>
                                      [{tx.msi_months} MSI · ${formatMoney(tx.msi_monthly_amount)}/m]
                                    </Text>
                                  )}
                                  {Boolean(tx.cashback_earned && parseFloat(String(tx.cashback_earned)) > 0) && (
                                    <Text style={[styles.txRewardTag, { color: colors.accentSuccess }]}>
                                      [+${formatMoney(tx.cashback_earned)}]
                                    </Text>
                                  )}
                                  {Boolean(tx.points_earned && Number(tx.points_earned) > 0) && (
                                    <Text style={[styles.txRewardTag, { color: '#00b0ff' }]}>
                                      [+{Number(tx.points_earned).toLocaleString()} PTS]
                                    </Text>
                                  )}
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
                              {isIncome ? '+' : '-'}${formatMoney(tx.amount)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  topStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 34,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  topRegisterBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 14,
    marginBottom: 20,
  },
  metricCard: {
    borderWidth: 2,
    padding: 12,
    width: '48%',
    flexGrow: 1,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  metricCardSmallPhone: {
    width: '100%',
  },
  metricCardDesktop: {
    flex: 1,
    width: 'auto',
    padding: 16,
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
    fontSize: 19,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 14,
  },
  allocationCard: {
    borderWidth: 2,
    padding: 14,
    marginBottom: 24,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  allocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  allocationHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  allocationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allocationTitle: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  allocationRatioText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  allocationTrack: {
    height: 7,
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  allocationSegment: {
    height: '100%',
  },
  allocationLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  flowGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  flowGridDesktop: {
    flexDirection: 'row',
    gap: 14,
  },
  flowCard: {
    borderWidth: 2,
    padding: 16,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  flowCardDesktop: {
    flex: 1,
  },
  flowHeroValue: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  flowTelemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    gap: 8,
  },
  flowTelemetryItem: {
    flex: 1,
  },
  flowTelemetryLabel: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  flowTelemetryValue: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  accountInfoCol: {
    gap: 1,
    flex: 1,
  },
  accountBankSub: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
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
  rewardsDashboardCard: {
    borderWidth: 2,
    padding: 14,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    gap: 12,
  },
  rewardsDashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardsDashboardTag: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  rewardsAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  rewardsAmountCol: {
    gap: 2,
  },
  rewardsAmountValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  rewardsAmountLabel: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  bestCardBanner: {
    borderWidth: 2,
    padding: 14,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    gap: 10,
  },
  bestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bestCardBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  bestCardBody: {
    gap: 6,
  },
  bestCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bestCardName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  productPill: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productPillText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bestCardAdvice: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  txMsiTag: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.4,
  },
  txRewardTag: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.4,
  },
  creditPaymentsCard: {
    borderWidth: 2,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  creditPaymentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  creditPaymentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creditPaymentsTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  creditPaymentsSub: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  creditTotalsBanner: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    padding: 14,
    gap: 12,
  },
  creditTotalsBannerMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  creditTotalCol: {
    flex: 1,
    gap: 3,
  },
  creditTotalColDivider: {
    width: 1,
  },
  creditTotalLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  creditTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.4,
  },
  creditTotalHint: {
    fontSize: 8.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  creditCardsBreakdownList: {
    padding: 14,
    gap: 10,
  },
  creditCardBreakdownItem: {
    borderWidth: 1.5,
    padding: 12,
    gap: 10,
  },
  creditCardItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  creditCardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  creditCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  creditCardName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  creditCardDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  creditCardDueText: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardPayBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardAmountsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardAmountPill: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
  cardAmountPillLabel: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  cardAmountPillValue: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dualColumnContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 0,
  },
  dualColumnContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  dualColumnCol: {
    width: '100%',
  },
  dualColumnColDesktop: {
    flex: 1,
    minWidth: 0,
  },
});
