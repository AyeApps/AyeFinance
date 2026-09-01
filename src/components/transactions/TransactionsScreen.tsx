import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Receipt, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, X, Landmark, Check, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { Account, Transaction, TransactionType } from '../../types';

const CATEGORIES = ['General', 'Comida', 'Transporte', 'Servicios', 'Supermercado', 'Salario', 'Inversión', 'Entretenimiento'];

export const TransactionsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [type, setType] = useState<TransactionType>('gasto');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [txData, accData] = await Promise.all([
        api.getTransactions(1, 40),
        api.getAccounts(),
      ]);
      setTransactions(txData.items || []);
      setAccounts(accData);
      if (accData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accData[0].id);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [isCreatingDefaultAccount, setIsCreatingDefaultAccount] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleQuickCreateDefaultAccount = async () => {
    setIsCreatingDefaultAccount(true);
    setCreateError('');
    try {
      const created = await api.createAccount({
        name: 'Billetera Principal',
        account_type: 'corriente',
        currency: 'MXN',
        initial_balance: 0,
        is_liquid: true,
        color: '#FE9D01',
      });
      const accs = await api.getAccounts();
      setAccounts(accs);
      setSelectedAccountId(created.id || (accs.length > 0 ? accs[0].id : ''));
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
    try {
      await api.createTransaction({
        account_id: selectedAccountId,
        amount: parseFloat(amount) || 0,
        type,
        concept: concept.trim(),
        category,
      });
      setModalOpen(false);
      setAmount('');
      setConcept('');
      loadData();
    } catch (err: any) {
      setCreateError(err.message?.toUpperCase() || 'ERROR AL REGISTRAR MOVIMIENTO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTransaction(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    return tx.type === filterType;
  });

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomInset = insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Sub Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bgBase,
            borderBottomColor: colors.borderColor,
            paddingTop: topInset,
            height: (isMobile ? 56 : 64) + topInset,
          },
          isMobile && styles.headerMobile,
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
        >
          <ArrowLeft size={16} color={colors.textPrimary} strokeWidth={2.5} />
          <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>
            {isMobile ? 'VOLVER' : 'VOLVER AL PANEL'}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            LIBRO DE MOVIMIENTOS
          </Text>
          <Text style={[styles.headerSub, { color: colors.accent }]}>
            // HISTORIAL CONTABLE DE FLUJO
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
        >
          <Plus size={16} color="#000000" strokeWidth={3} />
          {!isMobile && <Text style={styles.addBtnText}>NUEVO MOVIMIENTO</Text>}
        </TouchableOpacity>
      </View>

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
                  {
                    borderColor: isActive ? colors.accent : colors.borderColor,
                    backgroundColor: isActive ? colors.accentSubtle : colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: isActive ? `2px 2px 0px 0px ${colors.shadowColor}` : 'none' } : {}),
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    { color: isActive ? colors.accent : colors.textPrimary },
                  ]}
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
        <View style={styles.modalOverlay}>
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
                width: isMobile ? '92%' : 480,
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
              >
                <X size={16} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
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
                  onChangeText={setConcept}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORÍA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
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
        </View>
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
    paddingVertical: 6,
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
});
