import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Landmark, PiggyBank, LineChart, X, CreditCard, Calendar, TrendingUp, ShieldCheck, Zap, Pencil, Percent, Check } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useFinanceStore } from '../../store/useFinanceStore';
import { api } from '../../services/api';
import { Account, AccountType } from '../../types';
import { BankAvatar } from '../ui/BankAvatar';
import { BankSelector } from '../ui/BankSelector';
import {
  evaluateCreditUtilization,
  evaluateFinancingCycle,
  evaluateAnnuityExemption,
  calculateDailyYield,
  POPULAR_YIELD_PRESETS,
} from '../../utils/cardBenefits';
import {
  MexicanBankId,
  detectBankFromName,
  getBankDefinition,
  cleanAccountDisplayName,
  ACCOUNT_NAME_SUGGESTIONS,
  BankDefinition,
  getBankCreditCards,
  getBankDebitCards,
} from '../../constants/mexicanBanks';

const PALETTE = ['#FE9D01', '#00e676', '#00b0ff', '#a855f7', '#ec4899', '#ff1744'];

const ACCOUNT_INSTRUMENTS: { id: 'debito' | 'credito'; label: string; sub: string }[] = [
  { id: 'debito', label: 'TARJETA DÉBITO', sub: 'CUENTA BANCARIA' },
  { id: 'credito', label: 'TARJETA CRÉDITO', sub: 'LÍNEA DE CRÉDITO' },
];

const ACCOUNT_USAGES: { id: 'debito' | 'ahorro' | 'inversion'; label: string; sub: string }[] = [
  { id: 'debito', label: 'GASTO DIARIO', sub: 'LÍQUIDO' },
  { id: 'ahorro', label: 'CUENTA AHORRO', sub: 'PATRIMONIO' },
  { id: 'inversion', label: 'INVERSIÓN', sub: 'PATRIMONIO' },
];

const formatMoney = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberWithCommas = (text: string): string => {
  if (!text) return '';
  const clean = text.replace(/[^0-9.]/g, '');
  if (!clean) return '';

  const parts = clean.split('.');
  const intPart = parts[0] || '0';
  const decPart = parts.length > 1 ? parts.slice(1).join('') : null;

  const trimmedInt = intPart.replace(/^0+(?=\d)/, '');
  const formattedInt = trimmedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (decPart !== null) {
    return `${formattedInt}.${decPart.slice(0, 2)}`;
  }
  return formattedInt;
};

interface BankGroup {
  bankId: MexicanBankId;
  bankDef: BankDefinition;
  totalBalance: number;
  totalProjected: number;
  accounts: Account[];
}

const groupAccountsByBank = (accountsList: Account[]): BankGroup[] => {
  const groupsMap = new Map<MexicanBankId, BankGroup>();

  for (const acc of accountsList) {
    const resolvedBankId: MexicanBankId =
      acc.bank_id && acc.bank_id !== 'generic'
        ? (acc.bank_id as MexicanBankId)
        : detectBankFromName(acc.name);

    const bankDef = getBankDefinition(resolvedBankId);
    const currBal = parseFloat(acc.current_balance) || 0;
    const projBal = parseFloat(acc.projected_balance) || 0;

    if (!groupsMap.has(resolvedBankId)) {
      groupsMap.set(resolvedBankId, {
        bankId: resolvedBankId,
        bankDef,
        totalBalance: currBal,
        totalProjected: projBal,
        accounts: [acc],
      });
    } else {
      const existing = groupsMap.get(resolvedBankId)!;
      existing.totalBalance += currBal;
      existing.totalProjected += projBal;
      existing.accounts.push(acc);
    }
  }

  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.bankId === 'generic') return 1;
    if (b.bankId === 'generic') return -1;
    return b.accounts.length - a.accounts.length || b.totalBalance - a.totalBalance;
  });
};

export const AccountsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors } = useTheme();
  const accounts = useFinanceStore((state) => state.accounts);
  const storeLoading = useFinanceStore((state) => state.isLoading);
  const syncDelta = useFinanceStore((state) => state.syncDelta);
  const addAccountOptimistic = useFinanceStore((state) => state.addAccountOptimistic);
  const updateAccountOptimistic = useFinanceStore((state) => state.updateAccountOptimistic);
  const deleteAccountOptimistic = useFinanceStore((state) => state.deleteAccountOptimistic);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const isLoading = storeLoading && accounts.length === 0;

  // Form state
  const [name, setName] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<MexicanBankId>('generic');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [accountInstrument, setAccountInstrument] = useState<'debito' | 'credito'>('debito');
  const [accountUsage, setAccountUsage] = useState<'debito' | 'ahorro' | 'inversion'>('debito');
  const [type, setType] = useState<AccountType>('debito');
  const [balance, setBalance] = useState('');
  const isLiquid = type === 'debito' || type === 'credito' || type === 'corriente';
  const [color, setColor] = useState(PALETTE[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Credit Card specific state
  const [cardProduct, setCardProduct] = useState('');
  const [customProduct, setCustomProduct] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [cutOffDay, setCutOffDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [paymentGraceDays, setPaymentGraceDays] = useState('20');
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  // Yield state for new account
  const [hasYield, setHasYield] = useState(false);
  const [annualYieldRate, setAnnualYieldRate] = useState('');

  // Edit Account Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editHasYield, setEditHasYield] = useState(false);
  const [editAnnualYieldRate, setEditAnnualYieldRate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const applyBankYieldPreset = (bankId: MexicanBankId) => {
    if (accountInstrument === 'credito') return;
    const bId = String(bankId).toLowerCase();
    const n = name.toLowerCase();
    if (bId === 'nu' || n.includes('nu')) {
      setHasYield(true);
      setAnnualYieldRate('13.5');
    } else if (bId === 'mercadopago' || n.includes('mercado') || n.includes('klar') || n.includes('uala')) {
      setHasYield(true);
      setAnnualYieldRate('15.0');
    } else if (n.includes('cetes')) {
      setHasYield(true);
      setAnnualYieldRate('11.0');
    } else if (n.includes('finsus')) {
      setHasYield(true);
      setAnnualYieldRate('14.0');
    } else if (n.includes('stori')) {
      setHasYield(true);
      setAnnualYieldRate('15.5');
    } else if (bId === 'heybanco' || n.includes('hey')) {
      setHasYield(true);
      setAnnualYieldRate('11.0');
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setIsNameManuallyEdited(text.trim().length > 0);
    const detected = detectBankFromName(text);
    if (detected && detected !== 'generic') {
      setSelectedBankId(detected);
      setIsAutoDetected(true);
      setManualOverride(false);
      applyBankYieldPreset(detected);
    } else if (!manualOverride) {
      setSelectedBankId('generic');
      setIsAutoDetected(false);
    }
  };

  const handleBankSelect = (bankId: MexicanBankId) => {
    setSelectedBankId(bankId);
    setManualOverride(true);
    setIsAutoDetected(false);
    // Reset selected product if changing bank so it matches the new bank
    setCardProduct('');
    setCustomProduct('');
    if (!isNameManuallyEdited) {
      setName('');
    }
    applyBankYieldPreset(bankId);
  };

  const recalculateGraceDays = (cutText: string, dueText: string) => {
    const cut = parseInt(cutText, 10);
    const due = parseInt(dueText, 10);
    if (isNaN(cut) || isNaN(due) || cut < 1 || cut > 31 || due < 1 || due > 31) return;

    let diff = 0;
    if (due === cut) {
      diff = 30;
    } else if (due > cut) {
      diff = due - cut;
    } else {
      diff = 30 - cut + due;
    }

    if (diff >= 18 && diff <= 22) {
      setPaymentGraceDays('20');
    } else if (diff >= 23 && diff <= 27) {
      setPaymentGraceDays('25');
    } else if (diff >= 28 && diff <= 32) {
      setPaymentGraceDays('30');
    } else {
      setPaymentGraceDays(String(diff));
    }
  };

  const handleCutOffChange = (t: string) => {
    const clean = t.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    if (!clean || (num >= 1 && num <= 31)) {
      setCutOffDay(clean);
      if (clean && paymentDueDay) {
        recalculateGraceDays(clean, paymentDueDay);
      }
    }
  };

  const handlePaymentDueChange = (t: string) => {
    const clean = t.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    if (!clean || (num >= 1 && num <= 31)) {
      setPaymentDueDay(clean);
      if (cutOffDay && clean) {
        recalculateGraceDays(cutOffDay, clean);
      }
    }
  };

  const handleGraceDaysSelect = (days: string) => {
    setPaymentGraceDays(days);
    const cutNum = parseInt(cutOffDay, 10);
    if (cutNum >= 1 && cutNum <= 31) {
      const graceNum = parseInt(days, 10);
      if (graceNum === 30) {
        setPaymentDueDay(String(cutNum));
      } else {
        const refDate = new Date(2026, 0, cutNum);
        refDate.setDate(refDate.getDate() + graceNum);
        setPaymentDueDay(String(refDate.getDate()));
      }
    }
  };

  const openCreateModal = (targetBankId?: MexicanBankId) => {
    if (targetBankId && targetBankId !== 'generic') {
      setSelectedBankId(targetBankId);
      setManualOverride(true);
      setIsAutoDetected(false);
    } else {
      setSelectedBankId('generic');
      setManualOverride(false);
      setIsAutoDetected(false);
    }
    setName('');
    setIsNameManuallyEdited(false);
    setAccountInstrument('debito');
    setAccountUsage('debito');
    setType('debito');
    setBalance('');
    setColor(PALETTE[0]);
    setCardProduct('');
    setCustomProduct('');
    setCreditLimit('');
    setCutOffDay('');
    setPaymentDueDay('');
    setPaymentGraceDays('20');
    setHasYield(false);
    setAnnualYieldRate('');
    if (targetBankId && targetBankId !== 'generic') {
      applyBankYieldPreset(targetBankId);
    }
    setModalOpen(true);
  };

  const resetForm = () => {
    setName('');
    setIsNameManuallyEdited(false);
    setSelectedBankId('generic');
    setIsAutoDetected(false);
    setManualOverride(false);
    setAccountInstrument('debito');
    setAccountUsage('debito');
    setType('debito');
    setBalance('');
    setColor(PALETTE[0]);
    setCardProduct('');
    setCustomProduct('');
    setCreditLimit('');
    setCutOffDay('');
    setPaymentDueDay('');
    setPaymentGraceDays('20');
    setHasYield(false);
    setAnnualYieldRate('');
    setModalOpen(false);
  };

  const loadAccounts = useCallback(async () => {
    try {
      await syncDelta(true);
    } finally {
      setRefreshing(false);
    }
  }, [syncDelta]);

  useEffect(() => {
    if (accounts.length === 0) {
      loadAccounts();
    }
  }, [accounts.length, loadAccounts]);

  const handleCreate = async () => {
    if (!name.trim() || !balance.trim()) return;
    setIsCreating(true);
    try {
      const resolvedProduct =
        type === 'credito' || type === 'debito' || type === 'corriente'
          ? (cardProduct === 'otro' ? customProduct.trim() : cardProduct.trim())
          : undefined;

      await addAccountOptimistic({
        name: name.trim(),
        account_type: type,
        initial_balance: parseFloat(balance.replace(/,/g, '')) || 0,
        is_liquid: isLiquid,
        color,
        bank_id: selectedBankId,
        card_product: resolvedProduct || undefined,
        has_yield: type !== 'credito' && hasYield,
        annual_yield_rate:
          type !== 'credito' && hasYield && annualYieldRate.trim()
            ? parseFloat(annualYieldRate.replace(/,/g, '')) || 0
            : undefined,
        ...(type === 'credito'
          ? {
              credit_limit: creditLimit ? parseFloat(creditLimit.replace(/,/g, '')) || 0 : undefined,
              cut_off_day: cutOffDay ? parseInt(cutOffDay, 10) || undefined : undefined,
              payment_due_day: paymentDueDay ? parseInt(paymentDueDay, 10) || undefined : undefined,
              payment_grace_days: paymentGraceDays ? parseInt(paymentGraceDays, 10) || undefined : undefined,
            }
          : {}),
      });
      resetForm();
    } catch (err: any) {
      alert(err.message || 'Error al crear cuenta');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditAccount = (acc: Account, focusYield = false) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    const initialYieldCalc = calculateDailyYield(
      acc.bank_id || acc.name,
      acc.card_product,
      acc.current_balance,
      acc.has_yield,
      acc.annual_yield_rate
    );
    const isYieldActive = acc.has_yield !== undefined ? acc.has_yield : (initialYieldCalc.hasYield || focusYield);
    setEditHasYield(isYieldActive);
    const existingRate = acc.annual_yield_rate
      ? String(acc.annual_yield_rate)
      : initialYieldCalc.hasYield
      ? (initialYieldCalc.annualRate * 100).toFixed(1).replace(/\.0$/, '')
      : focusYield
      ? '11.0'
      : '';
    setEditAnnualYieldRate(existingRate);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAccount) return;
    setIsSavingEdit(true);
    try {
      const rateNum = editAnnualYieldRate.trim() ? parseFloat(editAnnualYieldRate.replace(/,/g, '')) : null;
      await updateAccountOptimistic(editingAccount.id, {
        name: editName.trim() || editingAccount.name,
        has_yield: editingAccount.account_type !== 'credito' ? editHasYield : false,
        annual_yield_rate:
          editingAccount.account_type !== 'credito' && editHasYield
            ? (rateNum !== null && !isNaN(rateNum) ? rateNum : null)
            : null,
      });
      setEditModalOpen(false);
      setEditingAccount(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar cuenta');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Optimize: single-pass memoized yield calculations
  const { totalDailyYield, totalMonthlyYield, totalYieldCapital } = useMemo(() => {
    let dailySum = 0;
    let capitalSum = 0;
    for (const acc of accounts) {
      if (acc.account_type === 'credito') continue;
      const y = calculateDailyYield(acc.bank_id || acc.name, acc.card_product, acc.current_balance, acc.has_yield, acc.annual_yield_rate);
      if (y.hasYield) {
        dailySum += y.dailyYieldMxn;
        capitalSum += parseFloat(acc.current_balance) || 0;
      }
    }
    return {
      totalDailyYield: dailySum,
      totalMonthlyYield: Number((dailySum * 30).toFixed(2)),
      totalYieldCapital: capitalSum,
    };
  }, [accounts]);

  // Optimize: memoized bank grouping and sorting
  const accountBankGroups = useMemo(() => {
    return groupAccountsByBank(accounts);
  }, [accounts]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAccountOptimistic(id);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomInset = insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Sub Header (Desktop only) */}
      {!isMobile && (
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.bgBase,
              borderBottomColor: colors.borderColor,
              height: 64,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onBack}
            style={[
              styles.backBtn,
              {
                borderColor: colors.borderColor,
                backgroundColor: colors.bgSurface,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Volver al panel"
          >
            <ArrowLeft size={16} color={colors.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>
              VOLVER AL PANEL
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTitleCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              MIS CUENTAS
            </Text>
            <Text style={[styles.headerSub, { color: colors.accent }]}>
              // GESTIÓN DE CAPITAL
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => openCreateModal()}
            style={[
              styles.addBtn,
              {
                backgroundColor: colors.accent,
                borderColor: colors.borderColor,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Nueva cuenta"
          >
            <Plus size={16} color="#000000" strokeWidth={3} />
            <Text style={styles.addBtnText}>NUEVA CUENTA</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(bottomInset, 12) + 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAccounts();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              [ CARGANDO CUENTAS... ]
            </Text>
          </View>
        ) : accounts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderColor,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <Landmark size={36} color={colors.accent} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              SIN CUENTAS REGISTRADAS
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Agrega tus cuentas corrientes, de ahorros o inversiones para calcular tu flujo y patrimonio.
            </Text>
            <TouchableOpacity
              onPress={() => openCreateModal()}
              style={[
                styles.createFirstBtn,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.borderColor,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#000000" strokeWidth={3} />
              <Text style={styles.createFirstBtnText}>CREAR PRIMERA CUENTA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {totalDailyYield > 0 && (
              <View
                style={[
                  styles.yieldSummaryBanner,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.accentSuccess,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
              >
                <View style={styles.yieldBannerHeader}>
                  <View style={[styles.yieldBannerIconWrap, { borderColor: colors.accentSuccess, backgroundColor: colors.accentSuccessSubtle }]}>
                    <TrendingUp size={16} color={colors.accentSuccess} strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.yieldBannerTitle, { color: colors.accentSuccess }]}>RENDIMIENTO PASIVO TOTAL ESTIMADO</Text>
                    <Text style={[styles.yieldBannerSub, { color: colors.textSecondary }]}>
                      Capital generando rendimiento: ${formatMoney(totalYieldCapital)} MXN
                    </Text>
                  </View>
                </View>
                <View style={styles.yieldBannerNumbers}>
                  <View>
                    <Text style={[styles.yieldBannerVal, { color: colors.accentSuccess }]}>
                      +${totalDailyYield.toFixed(2)} MXN
                    </Text>
                    <Text style={[styles.yieldBannerSubLabel, { color: colors.textMuted }]}>PROYECCIÓN / DÍA</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.yieldBannerVal, { color: colors.textPrimary }]}>
                      +${totalMonthlyYield.toFixed(2)} MXN
                    </Text>
                    <Text style={[styles.yieldBannerSubLabel, { color: colors.textMuted }]}>PROYECCIÓN / MES (30D)</Text>
                  </View>
                </View>
              </View>
            )}

            {accountBankGroups.map((group) => {
              const isGeneric = group.bankId === 'generic';
              return (
                <View
                  key={group.bankId}
                  style={[
                    styles.bankCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                >
                  {/* Top Brand Stripe */}
                  <View
                    style={[
                      styles.cardTopStripe,
                      {
                        backgroundColor: isGeneric
                          ? colors.borderMuted
                          : group.bankDef.brandColor || colors.accent,
                      },
                    ]}
                  />

                  {/* Bank Header Container */}
                  <View
                    style={[
                      styles.bankHeader,
                      {
                        backgroundColor: colors.bgBase,
                        borderBottomColor: colors.borderColor,
                      },
                      isMobile && styles.bankHeaderMobile,
                    ]}
                  >
                    <View style={styles.bankHeaderLeft}>
                      <BankAvatar bankId={group.bankId} size={isMobile ? 38 : 42} />
                      <View style={styles.bankHeaderMeta}>
                        <Text
                          style={[styles.bankNameTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {group.bankDef.name.toUpperCase()}
                        </Text>
                        <View style={styles.bankBadgeRow}>
                          <View
                            style={[
                              styles.bankCountBadge,
                              { borderColor: colors.borderColor, backgroundColor: colors.bgSurface },
                            ]}
                          >
                            <Text style={[styles.bankCountBadgeText, { color: colors.accent }]}>
                              {`[ ${group.accounts.length} ${group.accounts.length === 1 ? 'CUENTA' : 'CUENTAS'} ]`}
                            </Text>
                          </View>
                          {!isGeneric && (
                            <Text style={[styles.bankShortTag, { color: colors.textMuted }]}>
                              // {group.bankDef.shortName.toUpperCase()}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.bankHeaderRight}>
                      <View style={styles.bankTotalBox}>
                        <Text style={[styles.bankTotalLabel, { color: colors.textSecondary }]}>
                          TOTAL
                        </Text>
                        <Text style={[styles.bankTotalVal, { color: colors.textPrimary }]}>
                          ${formatMoney(group.totalBalance)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => openCreateModal(group.bankId)}
                        style={[
                          styles.bankAddSubBtn,
                          {
                            backgroundColor: colors.accent,
                            borderColor: colors.borderColor,
                          },
                        ]}
                        activeOpacity={0.8}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Agregar cuenta a ${group.bankDef.name}`}
                      >
                        <Plus size={13} color="#000000" strokeWidth={3} />
                        {!isMobile && (
                          <Text style={styles.bankAddSubBtnText}>
                            + CUENTA
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sub-accounts List */}
                  <View style={styles.subAccountsContainer}>
                    {group.accounts.map((acc, index) => {
                      const displayName = cleanAccountDisplayName(acc.name, group.bankId);
                      const isLast = index === group.accounts.length - 1;
                      return (
                        <View
                          key={acc.id}
                          style={[
                            styles.subAccountItem,
                            !isLast && {
                              borderBottomWidth: 1.5,
                              borderBottomColor: colors.borderMuted,
                            },
                          ]}
                        >
                          <View style={styles.subAccountHeader}>
                            <View style={styles.subAccountLeft}>
                              <View
                                style={[
                                  styles.accountIndicatorDot,
                                  { backgroundColor: acc.color || colors.accent },
                                ]}
                              />
                              <View style={styles.subAccountMeta}>
                                <View style={styles.subAccountNameRow}>
                                  <Text
                                    style={[styles.subAccountName, { color: colors.textPrimary }]}
                                    numberOfLines={1}
                                  >
                                    {displayName}
                                  </Text>
                                  {acc.name.trim().toUpperCase() !== displayName && (
                                    <Text
                                      style={[styles.subAccountOriginalName, { color: colors.textMuted }]}
                                      numberOfLines={1}
                                    >
                                      ({acc.name})
                                    </Text>
                                  )}
                                </View>

                                <View style={styles.badgeRow}>
                                  {acc.card_product ? (
                                    <View
                                      style={[
                                        styles.typeBadge,
                                        {
                                          borderColor: colors.accent,
                                          backgroundColor: colors.accentSubtle,
                                        },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.typeBadgeText,
                                          { color: colors.accent },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {acc.card_product.toUpperCase()}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View
                                    style={[
                                      styles.typeBadge,
                                      {
                                        borderColor: colors.borderColor,
                                        backgroundColor: colors.bgBase,
                                      },
                                    ]}
                                  >
                                      <Text
                                        style={[
                                          styles.typeBadgeText,
                                          { color: colors.textSecondary },
                                        ]}
                                      >
                                        {acc.account_type === 'corriente' ? 'DÉBITO' : acc.account_type.toUpperCase()}
                                      </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.typeBadge,
                                      {
                                        borderColor: acc.is_liquid
                                          ? colors.accentSuccess
                                          : colors.accent,
                                        backgroundColor: acc.is_liquid
                                          ? colors.accentSuccessSubtle
                                          : colors.accentSubtle,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.typeBadgeText,
                                        {
                                          color: acc.is_liquid
                                            ? colors.accentSuccess
                                            : colors.accent,
                                        },
                                      ]}
                                    >
                                      {acc.is_liquid ? 'LÍQUIDO' : 'PATRIMONIO'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>

                            <View style={styles.cardActionsRow}>
                              <TouchableOpacity
                                onPress={() => openEditAccount(acc)}
                                style={[
                                  styles.editBtn,
                                  {
                                    borderColor: colors.borderColor,
                                    backgroundColor: colors.bgBase,
                                  },
                                ]}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel={`Editar ${acc.name}`}
                              >
                                <Pencil size={13} color={colors.textSecondary} strokeWidth={2.5} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleDelete(acc.id)}
                                style={[
                                  styles.deleteBtn,
                                  {
                                    borderColor: colors.accentDanger,
                                    backgroundColor: colors.accentDangerSubtle,
                                  },
                                ]}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel={`Eliminar ${acc.name}`}
                              >
                                <Trash2 size={13} color={colors.accentDanger} strokeWidth={2.5} />
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View
                            style={[
                              styles.subAccountBalances,
                              {
                                backgroundColor: colors.bgBase,
                                borderColor: colors.borderMuted,
                              },
                            ]}
                          >
                            <View>
                              <Text style={[styles.balLabel, { color: colors.textSecondary }]}>
                                {acc.account_type === 'credito' ? 'SALDO UTILIZADO' : 'SALDO ACTUAL'}
                              </Text>
                              <Text style={[styles.balVal, { color: colors.textPrimary }]}>
                                ${formatMoney(acc.current_balance)}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.balLabel, { color: colors.textSecondary }]}>
                                PROYECTADO 30D
                              </Text>
                              <Text style={[styles.balVal, { color: colors.accent }]}>
                                ${formatMoney(acc.projected_balance)}
                              </Text>
                            </View>
                          </View>

                          {acc.account_type === 'credito' && (acc.credit_limit || acc.cut_off_day || acc.payment_due_day) ? (
                            <View
                              style={[
                                styles.creditCardDetailsBox,
                                {
                                  backgroundColor: colors.bgBase,
                                  borderColor: colors.borderMuted,
                                },
                              ]}
                            >
                              {acc.credit_limit ? (
                                <View style={styles.creditCardLimitsRow}>
                                  <View>
                                    <Text style={[styles.balLabel, { color: colors.textSecondary }]}>
                                      LÍNEA DE CRÉDITO
                                    </Text>
                                    <Text style={[styles.creditLimitVal, { color: colors.textPrimary }]}>
                                      ${formatMoney(acc.credit_limit)}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.balLabel, { color: colors.textSecondary }]}>
                                      CRÉDITO DISPONIBLE
                                    </Text>
                                    <Text style={[styles.creditAvailableVal, { color: colors.accentSuccess }]}>
                                      ${formatMoney(Math.max(0, (parseFloat(String(acc.credit_limit)) || 0) - (parseFloat(String(acc.current_balance)) || 0)))}
                                    </Text>
                                  </View>
                                </View>
                              ) : null}

                              {(acc.cut_off_day || acc.payment_due_day) ? (
                                <View
                                    style={[
                                      styles.creditCardDaysRow,
                                      acc.credit_limit ? { borderTopWidth: 1, borderTopColor: colors.borderMuted, marginTop: 6, paddingTop: 6 } : null,
                                    ]}
                                  >
                                    {acc.cut_off_day ? (
                                      <View style={styles.creditDayItem}>
                                        <Calendar size={11} color={colors.accent} strokeWidth={2.5} />
                                        <Text style={[styles.creditDayText, { color: colors.textSecondary }]}>
                                          CORTE: <Text style={{ color: colors.accent, fontWeight: '900' }}>DÍA {acc.cut_off_day}</Text>
                                        </Text>
                                      </View>
                                    ) : null}
                                    {acc.payment_grace_days ? (
                                      <View style={styles.creditDayItem}>
                                        <Calendar size={11} color={colors.accentWarning} strokeWidth={2.5} />
                                        <Text style={[styles.creditDayText, { color: colors.textSecondary }]}>
                                          PLAZO: <Text style={{ color: colors.accentWarning, fontWeight: '900' }}>{acc.payment_grace_days} DÍAS</Text>
                                        </Text>
                                      </View>
                                    ) : null}
                                    {acc.payment_due_day ? (
                                      <View style={styles.creditDayItem}>
                                        <Calendar size={11} color={colors.accentDanger} strokeWidth={2.5} />
                                        <Text style={[styles.creditDayText, { color: colors.textSecondary }]}>
                                          LÍMITE PAGO: <Text style={{ color: colors.accentDanger, fontWeight: '900' }}>DÍA {acc.payment_due_day}</Text>
                                          {Boolean((acc.payment_grace_days && acc.payment_grace_days >= 28) || (acc.cut_off_day && acc.payment_due_day <= acc.cut_off_day)) && (
                                            <Text style={{ color: colors.accentDanger, fontSize: 8.5, fontWeight: '900' }}> (MES SIG)</Text>
                                          )}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                ) : null}
                              </View>
                            ) : null}

                            {/* SMART FINANCIAL INTELLIGENCE MODULES */}
                            {acc.account_type === 'credito' && (
                              <>
                                {/* Buró Credit Utilization Ratio Bar */}
                                {acc.credit_limit ? (
                                  (() => {
                                    const util = evaluateCreditUtilization(acc.current_balance, acc.credit_limit);
                                    return (
                                      <View style={[styles.utilizationBox, { borderColor: colors.borderMuted, backgroundColor: colors.bgBase }]}>
                                        <View style={styles.utilizationHeader}>
                                          <Text style={[styles.utilizationLabel, { color: colors.textSecondary }]}>
                                            USO DE LÍNEA // BURÓ:
                                          </Text>
                                          <View style={[styles.utilizationBadge, { borderColor: util.color, backgroundColor: colors.bgSurface }]}>
                                            <Text style={[styles.utilizationBadgeText, { color: util.color }]}>
                                              {util.ratio}% [{util.label}]
                                            </Text>
                                          </View>
                                        </View>
                                        <View style={[styles.progressBarTrack, { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted }]}>
                                          <View
                                            style={[
                                              styles.progressBarFill,
                                              {
                                                width: `${Math.min(100, util.ratio)}%`,
                                                backgroundColor: util.color,
                                              },
                                            ]}
                                          />
                                        </View>
                                        <Text style={[styles.utilizationAdvice, { color: colors.textMuted }]}>
                                          {util.advice}
                                        </Text>
                                      </View>
                                    );
                                  })()
                                ) : null}

                                {/* Financing Cycle Intelligence ("Hasta 50 Días Gratis") */}
                                {acc.cut_off_day ? (
                                  (() => {
                                    const financing = evaluateFinancingCycle(acc.cut_off_day, acc.payment_due_day, acc.payment_grace_days);
                                    if (!financing.hasCycle) return null;
                                    return (
                                      <View
                                        style={[
                                          styles.financingBox,
                                          {
                                            borderColor: financing.isBestDayToBuy ? colors.accent : colors.borderMuted,
                                            backgroundColor: financing.isBestDayToBuy ? colors.accentSubtle : colors.bgBase,
                                          },
                                        ]}
                                      >
                                        <View style={styles.financingHeader}>
                                          <Zap size={13} color={financing.statusColor} strokeWidth={2.5} />
                                          <Text style={[styles.financingTitle, { color: financing.statusColor }]}>
                                            {financing.isBestDayToBuy ? 'VENTANA ÓPTIMA DE COMPRA' : 'INTELIGENCIA DE CICLO'}
                                          </Text>
                                        </View>
                                        <Text style={[styles.financingAdvice, { color: colors.textPrimary }]}>
                                          {financing.advice}
                                        </Text>
                                        <Text style={[styles.financingDaysSub, { color: colors.textSecondary }]}>
                                          // Hasta {financing.daysOfFinancing} días de financiamiento libre de intereses
                                        </Text>
                                      </View>
                                    );
                                  })()
                                ) : null}

                                {/* Annuity Exemption Tracker */}
                                {(() => {
                                  const exemption = evaluateAnnuityExemption(
                                    acc.bank_id || acc.name,
                                    acc.card_product,
                                    parseFloat(acc.current_balance) || 0,
                                    1
                                  );
                                  if (!exemption.hasRule) return null;
                                  return (
                                    <View style={[styles.exemptionBox, { borderColor: exemption.badgeColor, backgroundColor: colors.bgBase }]}>
                                      <View style={styles.exemptionHeader}>
                                        <ShieldCheck size={13} color={exemption.badgeColor} strokeWidth={2.5} />
                                        <Text style={[styles.exemptionTitle, { color: exemption.badgeColor }]}>
                                          EXENCIÓN DE ANUALIDAD // {exemption.productName.toUpperCase()}
                                        </Text>
                                      </View>
                                      <Text style={[styles.exemptionMessage, { color: colors.textPrimary }]}>
                                        {exemption.message}
                                      </Text>
                                      <Text style={[styles.exemptionRule, { color: colors.textMuted }]}>
                                        Condición: {exemption.conditionDescription}
                                      </Text>
                                    </View>
                                  );
                                })()}
                              </>
                            )}

                            {/* Daily Yield Module for Yield-bearing Accounts / Debit */}
                            {acc.account_type !== 'credito' ? (
                              (() => {
                                const yieldInfo = calculateDailyYield(
                                  acc.bank_id || acc.name,
                                  acc.card_product,
                                  acc.current_balance,
                                  acc.has_yield,
                                  acc.annual_yield_rate
                                );
                                if (!yieldInfo.hasYield) {
                                  return (
                                    <TouchableOpacity
                                      onPress={() => openEditAccount(acc, true)}
                                      style={[
                                        styles.addYieldBox,
                                        { borderColor: colors.borderMuted, backgroundColor: colors.bgBase },
                                      ]}
                                      activeOpacity={0.7}
                                    >
                                      <TrendingUp size={12} color={colors.textMuted} strokeWidth={2} />
                                      <Text style={[styles.addYieldText, { color: colors.textSecondary }]}>
                                        + AGREGAR RENDIMIENTO ANUAL (TASA %)
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                }
                                return (
                                  <View style={[styles.yieldBox, { borderColor: colors.accentSuccess, backgroundColor: colors.bgBase }]}>
                                    <View style={styles.yieldHeader}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <TrendingUp size={13} color={colors.accentSuccess} strokeWidth={2.5} />
                                        <Text style={[styles.yieldTitle, { color: colors.accentSuccess }]} numberOfLines={1}>
                                          RENDIMIENTO PASIVO DIARIO [{yieldInfo.rateLabel}]
                                        </Text>
                                      </View>
                                      <TouchableOpacity
                                        onPress={() => openEditAccount(acc, true)}
                                        style={[
                                          styles.adjustRateBtn,
                                          { borderColor: colors.accentSuccess, backgroundColor: colors.accentSuccessSubtle },
                                        ]}
                                        activeOpacity={0.7}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                      >
                                        <Text style={styles.adjustRateBtnText}>AJUSTAR TASA</Text>
                                      </TouchableOpacity>
                                    </View>
                                    <Text style={[styles.yieldAmounts, { color: colors.textPrimary }]}>
                                      +${yieldInfo.dailyYieldMxn.toFixed(2)} MXN / día
                                      <Text style={{ color: colors.textSecondary, fontSize: 10 }}> (~${yieldInfo.monthlyYieldMxn.toFixed(2)} MXN / mes)</Text>
                                    </Text>
                                    <Text style={[styles.yieldSub, { color: colors.textMuted }]}>
                                      // Proyección estimada al mantener liquidez invertida a tasa anual {yieldInfo.rateLabel}
                                    </Text>
                                  </View>
                                );
                              })()
                            ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Nueva Cuenta */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={resetForm}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={resetForm}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.bgBase,
                borderColor: colors.borderColor,
                shadowColor: colors.shadowColor,
                width: isMobile ? '94%' : 480,
                maxWidth: 480,
                ...(Platform.OS === 'web' ? { boxShadow: `8px 8px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.borderColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>NUEVA CUENTA</Text>
                <Text style={[styles.modalSub, { color: colors.accent }]}>// REGISTRO DE ACTIVO BANCARIO</Text>
              </View>
              <TouchableOpacity
                onPress={resetForm}
                style={[styles.modalCloseBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Cerrar modal"
              >
                <X size={16} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Live Bank Preview Card */}
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: isAutoDetected ? colors.accent : colors.borderColor,
                  },
                ]}
              >
                <BankAvatar bankId={selectedBankId} size={42} />
                <View style={styles.previewInfo}>
                  <Text style={[styles.previewName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {name.trim() || 'Nombre de la cuenta (ej. Nómina)'}
                  </Text>
                  <View style={styles.previewMetaRow}>
                    <Text style={[styles.previewBank, { color: colors.accent }]}>
                      {getBankDefinition(selectedBankId).name}
                    </Text>
                    <Text style={[styles.previewType, { color: colors.textSecondary }]}>
                      // {type === 'corriente' ? 'DÉBITO' : type.toUpperCase()} • {isLiquid ? 'LÍQUIDO' : 'PATRIMONIO'}
                    </Text>
                  </View>
                  {(cardProduct || (type === 'credito' && creditLimit)) ? (
                    <View style={styles.previewCreditMetaRow}>
                      {cardProduct ? (
                        <Text
                          style={[
                            styles.previewCreditBadge,
                            { color: type === 'credito' ? colors.accent : colors.accentSuccess },
                          ]}
                          numberOfLines={1}
                        >
                          [{cardProduct === 'otro' ? (customProduct || 'OTRO') : cardProduct}]
                        </Text>
                      ) : null}
                      {type === 'credito' && creditLimit ? (
                        <Text style={[styles.previewCreditLimit, { color: colors.textMuted }]}>
                          LÍMITE: ${formatMoney(creditLimit)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Selector de Banco con Auto-detección */}
              <BankSelector
                selectedBankId={selectedBankId}
                onSelectBank={handleBankSelect}
                autoDetected={isAutoDetected}
              />

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE DE LA CUENTA</Text>
                  <Text style={[styles.labelHint, { color: colors.accent }]}>// APODO O ETIQUETA</Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                  ]}
                  placeholder="Ej. Nómina, Gastos, Personal, Banamex..."
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={handleNameChange}
                />
                <View style={styles.quickChipsStaticRow}>
                  {ACCOUNT_NAME_SUGGESTIONS.map((sug) => {
                    const isSelected = name.trim().toLowerCase() === sug.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={sug}
                        onPress={() => {
                          setName(sug);
                          setIsNameManuallyEdited(false);
                          const detected = detectBankFromName(sug);
                          if (detected && detected !== 'generic') {
                            setSelectedBankId(detected);
                            setIsAutoDetected(true);
                            setManualOverride(false);
                          }
                        }}
                        style={[
                          styles.quickChip,
                          {
                            borderColor: isSelected ? colors.accent : colors.borderColor,
                            backgroundColor: isSelected ? colors.accentSubtle : colors.bgSurface,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.quickChipText,
                            { color: isSelected ? colors.accent : colors.textSecondary },
                          ]}
                        >
                          + {sug.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selector de Tipo de Cuenta: Débito o Crédito */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO DE CUENTA</Text>
                  <Text
                    style={[
                      styles.labelHint,
                      { color: accountInstrument === 'credito' ? colors.accent : colors.accentSuccess },
                    ]}
                  >
                    // {accountInstrument === 'credito' ? 'TARJETA DE CRÉDITO' : 'TARJETA DE DÉBITO / BANCO'}
                  </Text>
                </View>
                <View style={styles.typeRow2Col}>
                  {ACCOUNT_INSTRUMENTS.map((item) => {
                    const isSelected = accountInstrument === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          setAccountInstrument(item.id);
                          if (item.id === 'credito') {
                            setType('credito');
                          } else {
                            setType(accountUsage);
                          }
                        }}
                        style={[
                          styles.typeCard2Col,
                          {
                            borderColor: isSelected
                              ? (item.id === 'credito' ? colors.accent : colors.accentSuccess)
                              : colors.borderColor,
                            backgroundColor: isSelected
                              ? (item.id === 'credito' ? colors.accentSubtle : colors.accentSuccessSubtle)
                              : colors.bgSurface,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.typeSelectText,
                            {
                              color: isSelected
                                ? (item.id === 'credito' ? colors.accent : colors.accentSuccess)
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.typeSelectSubText,
                            {
                              color: isSelected
                                ? (item.id === 'credito' ? colors.accent : colors.accentSuccess)
                                : colors.textMuted,
                            },
                          ]}
                        >
                          [{item.sub}]
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selector de Uso de la Cuenta (para débito / cuenta bancaria) */}
              {accountInstrument === 'debito' && (
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>USO DE LA CUENTA</Text>
                    <Text
                      style={[
                        styles.labelHint,
                        { color: isLiquid ? colors.accentSuccess : colors.accent },
                      ]}
                    >
                      // {type === 'debito'
                        ? 'GASTO DIARIO • LÍQUIDO'
                        : type === 'ahorro'
                        ? 'AHORRO • PATRIMONIO'
                        : 'INVERSIÓN • PATRIMONIO'}
                    </Text>
                  </View>
                  <View style={styles.usageRow3Col}>
                    {ACCOUNT_USAGES.map((item) => {
                      const isSelected = accountUsage === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            setAccountUsage(item.id);
                            setType(item.id);
                          }}
                          style={[
                            styles.usageCard3Col,
                            {
                              borderColor: isSelected
                                ? (item.id === 'debito' ? colors.accentSuccess : colors.accent)
                                : colors.borderColor,
                              backgroundColor: isSelected
                                ? (item.id === 'debito' ? colors.accentSuccessSubtle : colors.accentSubtle)
                                : colors.bgSurface,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.usageSelectText,
                              {
                                color: isSelected
                                  ? (item.id === 'debito' ? colors.accentSuccess : colors.accent)
                                  : colors.textSecondary,
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text
                            style={[
                              styles.usageSelectSubText,
                              {
                                color: isSelected
                                  ? (item.id === 'debito' ? colors.accentSuccess : colors.accent)
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            [{item.sub}]
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Parámetros Específicos para Tarjeta de Débito */}
              {accountInstrument === 'debito' && (
                <View
                  style={[
                    styles.creditFormCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <View style={styles.creditFormHeader}>
                    <CreditCard size={15} color={colors.accentSuccess} strokeWidth={2.5} />
                    <Text style={[styles.creditFormTitle, { color: colors.textPrimary }]}>
                      PRODUCTO DE DÉBITO
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>
                        TARJETA / CUENTA DE DÉBITO
                      </Text>
                      <Text style={[styles.labelHint, { color: colors.accentSuccess }]}>
                        // CATÁLOGO {getBankDefinition(selectedBankId).shortName.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.creditProductsWrap}>
                      {getBankDebitCards(selectedBankId).map((prod) => {
                        const isSelected = cardProduct === prod;
                        return (
                          <TouchableOpacity
                            key={prod}
                            onPress={() => {
                              setCardProduct(prod);
                              if (!isNameManuallyEdited || !name.trim()) {
                                setName(
                                  prod
                                    .replace(/^Tarjeta (de Débito )?/i, '')
                                    .replace(/^Cuenta (de )?/i, '')
                                );
                              }
                            }}
                            style={[
                              styles.creditProductChip,
                              {
                                borderColor: isSelected ? colors.accentSuccess : colors.borderColor,
                                backgroundColor: isSelected ? colors.accentSuccessSubtle : colors.bgBase,
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.creditProductChipText,
                                { color: isSelected ? colors.accentSuccess : colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {prod}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      <TouchableOpacity
                        onPress={() => {
                          setCardProduct('otro');
                          if (!isNameManuallyEdited || !name.trim()) {
                            setName(customProduct.trim());
                          }
                        }}
                        style={[
                          styles.creditProductChip,
                          {
                            borderColor: cardProduct === 'otro' ? colors.accentSuccess : colors.borderColor,
                            backgroundColor: cardProduct === 'otro' ? colors.accentSuccessSubtle : colors.bgBase,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.creditProductChipText,
                            { color: cardProduct === 'otro' ? colors.accentSuccess : colors.textSecondary },
                          ]}
                        >
                          + OTRO / PERSONALIZADO
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {cardProduct === 'otro' && (
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderColor,
                            color: colors.textPrimary,
                            marginTop: 8,
                          },
                        ]}
                        placeholder="Nombre de la tarjeta o cuenta de débito"
                        placeholderTextColor={colors.textMuted}
                        value={customProduct}
                        onChangeText={(t) => {
                          setCustomProduct(t);
                          if (!isNameManuallyEdited || !name.trim()) {
                            setName(t);
                          }
                        }}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Configuración de Rendimientos Pasivos (Débito, Ahorro, Inversión) */}
              {accountInstrument === 'debito' && (
                <View
                  style={[
                    styles.yieldConfigCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: hasYield ? colors.accentSuccess : colors.borderColor,
                    },
                  ]}
                >
                  <View style={styles.yieldConfigHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TrendingUp
                        size={15}
                        color={hasYield ? colors.accentSuccess : colors.textSecondary}
                        strokeWidth={2.5}
                      />
                      <Text style={[styles.yieldConfigTitle, { color: colors.textPrimary }]}>
                        RENDIMIENTO ANUAL
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const next = !hasYield;
                        setHasYield(next);
                        if (next && !annualYieldRate) {
                          const b = String(selectedBankId).toLowerCase();
                          const n = name.toLowerCase();
                          if (b === 'nu' || n.includes('nu')) setAnnualYieldRate('13.5');
                          else if (b === 'mercadopago' || n.includes('mercado') || n.includes('klar') || n.includes('uala')) setAnnualYieldRate('15.0');
                          else if (n.includes('cetes')) setAnnualYieldRate('11.0');
                          else if (n.includes('finsus')) setAnnualYieldRate('14.0');
                          else if (n.includes('stori')) setAnnualYieldRate('15.5');
                          else if (b === 'heybanco' || n.includes('hey')) setAnnualYieldRate('11.0');
                          else setAnnualYieldRate('11.0');
                        }
                      }}
                      style={[
                        styles.toggleBtn,
                        {
                          borderColor: hasYield ? colors.accentSuccess : colors.borderColor,
                          backgroundColor: hasYield ? colors.accentSuccessSubtle : colors.bgBase,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.toggleIndicator,
                          { backgroundColor: hasYield ? colors.accentSuccess : colors.textMuted },
                        ]}
                      />
                      <Text
                        style={[
                          styles.toggleBtnText,
                          { color: hasYield ? colors.accentSuccess : colors.textSecondary },
                        ]}
                      >
                        {hasYield ? 'ACTIVO' : 'INACTIVO'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.yieldConfigDesc, { color: colors.textSecondary }]}>
                    Generación de ganancias pasivas diarias sobre saldo disponible o apartado (Nu, MP, CETES, Klar, Sofipos).
                  </Text>

                  {hasYield && (
                    <View style={{ marginTop: 12 }}>
                      <View style={styles.labelRow}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                          TASA ANUAL (%)
                        </Text>
                        <Text style={[styles.labelHint, { color: colors.accentSuccess }]}>
                          // RENDIMIENTO BRUTO ANUAL
                        </Text>
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderColor,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="Ej. 13.50 ó 15.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={annualYieldRate}
                        onChangeText={setAnnualYieldRate}
                      />

                      {/* Quick Chips con tasas de rendimiento populares */}
                      <View style={styles.quickChipsStaticRow}>
                        {POPULAR_YIELD_PRESETS.map((preset) => {
                          const isSelected = annualYieldRate === String(preset.rate);
                          return (
                            <TouchableOpacity
                              key={preset.label}
                              onPress={() => setAnnualYieldRate(String(preset.rate))}
                              style={[
                                styles.quickChip,
                                {
                                  borderColor: isSelected ? colors.accentSuccess : colors.borderColor,
                                  backgroundColor: isSelected ? colors.accentSuccessSubtle : colors.bgBase,
                                },
                              ]}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.quickChipText,
                                  { color: isSelected ? colors.accentSuccess : colors.textSecondary },
                                ]}
                              >
                                {preset.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Live Proyección con saldo */}
                      {(() => {
                        const bal = parseFloat(balance.replace(/,/g, '')) || 0;
                        const rate = parseFloat(annualYieldRate) || 0;
                        if (rate > 0) {
                          const decRate = rate > 1 ? rate / 100 : rate;
                          const daily = bal > 0 ? bal * (decRate / 360) : 0;
                          const monthly = bal > 0 ? (bal * decRate) / 12 : 0;
                          return (
                            <View
                              style={[
                                styles.yieldLiveBox,
                                {
                                  borderColor: colors.accentSuccess,
                                  backgroundColor: colors.bgBase,
                                },
                              ]}
                            >
                              <View style={styles.yieldLiveHeader}>
                                <Zap size={13} color={colors.accentSuccess} strokeWidth={2.5} />
                                <Text style={[styles.yieldLiveTitle, { color: colors.accentSuccess }]}>
                                  PROYECCIÓN ESTIMADA ({rate}% ANUAL):
                                </Text>
                              </View>
                              <Text style={[styles.yieldLiveValue, { color: colors.textPrimary }]}>
                                +${daily.toFixed(2)} MXN / día
                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                  {' '}
                                  (~${monthly.toFixed(2)} MXN / mes)
                                </Text>
                              </Text>
                              <Text style={[styles.yieldLiveHint, { color: colors.textMuted }]}>
                                // Estimado sobre saldo inicial de ${formatMoney(bal)} MXN (360 días bancarios).
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  )}
                </View>
              )}

              {/* Parámetros Específicos para Tarjeta de Crédito */}
              {accountInstrument === 'credito' && (
                <View
                  style={[
                    styles.creditFormCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <View style={styles.creditFormHeader}>
                    <CreditCard size={15} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.creditFormTitle, { color: colors.textPrimary }]}>
                      PARÁMETROS DE CRÉDITO
                    </Text>
                  </View>

                  {/* Selector de Producto según Banco */}
                  <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>
                        PRODUCTO BANCARIO
                      </Text>
                      <Text style={[styles.labelHint, { color: colors.accent }]}>
                        // CATÁLOGO {getBankDefinition(selectedBankId).shortName.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.creditProductsWrap}>
                      {getBankCreditCards(selectedBankId).map((prod) => {
                        const isSelected = cardProduct === prod;
                        return (
                          <TouchableOpacity
                            key={prod}
                            onPress={() => {
                              setCardProduct(prod);
                              if (!isNameManuallyEdited || !name.trim()) {
                                setName(prod.replace(/^Tarjeta (de Crédito )?/i, ''));
                              }
                            }}
                            style={[
                              styles.creditProductChip,
                              {
                                borderColor: isSelected ? colors.accent : colors.borderColor,
                                backgroundColor: isSelected ? colors.accentSubtle : colors.bgBase,
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.creditProductChipText,
                                { color: isSelected ? colors.accent : colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {prod}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      <TouchableOpacity
                        onPress={() => {
                          setCardProduct('otro');
                          if (!isNameManuallyEdited || !name.trim()) {
                            setName(customProduct.trim());
                          }
                        }}
                        style={[
                          styles.creditProductChip,
                          {
                            borderColor: cardProduct === 'otro' ? colors.accent : colors.borderColor,
                            backgroundColor: cardProduct === 'otro' ? colors.accentSubtle : colors.bgBase,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.creditProductChipText,
                            { color: cardProduct === 'otro' ? colors.accent : colors.textSecondary },
                          ]}
                        >
                          + OTRO / PERSONALIZADO
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {cardProduct === 'otro' && (
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderColor,
                            color: colors.textPrimary,
                            marginTop: 8,
                          },
                        ]}
                        placeholder="Nombre del producto (ej. Oro Corporativa)"
                        placeholderTextColor={colors.textMuted}
                        value={customProduct}
                        onChangeText={(t) => {
                          setCustomProduct(t);
                          if (!isNameManuallyEdited || !name.trim()) {
                            setName(t);
                          }
                        }}
                      />
                    )}
                  </View>

                  {/* Línea de Crédito */}
                  <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>
                        LÍNEA DE CRÉDITO ($ MXN)
                      </Text>
                      <Text style={[styles.labelHint, { color: colors.accent }]}>
                        // LÍMITE ASIGNADO
                      </Text>
                    </View>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.bgBase,
                          borderColor: colors.borderColor,
                          color: colors.textPrimary,
                        },
                      ]}
                      placeholder="0.00 (ej. 45,000)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={creditLimit}
                      onChangeText={(val) => setCreditLimit(formatNumberWithCommas(val))}
                    />
                  </View>

                  {/* Días de corte y pago */}
                  <View style={styles.formRow2Col}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <View style={styles.labelRow}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                          DÍA DE CORTE
                        </Text>
                        <Text style={[styles.labelHint, { color: colors.accent }]}>// 1-31</Text>
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderColor,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="Ej. 15"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={cutOffDay}
                        onChangeText={handleCutOffChange}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <View style={styles.labelRow}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                          LÍMITE DE PAGO
                        </Text>
                        <Text style={[styles.labelHint, { color: colors.accentDanger }]}>// 1-31</Text>
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderColor,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="Ej. 5"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={paymentDueDay}
                        onChangeText={handlePaymentDueChange}
                      />
                    </View>
                  </View>

                  {/* Selector de Plazo de Gracia para Pagar */}
                  <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>
                        PLAZO PARA PAGAR TRAS EL CORTE
                      </Text>
                      <Text style={[styles.labelHint, { color: colors.accentWarning }]}>
                        // DÍAS DE GRACIA
                      </Text>
                    </View>

                    <View style={styles.graceRow}>
                      {[
                        { days: '20', title: '20 DÍAS', sub: 'ESTÁNDAR' },
                        { days: '25', title: '25 DÍAS', sub: 'AMEX' },
                        { days: '30', title: '30 DÍAS', sub: 'MES COMPLETO' },
                      ].map((item) => {
                        const isSelected = paymentGraceDays === item.days;
                        return (
                          <TouchableOpacity
                            key={item.days}
                            onPress={() => handleGraceDaysSelect(item.days)}
                            style={[
                              styles.graceBtn,
                              {
                                borderColor: isSelected ? colors.accentWarning : colors.borderColor,
                                backgroundColor: isSelected ? colors.accentWarningSubtle : colors.bgBase,
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.graceBtnTitle,
                                { color: isSelected ? colors.accentWarning : colors.textPrimary },
                              ]}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={[
                                styles.graceBtnSub,
                                { color: isSelected ? colors.accentWarning : colors.textMuted },
                              ]}
                            >
                              {item.sub}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Explicación en vivo / preview del ciclo */}
                    {cutOffDay ? (
                      (() => {
                        const cutNum = parseInt(cutOffDay, 10);
                        const graceNum = parseInt(paymentGraceDays, 10) || 20;
                        let displayDueDay = paymentDueDay;
                        if (!displayDueDay) {
                          if (graceNum === 30) {
                            displayDueDay = String(cutNum);
                          } else {
                            const refDate = new Date(2026, 0, cutNum);
                            refDate.setDate(refDate.getDate() + graceNum);
                            displayDueDay = String(refDate.getDate());
                          }
                        }
                        const dueNum = parseInt(displayDueDay, 10);
                        const isNextMonth = graceNum >= 28 || (dueNum <= cutNum);

                        return (
                          <View
                            style={[
                              styles.cyclePreviewBox,
                              {
                                borderColor: colors.accent,
                                backgroundColor: colors.bgBase,
                              },
                            ]}
                          >
                            <View style={styles.cyclePreviewHeader}>
                              <Calendar size={13} color={colors.accent} strokeWidth={2.5} />
                              <Text style={[styles.cyclePreviewTitle, { color: colors.accent }]}>
                                INTELIGENCIA DE CALENDARIO:
                              </Text>
                            </View>
                            <Text style={[styles.cyclePreviewText, { color: colors.textPrimary }]}>
                              Corta el día <Text style={{ fontWeight: '900', color: colors.accent }}>{cutNum}</Text> +{' '}
                              <Text style={{ fontWeight: '900', color: colors.accentWarning }}>{graceNum} días</Text> para pagar ➔ Vence el día{' '}
                              <Text style={{ fontWeight: '900', color: colors.accentDanger }}>{displayDueDay}</Text>
                              {isNextMonth ? ' del mes siguiente' : ''}.
                            </Text>
                            <Text style={[styles.cyclePreviewHint, { color: colors.textSecondary }]}>
                              // Si compras tras tu corte (día {cutNum === 31 ? 1 : cutNum + 1}), tienes hasta {30 + graceNum} días de financiamiento libre.
                            </Text>
                          </View>
                        );
                      })()
                    ) : null}
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {type === 'credito' ? 'SALDO UTILIZADO ($)' : 'SALDO INICIAL ($)'}
                  </Text>
                  <Text
                    style={[
                      styles.labelHint,
                      { color: type === 'credito' ? colors.accentDanger : colors.accentSuccess },
                    ]}
                  >
                    // {type === 'credito' ? 'DEUDA ACTUAL (0 SI ESTÁ EN CEROS)' : 'CAPITAL DISPONIBLE'}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={balance}
                  onChangeText={setBalance}
                />
              </View>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={isCreating}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: colors.accent,
                    borderColor: colors.borderColor,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                activeOpacity={0.8}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Plus size={16} color="#000000" strokeWidth={3} />
                    <Text style={styles.submitBtnText}>REGISTRAR CUENTA</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Editar Cuenta / Rendimiento */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditModalOpen(false);
          setEditingAccount(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setEditModalOpen(false);
              setEditingAccount(null);
            }}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.bgBase,
                borderColor: colors.borderColor,
                shadowColor: colors.shadowColor,
                width: isMobile ? '94%' : 480,
                maxWidth: 480,
                ...(Platform.OS === 'web' ? { boxShadow: `8px 8px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.borderColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>CONFIGURAR CUENTA</Text>
                <Text style={[styles.modalSub, { color: colors.accentSuccess }]}>// RENDIMIENTOS Y PARÁMETROS</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditModalOpen(false);
                  setEditingAccount(null);
                }}
                style={[styles.modalCloseBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Cerrar modal"
              >
                <X size={16} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {editingAccount && (
              <ScrollView
                style={styles.modalForm}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Account Preview Badge */}
                <View
                  style={[
                    styles.previewBox,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <BankAvatar
                    bankId={(editingAccount.bank_id as MexicanBankId) || detectBankFromName(editingAccount.name)}
                    size={42}
                  />
                  <View style={styles.previewInfo}>
                    <Text style={[styles.previewName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {editName.trim() || editingAccount.name}
                    </Text>
                    <View style={styles.previewMetaRow}>
                      <Text style={[styles.previewBank, { color: colors.accent }]}>
                        {getBankDefinition((editingAccount.bank_id as MexicanBankId) || detectBankFromName(editingAccount.name)).name}
                      </Text>
                      <Text style={[styles.previewType, { color: colors.textSecondary }]}>
                        // {editingAccount.account_type.toUpperCase()} • SALDO: ${formatMoney(editingAccount.current_balance)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Edit Name */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE DE LA CUENTA</Text>
                    <Text style={[styles.labelHint, { color: colors.accent }]}>// IDENTIFICADOR</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                    ]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nombre de la cuenta"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Rendimientos Pasivos para Cuentas No Crédito */}
                {editingAccount.account_type !== 'credito' && (
                  <View
                    style={[
                      styles.yieldConfigCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: editHasYield ? colors.accentSuccess : colors.borderColor,
                      },
                    ]}
                  >
                    <View style={styles.yieldConfigHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TrendingUp
                          size={15}
                          color={editHasYield ? colors.accentSuccess : colors.textSecondary}
                          strokeWidth={2.5}
                        />
                        <Text style={[styles.yieldConfigTitle, { color: colors.textPrimary }]}>
                          RENDIMIENTO ANUAL
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          const next = !editHasYield;
                          setEditHasYield(next);
                          if (next && !editAnnualYieldRate) {
                            const bId = String(editingAccount.bank_id || detectBankFromName(editingAccount.name)).toLowerCase();
                            const n = (editName || editingAccount.name).toLowerCase();
                            if (bId === 'nu' || n.includes('nu')) setEditAnnualYieldRate('13.5');
                            else if (bId === 'mercadopago' || n.includes('mercado') || n.includes('klar') || n.includes('uala')) setEditAnnualYieldRate('15.0');
                            else if (n.includes('cetes')) setEditAnnualYieldRate('11.0');
                            else if (n.includes('finsus')) setEditAnnualYieldRate('14.0');
                            else if (n.includes('stori')) setEditAnnualYieldRate('15.5');
                            else if (bId === 'heybanco' || n.includes('hey')) setEditAnnualYieldRate('11.0');
                            else setEditAnnualYieldRate('11.0');
                          }
                        }}
                        style={[
                          styles.toggleBtn,
                          {
                            borderColor: editHasYield ? colors.accentSuccess : colors.borderColor,
                            backgroundColor: editHasYield ? colors.accentSuccessSubtle : colors.bgBase,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.toggleIndicator,
                            { backgroundColor: editHasYield ? colors.accentSuccess : colors.textMuted },
                          ]}
                        />
                        <Text
                          style={[
                            styles.toggleBtnText,
                            { color: editHasYield ? colors.accentSuccess : colors.textSecondary },
                          ]}
                        >
                          {editHasYield ? 'ACTIVO' : 'INACTIVO'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.yieldConfigDesc, { color: colors.textSecondary }]}>
                      Genera ganancias pasivas sobre el saldo disponible (Nu Cajitas, Mercado Pago, CETES, Klar, Sofipos, etc.).
                    </Text>

                    {editHasYield && (
                      <View style={{ marginTop: 12 }}>
                        <View style={styles.labelRow}>
                          <Text style={[styles.label, { color: colors.textSecondary }]}>
                            TASA ANUAL (%)
                          </Text>
                          <Text style={[styles.labelHint, { color: colors.accentSuccess }]}>
                            // INGRESA LA TASA ANUAL (EJ. 13.50 Ó 15.00)
                          </Text>
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: colors.bgBase,
                              borderColor: colors.borderColor,
                              color: colors.textPrimary,
                            },
                          ]}
                          placeholder="Ej. 13.50 ó 15.00"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={editAnnualYieldRate}
                          onChangeText={setEditAnnualYieldRate}
                        />

                        {/* Quick Chips */}
                        <View style={styles.quickChipsStaticRow}>
                          {POPULAR_YIELD_PRESETS.map((preset) => {
                            const isSelected = editAnnualYieldRate === String(preset.rate);
                            return (
                              <TouchableOpacity
                                key={preset.label}
                                onPress={() => setEditAnnualYieldRate(String(preset.rate))}
                                style={[
                                  styles.quickChip,
                                  {
                                    borderColor: isSelected ? colors.accentSuccess : colors.borderColor,
                                    backgroundColor: isSelected ? colors.accentSuccessSubtle : colors.bgBase,
                                  },
                                ]}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.quickChipText,
                                    { color: isSelected ? colors.accentSuccess : colors.textSecondary },
                                  ]}
                                >
                                  {preset.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Live calculation on current account balance */}
                        {(() => {
                          const bal = parseFloat(editingAccount.current_balance) || 0;
                          const rate = parseFloat(editAnnualYieldRate) || 0;
                          if (rate > 0) {
                            const decRate = rate > 1 ? rate / 100 : rate;
                            const daily = bal > 0 ? bal * (decRate / 360) : 0;
                            const monthly = bal > 0 ? (bal * decRate) / 12 : 0;
                            return (
                              <View
                                style={[
                                  styles.yieldLiveBox,
                                  {
                                    borderColor: colors.accentSuccess,
                                    backgroundColor: colors.bgBase,
                                  },
                                ]}
                              >
                                <View style={styles.yieldLiveHeader}>
                                  <Zap size={13} color={colors.accentSuccess} strokeWidth={2.5} />
                                  <Text style={[styles.yieldLiveTitle, { color: colors.accentSuccess }]}>
                                    PROYECCIÓN EN VIVO ({rate}% ANUAL):
                                  </Text>
                                </View>
                                <Text style={[styles.yieldLiveValue, { color: colors.textPrimary }]}>
                                  +${daily.toFixed(2)} MXN / día
                                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                    {' '}
                                    (~${monthly.toFixed(2)} MXN / mes)
                                  </Text>
                                </Text>
                                <Text style={[styles.yieldLiveHint, { color: colors.textMuted }]}>
                                  // Calculado con el saldo actual de ${formatMoney(bal)} MXN (360 días bancarios).
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={isSavingEdit}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: colors.accent,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      marginTop: 20,
                      ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {isSavingEdit ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <>
                      <Check size={16} color="#000000" strokeWidth={3} />
                      <Text style={styles.submitBtnText}>GUARDAR CAMBIOS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  header: {
    height: 64,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerMobile: {
    paddingHorizontal: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyCard: {
    borderWidth: 2,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 16,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  createFirstBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
  },
  list: {
    gap: 16,
  },
  bankCard: {
    borderWidth: 2,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    overflow: 'hidden',
  },
  cardTopStripe: {
    height: 4,
    width: '100%',
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  bankHeaderMobile: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bankHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  bankHeaderMeta: {
    flex: 1,
    gap: 4,
  },
  bankNameTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  bankBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bankCountBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  bankCountBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bankShortTag: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  bankHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bankTotalBox: {
    alignItems: 'flex-end',
  },
  bankTotalLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  bankTotalVal: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bankAddSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bankAddSubBtnText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    color: '#000000',
  },
  subAccountsContainer: {
    width: '100%',
  },
  subAccountItem: {
    padding: 14,
    gap: 10,
  },
  subAccountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subAccountLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  accountIndicatorDot: {
    width: 8,
    height: 8,
  },
  subAccountMeta: {
    flex: 1,
    gap: 4,
  },
  subAccountNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  subAccountName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subAccountOriginalName: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  typeBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subAccountBalances: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  balLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  balVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderWidth: 2,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalSub: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    gap: 14,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 14,
    gap: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  previewBank: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  previewType: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  formGroup: {
    gap: 6,
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelHint: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  quickChipsStaticRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 6,
  },
  quickChip: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  typeRow2Col: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  typeCard2Col: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  typeSelectText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  typeSelectSubText: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  usageRow3Col: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  usageCard3Col: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  usageSelectText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  usageSelectSubText: {
    fontSize: 7.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 14,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
    letterSpacing: 0.8,
  },
  previewCreditMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  previewCreditBadge: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  previewCreditLimit: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  creditCardDetailsBox: {
    borderWidth: 1.5,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  creditCardLimitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditLimitVal: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  creditAvailableVal: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  creditCardDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  creditDayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  creditDayText: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  creditFormCard: {
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  creditFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 8,
    marginBottom: 4,
  },
  creditFormTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  creditProductsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    width: '100%',
  },
  creditProductChip: {
    flexGrow: 1,
    minWidth: '47%',
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditProductChipText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  graceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingTop: 4,
  },
  graceBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graceBtnTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  graceBtnSub: {
    fontSize: 7.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.2,
    marginTop: 2,
    textAlign: 'center',
  },
  formRow2Col: {
    flexDirection: 'row',
    gap: 10,
  },
  utilizationBox: {
    borderWidth: 1.5,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  utilizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilizationLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  utilizationBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  utilizationBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  progressBarTrack: {
    height: 7,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  utilizationAdvice: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
  },
  financingBox: {
    borderWidth: 1.5,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  financingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  financingTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  financingAdvice: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  financingDaysSub: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  exemptionBox: {
    borderWidth: 1.5,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  exemptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exemptionTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  exemptionMessage: {
    fontSize: 11,
    fontWeight: '800',
  },
  exemptionRule: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  yieldBox: {
    borderWidth: 1.5,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  yieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yieldTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  yieldAmounts: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  yieldSub: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cyclePreviewBox: {
    borderWidth: 1.5,
    padding: 10,
    marginTop: 10,
    gap: 4,
  },
  cyclePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cyclePreviewTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  cyclePreviewText: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  cyclePreviewHint: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  adjustRateBtn: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adjustRateBtnText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#00e676',
    letterSpacing: 0.4,
  },
  addYieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  addYieldText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  yieldSummaryBanner: {
    borderWidth: 2,
    padding: 14,
    marginBottom: 16,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    gap: 12,
  },
  yieldBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yieldBannerIconWrap: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00e676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yieldBannerTitle: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    color: '#00e676',
  },
  yieldBannerSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  yieldBannerNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 230, 118, 0.25)',
  },
  yieldBannerVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  yieldBannerSubLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  yieldConfigCard: {
    borderWidth: 1.5,
    padding: 12,
    marginTop: 10,
  },
  yieldConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yieldConfigTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  yieldConfigDesc: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 4,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleIndicator: {
    width: 8,
    height: 8,
  },
  toggleBtnText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  yieldLiveBox: {
    borderWidth: 1.5,
    padding: 10,
    marginTop: 10,
    gap: 4,
  },
  yieldLiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yieldLiveTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  yieldLiveValue: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  yieldLiveHint: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

