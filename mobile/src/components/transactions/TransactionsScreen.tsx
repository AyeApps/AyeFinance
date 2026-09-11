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
import { ArrowLeft, Plus, Trash2, Receipt, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, X, Landmark, Check, AlertCircle, CreditCard, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useFinanceStore } from '../../store/useFinanceStore';
import { api } from '../../services/api';
import { Account, Transaction, TransactionType } from '../../types';
import { calculateTransactionRewards } from '../../utils/cardBenefits';
import {
  predictCategory,
  STANDARD_CATEGORIES,
} from '../../constants/categoryRules';

const CATEGORIES = STANDARD_CATEGORIES;

export const TransactionsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors } = useTheme();
  const transactions = useFinanceStore((state) => state.transactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const storeLoading = useFinanceStore((state) => state.isLoading);
  const syncDelta = useFinanceStore((state) => state.syncDelta);
  const addTransactionOptimistic = useFinanceStore((state) => state.addTransactionOptimistic);
  const deleteTransactionOptimistic = useFinanceStore((state) => state.deleteTransactionOptimistic);
  const addAccountOptimistic = useFinanceStore((state) => state.addAccountOptimistic);

  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const isLoading = storeLoading && transactions.length === 0;

  // Filter state
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [userEditedCategory, setUserEditedCategory] = useState(false);
  const [autofilledCategory, setAutofilledCategory] = useState<string | null>(null);
  const [matchedKeyword, setMatchedKeyword] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('gasto');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMsi, setIsMsi] = useState(false);
  const [msiMonths, setMsiMonths] = useState<number>(3);

  const handleConceptChange = (text: string) => {
    setConcept(text);
    if (!userEditedCategory) {
      const prediction = predictCategory(text);
      if (prediction) {
        setCategory(prediction.category);
        setAutofilledCategory(prediction.category);
        setMatchedKeyword(prediction.matchedKeyword);
      } else if (autofilledCategory) {
        setCategory(CATEGORIES[0]);
        setAutofilledCategory(null);
        setMatchedKeyword(null);
      }
    }
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setUserEditedCategory(true);
    setAutofilledCategory(null);
    setMatchedKeyword(null);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const isCreditAccount = selectedAccount?.account_type === 'credito';
  const parsedAmount = parseFloat(amount) || 0;
  const rewards = calculateTransactionRewards(
    selectedAccount?.bank_id || selectedAccount?.name,
    selectedAccount?.card_product,
    parsedAmount,
    category || concept
  );

  const loadData = useCallback(async () => {
    try {
      await syncDelta(true);
    } finally {
      setRefreshing(false);
    }
  }, [syncDelta]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const [isCreatingDefaultAccount, setIsCreatingDefaultAccount] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleQuickCreateDefaultAccount = async () => {
    setIsCreatingDefaultAccount(true);
    setCreateError('');
    try {
      const created = await addAccountOptimistic({
        name: 'Billetera Principal',
        account_type: 'corriente',
        currency: 'MXN',
        initial_balance: 0,
        is_liquid: true,
        color: '#FE9D01',
      });
      setSelectedAccountId(created.id);
    } catch (err: any) {
      setCreateError(err.message?.toUpperCase() || 'ERROR AL CREAR CUENTA RÁPIDA');
    } finally {
      setIsCreatingDefaultAccount(false);
    }
  };

  const handleCreate = async () => {
    if (!amount.trim()) {
      setCreateError('INGRESA UN MONTO VÁLIDO MAYOR A 0');
      return;
    }
    if (!concept.trim()) {
      setCreateError('INGRESA UN CONCEPTO O DESCRIPCIÓN');
      return;
    }
    if (!selectedAccountId) {
      setCreateError('SELECCIONA O CREA UNA CUENTA DE ORIGEN');
      return;
    }
    setCreateError('');
    setIsSubmitting(true);

    const isMsiApplied = isCreditAccount && type === 'gasto' && isMsi;
    const msiMonthly = isMsiApplied && parsedAmount > 0 ? Number((parsedAmount / msiMonths).toFixed(2)) : null;

    try {
      await addTransactionOptimistic({
        account_id: selectedAccountId,
        amount: parsedAmount.toString(),
        type,
        concept: concept.trim(),
        category,
        is_msi: isMsiApplied,
        msi_months: isMsiApplied ? msiMonths : null,
        msi_monthly_amount: msiMonthly,
        cashback_earned: rewards.hasRewards && rewards.cashback ? rewards.cashback : null,
        points_earned: rewards.hasRewards && rewards.points ? rewards.points : null,
      });
      setModalOpen(false);
      setAmount('');
      setConcept('');
      setCategory(CATEGORIES[0]);
      setUserEditedCategory(false);
      setAutofilledCategory(null);
      setMatchedKeyword(null);
      setIsMsi(false);
      setMsiMonths(3);
    } catch (err: any) {
      setCreateError(err.message?.toUpperCase() || 'ERROR AL REGISTRAR MOVIMIENTO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransactionOptimistic(id);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  // Optimize: memoized filtered list calculation
  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return transactions;
    return transactions.filter((tx) => tx.type === filterType);
  }, [transactions, filterType]);

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
              LIBRO CONTABLE
            </Text>
            <Text style={[styles.headerSub, { color: colors.accent }]}>
              // HISTORIAL DE FLUJO
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setModalOpen(true)}
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
            accessibilityLabel="Nuevo movimiento"
          >
            <Plus size={16} color="#000000" strokeWidth={3} />
            <Text style={styles.addBtnText}>NUEVO MOVIMIENTO</Text>
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
              loadData();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Quick Filter Bar */}
        <View style={styles.filterBar}>
          {[
            { id: 'all', label: 'TODOS' },
            { id: 'gasto', label: 'GASTOS' },
            { id: 'ingreso', label: 'INGRESOS' },
            { id: 'transferencia', label: 'TRANSF.' },
          ].map((f) => {
            const isActive = filterType === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterType(f.id)}
                style={[
                  styles.filterBtn,
                  isMobile && styles.filterBtnMobile,
                  {
                    borderColor: isActive ? colors.accent : colors.borderColor,
                    backgroundColor: isActive ? colors.accentSubtle : colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: isActive ? `2px 2px 0px 0px ${colors.shadowColor}` : 'none' } : {}),
                  },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                accessibilityLabel={`Filtrar por ${f.label}`}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    { color: isActive ? colors.accent : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              [ CARGANDO MOVIMIENTOS... ]
            </Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
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
            <Receipt size={36} color={colors.accent} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              SIN MOVIMIENTOS EN ESTA CATEGORÍA
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Registra tus ingresos, gastos diarios o pagos recurrentes.
            </Text>
            <TouchableOpacity
              onPress={() => setModalOpen(true)}
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
              <Text style={styles.createFirstBtnText}>REGISTRAR MOVIMIENTO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredTransactions.map((tx) => {
              const isGasto = tx.type === 'gasto';
              const isIngreso = tx.type === 'ingreso';

              return (
                <View
                  key={tx.id}
                  style={[
                    styles.item,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.bgBase,
                          borderColor: isGasto
                            ? colors.accentDanger
                            : isIngreso
                            ? colors.accentSuccess
                            : colors.accent,
                        },
                      ]}
                    >
                      {isGasto ? (
                        <ArrowUpRight size={16} color={colors.accentDanger} strokeWidth={2.5} />
                      ) : isIngreso ? (
                        <ArrowDownLeft size={16} color={colors.accentSuccess} strokeWidth={2.5} />
                      ) : (
                        <ArrowLeftRight size={16} color={colors.accent} strokeWidth={2.5} />
                      )}
                    </View>

                    <View style={styles.itemMeta}>
                      <Text style={[styles.concept, { color: colors.textPrimary }]} numberOfLines={1}>
                        {(tx.concept || 'MOVIMIENTO').toUpperCase()}
                      </Text>
                      <View style={styles.subRow}>
                        <View
                          style={[
                            styles.categoryBadge,
                            {
                              borderColor: colors.borderColor,
                              backgroundColor: colors.bgBase,
                            },
                          ]}
                        >
                          <Text style={[styles.categoryBadgeText, { color: colors.textSecondary }]}>
                            {(tx.category || 'GENERAL').toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.dateText, { color: colors.textMuted }]}>
                          {tx.date ? new Date(tx.date).toLocaleDateString() : 'HOY'}
                        </Text>
                        {Boolean(tx.is_msi && tx.msi_months) && (
                          <View style={[styles.msiBadge, { borderColor: colors.accentWarning, backgroundColor: colors.accentWarningSubtle }]}>
                            <Text style={[styles.msiBadgeText, { color: colors.accentWarning }]}>
                              {tx.msi_months} MSI · ${tx.msi_monthly_amount ? parseFloat(String(tx.msi_monthly_amount)).toFixed(2) : ''}/m
                            </Text>
                          </View>
                        )}
                        {Boolean(tx.cashback_earned && parseFloat(String(tx.cashback_earned)) > 0) && (
                          <View style={[styles.rewardBadge, { borderColor: colors.accentSuccess, backgroundColor: colors.accentSuccessSubtle }]}>
                            <Text style={[styles.rewardBadgeText, { color: colors.accentSuccess }]}>
                              +${parseFloat(String(tx.cashback_earned)).toFixed(2)} CASHBACK
                            </Text>
                          </View>
                        )}
                        {Boolean(tx.points_earned && Number(tx.points_earned) > 0) && (
                          <View style={[styles.rewardBadge, { borderColor: colors.accentInfo, backgroundColor: colors.accentInfoSubtle }]}>
                            <Text style={[styles.rewardBadgeText, { color: colors.accentInfo }]}>
                              +{Number(tx.points_earned).toLocaleString()} PTS
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    <Text
                      style={[
                        styles.amount,
                        {
                          color: isGasto
                            ? colors.accentDanger
                            : isIngreso
                            ? colors.accentSuccess
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {isGasto ? '-' : isIngreso ? '+' : ''}${tx.amount}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleDelete(tx.id)}
                      style={[styles.deleteBtn, { borderColor: colors.accentDanger, backgroundColor: colors.accentDangerSubtle }]}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel={`Eliminar movimiento ${tx.concept || 'registrado'}`}
                    >
                      <Trash2 size={13} color={colors.accentDanger} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Registrar Movimiento */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalOpen(false)}
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
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>REGISTRAR MOVIMIENTO</Text>
                <Text style={[styles.modalSub, { color: colors.accent }]}>// LIBRO DIARIO</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
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
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO DE OPERACIÓN</Text>
                <View style={styles.typeRow}>
                  {(['gasto', 'ingreso', 'transferencia'] as TransactionType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setType(t)}
                      style={[
                        styles.typeSelectBtn,
                        {
                          borderColor: type === t ? colors.accent : colors.borderColor,
                          backgroundColor: type === t ? colors.accentSubtle : colors.bgSurface,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.typeSelectText,
                          { color: type === t ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {t.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>MONTO ($)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CONCEPTO / DESCRIPCIÓN</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                  ]}
                  placeholder="Ej. Almuerzo o Compra de Software"
                  placeholderTextColor={colors.textMuted}
                  value={concept}
                  onChangeText={handleConceptChange}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.categoryLabelRow}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>CATEGORÍA</Text>
                  {autofilledCategory ? (
                    <View style={[styles.autoCategoryBadge, { backgroundColor: 'rgba(254, 157, 1, 0.15)', borderColor: '#FE9D01' }]}>
                      <Sparkles size={10} color="#FE9D01" strokeWidth={2.5} />
                      <Text style={[styles.autoCategoryBadgeText, { color: '#FE9D01' }]}>
                        AUTO: {matchedKeyword ? `"${matchedKeyword.toUpperCase()}"` : 'CATÁLOGO'}
                      </Text>
                    </View>
                  ) : userEditedCategory && predictCategory(concept) ? (
                    <TouchableOpacity
                      onPress={() => {
                        const pred = predictCategory(concept);
                        if (pred) {
                          setCategory(pred.category);
                          setUserEditedCategory(false);
                          setAutofilledCategory(pred.category);
                          setMatchedKeyword(pred.matchedKeyword);
                        }
                      }}
                      style={[styles.restoreAutoBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={10} color={colors.textSecondary} strokeWidth={2} />
                      <Text style={[styles.restoreAutoBadgeText, { color: colors.textSecondary }]}>
                        RESTAURAR: {predictCategory(concept)?.category.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => handleSelectCategory(cat)}
                      style={[
                        styles.categoryChip,
                        {
                          borderColor: category === cat ? colors.accent : colors.borderColor,
                          backgroundColor: category === cat ? colors.accentSubtle : colors.bgSurface,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: category === cat ? colors.accent : colors.textPrimary },
                        ]}
                      >
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Account Selector Section */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CUENTA DE ORIGEN / FONDOS *</Text>
                {accounts.length === 0 ? (
                  <View style={[styles.noAccountsCard, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                    <View style={styles.noAccountsTop}>
                      <AlertCircle size={15} color={colors.accent} strokeWidth={2.5} />
                      <Text style={[styles.noAccountsText, { color: colors.textPrimary }]}>
                        NO TIENES CUENTAS CONFIGURADAS AÚN
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.quickCreateAccountBtn,
                        {
                          backgroundColor: colors.accent,
                          borderColor: colors.borderColor,
                          shadowColor: colors.shadowColor,
                          ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                        },
                      ]}
                      onPress={handleQuickCreateDefaultAccount}
                      disabled={isCreatingDefaultAccount}
                      activeOpacity={0.8}
                    >
                      {isCreatingDefaultAccount ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <>
                          <Plus size={14} color="#000000" strokeWidth={3} />
                          <Text style={styles.quickCreateAccountBtnText}>
                            CREAR "BILLETERA PRINCIPAL" (1-CLIC)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.accountPillsRow}>
                    {accounts.map((acc) => {
                      const isSelected = selectedAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.accountPill,
                            {
                              borderColor: isSelected ? colors.borderColor : colors.borderMuted,
                              backgroundColor: isSelected ? colors.accent : colors.bgBase,
                              shadowColor: colors.shadowColor,
                              ...(Platform.OS === 'web' && isSelected
                                ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` }
                                : {}),
                            },
                          ]}
                          onPress={() => setSelectedAccountId(acc.id)}
                          activeOpacity={0.8}
                        >
                          <Landmark
                            size={13}
                            color={isSelected ? '#000000' : colors.accent}
                            strokeWidth={2.5}
                          />
                          <Text
                            style={[
                              styles.accountPillText,
                              { color: isSelected ? '#000000' : colors.textPrimary },
                            ]}
                          >
                            {acc.name.toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              styles.accountPillBalance,
                              { color: isSelected ? '#000000' : colors.textSecondary },
                            ]}
                          >
                            (${acc.current_balance})
                          </Text>
                          {isSelected && <Check size={13} color="#000000" strokeWidth={3} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Live Rewards Preview Badge */}
              {rewards.hasRewards && parsedAmount > 0 && type === 'gasto' && (
                <View
                  style={[
                    styles.rewardsBanner,
                    {
                      borderColor: rewards.badgeColor,
                      backgroundColor: colors.bgBase,
                    },
                  ]}
                >
                  <View style={styles.rewardsHeader}>
                    <Sparkles size={13} color={rewards.badgeColor} strokeWidth={2.5} />
                    <Text style={[styles.rewardsTag, { color: rewards.badgeColor }]}>
                      BENEFICIO ESTIMADO
                    </Text>
                  </View>
                  <Text style={[styles.rewardsTitle, { color: colors.textPrimary }]}>
                    {rewards.label}
                  </Text>
                  {rewards.type === 'points' && rewards.estimatedMxn > 0 && (
                    <Text style={[styles.rewardsEquiv, { color: colors.textSecondary }]}>
                      ≈ ${rewards.estimatedMxn.toFixed(2)} MXN equivalentes
                    </Text>
                  )}
                </View>
              )}

              {/* MSI Deferred Financing Engine */}
              {isCreditAccount && type === 'gasto' && (
                <View
                  style={[
                    styles.msiContainer,
                    {
                      borderColor: isMsi ? colors.accent : colors.borderColor,
                      backgroundColor: colors.bgBase,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.msiToggleRow}
                    onPress={() => setIsMsi((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.msiToggleLeft}>
                      <CreditCard size={15} color={isMsi ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
                      <Text style={[styles.msiToggleText, { color: colors.textPrimary }]}>
                        ¿COMPRA A MESES SIN INTERESES (MSI)?
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.msiCheckbox,
                        {
                          borderColor: isMsi ? colors.accent : colors.borderColor,
                          backgroundColor: isMsi ? colors.accent : 'transparent',
                        },
                      ]}
                    >
                      {isMsi && <Check size={12} color="#000000" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>

                  {isMsi && (
                    <View style={styles.msiExpandedBody}>
                      <Text style={[styles.msiLabel, { color: colors.textSecondary }]}>
                        SELECCIONA PLAZO EN MESES:
                      </Text>
                      <View style={styles.msiPillsGrid}>
                        {[3, 6, 9, 12, 18, 24].map((m) => {
                          const isSelected = msiMonths === m;
                          return (
                            <TouchableOpacity
                              key={m}
                              style={[
                                styles.msiPill,
                                {
                                  borderColor: isSelected ? colors.accent : colors.borderMuted,
                                  backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                                },
                              ]}
                              onPress={() => setMsiMonths(m)}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.msiPillLabel,
                                  { color: isSelected ? '#000000' : colors.textPrimary },
                                ]}
                              >
                                {m} MSI
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {parsedAmount > 0 && (
                        <View
                          style={[
                            styles.msiSummaryBox,
                            {
                              borderColor: colors.borderMuted,
                              backgroundColor: colors.bgSurface,
                            },
                          ]}
                        >
                          <Text style={[styles.msiSummaryTitle, { color: colors.textSecondary }]}>
                            IMPACTO EN MENSUALIDAD:
                          </Text>
                          <Text style={[styles.msiSummaryValue, { color: colors.accent }]}>
                            ${(parsedAmount / msiMonths).toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} / mes
                          </Text>
                          <Text style={[styles.msiSummarySub, { color: colors.textMuted }]}>
                            // Cuota mensual diferida durante {msiMonths} meses sin generar intereses
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Error Alert */}
              {createError ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      borderColor: colors.accentDanger,
                      backgroundColor: colors.accentDangerSubtle,
                    },
                  ]}
                >
                  <AlertCircle size={15} color={colors.accentDanger} strokeWidth={2.5} />
                  <Text style={[styles.errorText, { color: colors.accentDanger }]}>
                    {createError}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleCreate}
                disabled={isSubmitting}
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
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Plus size={16} color="#000000" strokeWidth={3} />
                    <Text style={styles.submitBtnText}>REGISTRAR EN EL LIBRO</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnMobile: {
    flex: 1,
    paddingHorizontal: 4,
  },
  filterBtnText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
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
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    padding: 12,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    flex: 1,
    gap: 2,
  },
  concept: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  categoryBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateText: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
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
  formGroup: {
    gap: 6,
    marginBottom: 12,
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSelectBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSelectText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryChip: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noAccountsCard: {
    borderWidth: 2,
    padding: 12,
    gap: 8,
  },
  noAccountsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noAccountsText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  quickCreateAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  quickCreateAccountBtnText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
    letterSpacing: 0.6,
  },
  accountPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accountPillText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  accountPillBalance: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  msiBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  msiBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.4,
  },
  rewardBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rewardBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.4,
  },
  rewardsBanner: {
    borderWidth: 2,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardsTag: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  rewardsTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  rewardsEquiv: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  msiContainer: {
    borderWidth: 2,
    padding: 12,
    marginBottom: 16,
  },
  msiToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  msiToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  msiToggleText: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  msiCheckbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msiExpandedBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222222',
    gap: 10,
  },
  msiLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  msiPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  msiPill: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  msiPillLabel: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  msiSummaryBox: {
    borderWidth: 1.5,
    padding: 10,
    gap: 3,
  },
  msiSummaryTitle: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  msiSummaryValue: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  msiSummarySub: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  autoCategoryBadgeText: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  restoreAutoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  restoreAutoBadgeText: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
