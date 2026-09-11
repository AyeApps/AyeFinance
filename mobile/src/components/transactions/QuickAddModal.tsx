import React, { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  AlertCircle,
  Landmark,
  Plus,
  Sparkles,
  CreditCard,
  Coins,
  Building2,
  Send,
  Wallet,
  ArrowDown,
  CalendarClock,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useFinanceStore } from '../../store/useFinanceStore';
import { api } from '../../services/api';
import { Account, TransactionType } from '../../types';
import { BankAvatar } from '../ui/BankAvatar';
import { MexicanBankId, detectBankFromName } from '../../constants/mexicanBanks';
import {
  calculateTransactionRewards,
  calculateCreditCardPaymentEstimates,
} from '../../utils/cardBenefits';
import {
  predictCategory,
  STANDARD_CATEGORIES,
} from '../../constants/categoryRules';

export interface QuickAddInitialData {
  type?: TransactionType;
  amount?: string;
  concept?: string;
  category?: string;
  accountId?: string;
  destinationAccountId?: string;
  transferTarget?: 'own' | 'external';
  externalAccountName?: string;
}

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: QuickAddInitialData;
}

const formatMoney = (val: any) => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '0').replace(/[^0-9.-]/g, '')) || 0;
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors } = useTheme();

  const [type, setType] = useState<TransactionType>(initialData?.type || 'gasto');
  const [transferTarget, setTransferTarget] = useState<'own' | 'external'>(initialData?.transferTarget || 'own');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [description, setDescription] = useState(initialData?.concept || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [userEditedCategory, setUserEditedCategory] = useState(Boolean(initialData?.category));
  const [autofilledCategory, setAutofilledCategory] = useState<string | null>(null);
  const [matchedKeyword, setMatchedKeyword] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [destinationAccountId, setDestinationAccountId] = useState(initialData?.destinationAccountId || '');
  const [externalRecipient, setExternalRecipient] = useState(initialData?.externalAccountName || '');
  const accounts = useFinanceStore((state) => state.accounts);
  const addTransactionOptimistic = useFinanceStore((state) => state.addTransactionOptimistic);
  const addAccountOptimistic = useFinanceStore((state) => state.addAccountOptimistic);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDefaultAccount, setIsCreatingDefaultAccount] = useState(false);
  const [error, setError] = useState('');
  const [isMsi, setIsMsi] = useState(false);
  const [msiMonths, setMsiMonths] = useState<number>(3);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const destinationAccount = accounts.find((a) => a.id === destinationAccountId);
  const isCreditAccount = selectedAccount?.account_type === 'credito';

  const debitAccounts = accounts.filter((a) => a.account_type !== 'credito');
  const creditAccounts = accounts.filter((a) => a.account_type === 'credito');

  // Smart TDC Payment Detection: Origin is Debit/Liquid and Destination is Credit
  const isTdcPayment =
    type === 'transferencia' &&
    transferTarget === 'own' &&
    selectedAccount &&
    selectedAccount.account_type !== 'credito' &&
    destinationAccount &&
    destinationAccount.account_type === 'credito';

  const tdcEstimates = isTdcPayment && destinationAccount
    ? calculateCreditCardPaymentEstimates(destinationAccount)
    : null;

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const rewards = calculateTransactionRewards(
    selectedAccount?.bank_id || selectedAccount?.name,
    selectedAccount?.card_product,
    parsedAmount,
    category || description
  );

  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsMsi(false);
      setMsiMonths(3);
      if (initialData) {
        setType(initialData.type || 'gasto');
        setAmount(initialData.amount || '');
        setDescription(initialData.concept || '');
        if (initialData.category) {
          setCategory(initialData.category);
          setUserEditedCategory(true);
          setAutofilledCategory(null);
          setMatchedKeyword(null);
        } else {
          setCategory('');
          setUserEditedCategory(false);
          setAutofilledCategory(null);
          setMatchedKeyword(null);
        }
        if (initialData.accountId) {
          setAccountId(initialData.accountId);
        } else if (accounts.length > 0 && !accountId) {
          setAccountId(accounts[0].id);
        }
        if (initialData.destinationAccountId) {
          setDestinationAccountId(initialData.destinationAccountId);
        }
        if (initialData.transferTarget) {
          setTransferTarget(initialData.transferTarget);
        }
        if (initialData.externalAccountName) {
          setExternalRecipient(initialData.externalAccountName);
        }
      } else {
        setCategory('');
        setUserEditedCategory(false);
        setAutofilledCategory(null);
        setMatchedKeyword(null);
        if (accounts.length > 0 && !accountId) {
          setAccountId(accounts[0].id);
        }
      }
    }
  }, [isOpen, initialData, accounts]);

  // Adjust destination account if origin account is the same
  useEffect(() => {
    if (type === 'transferencia' && transferTarget === 'own') {
      if (destinationAccountId === accountId || !destinationAccountId) {
        const eligible = accounts.find((a) => a.id !== accountId);
        if (eligible) {
          setDestinationAccountId(eligible.id);
        }
      }
    }
  }, [type, transferTarget, accountId, accounts]);

  if (!isOpen) return null;

  const handleDescriptionChange = (text: string) => {
    setDescription(text);

    // Intelligent auto-classification:
    // Only auto-fills if user has not typed their own custom category with keyboard.
    if (!userEditedCategory) {
      const prediction = predictCategory(text);
      if (prediction) {
        setCategory(prediction.category);
        setAutofilledCategory(prediction.category);
        setMatchedKeyword(prediction.matchedKeyword);
      } else if (autofilledCategory) {
        setCategory('');
        setAutofilledCategory(null);
        setMatchedKeyword(null);
      }
    }
  };

  const handleCategoryChange = (text: string) => {
    setCategory(text);
    if (text.trim() === '') {
      // User erased the category field: reset manual lock and immediately re-evaluate description
      setUserEditedCategory(false);
      setAutofilledCategory(null);
      setMatchedKeyword(null);

      const prediction = predictCategory(description);
      if (prediction) {
        setCategory(prediction.category);
        setAutofilledCategory(prediction.category);
        setMatchedKeyword(prediction.matchedKeyword);
      }
    } else {
      // User typed something with the keyboard: stop auto-fill from overwriting their input
      setUserEditedCategory(true);
      setAutofilledCategory(null);
      setMatchedKeyword(null);
    }
  };

  const handleSelectCategoryPill = (catName: string) => {
    setCategory(catName);
    setUserEditedCategory(true);
    setAutofilledCategory(null);
    setMatchedKeyword(null);
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const whole = parts[0];
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.length > 1 ? `${formattedWhole}.${parts[1]}` : formattedWhole;
    setAmount(formatted);
  };

  const renderAccountPill = (
    acc: Account,
    currentSelectedId: string,
    onSelect: (id: string) => void,
    isDest = false
  ) => {
    const isSelected = currentSelectedId === acc.id;
    const isCredit = acc.account_type === 'credito';
    const rawBal = parseFloat(String(acc.current_balance || '0')) || 0;

    return (
      <TouchableOpacity
        key={acc.id}
        style={[
          styles.accountPill,
          {
            borderColor: isSelected ? colors.borderColor : colors.borderMuted,
            backgroundColor: isSelected ? colors.accent : colors.bgSurface,
            shadowColor: colors.shadowColor,
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: isSelected
                    ? `3px 3px 0px 0px ${colors.shadowColor}`
                    : 'none',
                }
              : {}),
          },
        ]}
        onPress={() => onSelect(acc.id)}
        activeOpacity={0.8}
      >
        <BankAvatar
          bankId={
            acc.bank_id && acc.bank_id !== 'generic'
              ? (acc.bank_id as MexicanBankId)
              : detectBankFromName(acc.name) || 'generic'
          }
          size={18}
          showBorder={false}
        />

        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: isSelected
                ? '#000000'
                : isCredit
                ? 'rgba(255, 23, 68, 0.15)'
                : 'rgba(0, 230, 118, 0.15)',
              borderColor: isSelected
                ? '#000000'
                : isCredit
                ? colors.accentDanger
                : colors.accentSuccess,
            },
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
              {
                color: isSelected
                  ? '#ffffff'
                  : isCredit
                  ? colors.accentDanger
                  : colors.accentSuccess,
              },
            ]}
          >
            {isCredit ? 'TDC' : 'TDD'}
          </Text>
        </View>

        <Text
          style={[
            styles.accountPillText,
            { color: isSelected ? '#000000' : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {acc.name.toUpperCase()}
        </Text>

        <Text
          style={[
            styles.accountPillBalance,
            { color: isSelected ? '#000000' : colors.textSecondary },
          ]}
        >
          {isCredit
            ? `(Deuda: $${rawBal.toLocaleString('es-MX', { maximumFractionDigits: 0 })})`
            : `($${rawBal.toLocaleString('es-MX', { maximumFractionDigits: 0 })})`}
        </Text>
        {isSelected && <Check size={13} color="#000000" strokeWidth={3} />}
      </TouchableOpacity>
    );
  };

  const handleQuickCreateDefaultAccount = async () => {
    setIsCreatingDefaultAccount(true);
    setError('');
    try {
      const created = await addAccountOptimistic({
        name: 'Billetera Principal',
        account_type: 'corriente',
        currency: 'MXN',
        initial_balance: 0,
        is_liquid: true,
        color: '#FE9D01',
      });
      setAccountId(created.id);
    } catch (err: any) {
      setError(err.message?.toUpperCase() || 'ERROR AL CREAR CUENTA RÁPIDA');
    } finally {
      setIsCreatingDefaultAccount(false);
    }
  };

  const handleSubmit = async () => {
    const validAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(validAmount) || validAmount <= 0) {
      setError('INGRESA UN MONTO VÁLIDO MAYOR A 0');
      return;
    }
    if (!accountId) {
      setError('SELECCIONA O CREA UNA CUENTA DE ORIGEN ANTES DE GUARDAR');
      return;
    }

    if (type === 'transferencia') {
      if (transferTarget === 'external') {
        if (!externalRecipient.trim()) {
          setError('INGRESA EL NOMBRE O BENEFICIARIO DE LA CUENTA EXTERNA');
          return;
        }
      } else {
        if (!destinationAccountId) {
          setError('SELECCIONA LA CUENTA DE DESTINO');
          return;
        }
        if (destinationAccountId === accountId) {
          setError('LA CUENTA DE ORIGEN Y DESTINO NO PUEDEN SER LA MISMA');
          return;
        }
      }
    } else {
      if (!description.trim()) {
        setError('INGRESA UNA DESCRIPCIÓN DEL MOVIMIENTO');
        return;
      }
    }

    let finalConcept = description.trim();
    if (!finalConcept) {
      if (type === 'transferencia') {
        if (transferTarget === 'external') {
          finalConcept = `Transferencia a ${externalRecipient.trim()}`;
        } else {
          const originAcc = accounts.find((a) => a.id === accountId);
          const destAcc = accounts.find((a) => a.id === destinationAccountId);
          if (destAcc?.account_type === 'credito') {
            finalConcept = `Pago TDC: ${destAcc.name}`;
          } else {
            finalConcept = `Traspaso: ${originAcc?.name || 'Origen'} ➔ ${destAcc?.name || 'Destino'}`;
          }
        }
      } else {
        finalConcept = type === 'gasto' ? 'Gasto' : 'Ingreso';
      }
    }

    setError('');
    setIsLoading(true);

    const isMsiApplied = isCreditAccount && type === 'gasto' && isMsi;
    const msiMonthly = isMsiApplied && validAmount > 0 ? Number((validAmount / msiMonths).toFixed(2)) : null;

    try {
      await addTransactionOptimistic({
        account_id: accountId,
        destination_account_id: type === 'transferencia' && transferTarget === 'own' ? destinationAccountId : null,
        is_external: type === 'transferencia' && transferTarget === 'external',
        external_account_name: type === 'transferencia' && transferTarget === 'external' ? externalRecipient.trim() : null,
        type,
        amount: validAmount.toString(),
        concept: finalConcept,
        category: category.trim() || (type === 'transferencia' ? 'Transferencias' : 'General'),
        date: new Date().toISOString().split('T')[0],
        is_msi: isMsiApplied,
        msi_months: isMsiApplied ? msiMonths : null,
        msi_monthly_amount: msiMonthly,
        cashback_earned: rewards.hasRewards && rewards.cashback ? rewards.cashback : null,
        points_earned: rewards.hasRewards && rewards.points ? rewards.points : null,
      });

      // Reset
      setAmount('');
      setDescription('');
      setCategory('');
      setUserEditedCategory(false);
      setAutofilledCategory(null);
      setMatchedKeyword(null);
      setExternalRecipient('');
      setIsMsi(false);
      setMsiMonths(3);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message?.toUpperCase() || 'ERROR AL REGISTRAR MOVIMIENTO');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        {/* Dimming Pitch-Black Backdrop Overlay */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Frame Box */}
        <View
          style={[
            styles.modalFrame,
            {
              backgroundColor: colors.bgBase,
              borderColor: colors.borderColor,
              shadowColor: colors.shadowColor,
              width: isMobile ? '94%' : 520,
              maxWidth: 520,
              ...(Platform.OS === 'web' ? { boxShadow: `12px 12px 0px 0px ${colors.shadowColor}` } : {}),
            },
          ]}
        >
          {/* Top Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.borderColor }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                REGISTRAR MOVIMIENTO
              </Text>
              <Text style={[styles.modalSub, { color: colors.accent }]}>
                // LIBRO DE FLUJO DE CAJA
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.closeBtn,
                {
                  borderColor: colors.borderColor,
                  backgroundColor: colors.bgSurface,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cerrar modal"
            >
              <X size={16} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type Selector (Segmented Tabs) */}
            <View style={[styles.typeSelector, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'gasto' && { backgroundColor: colors.accentDanger },
                ]}
                onPress={() => setType('gasto')}
                activeOpacity={0.8}
              >
                <ArrowUpRight size={15} color={type === 'gasto' ? '#ffffff' : colors.textPrimary} strokeWidth={2.5} />
                <Text
                  style={[
                    styles.typeTabText,
                    { color: type === 'gasto' ? '#ffffff' : colors.textPrimary },
                  ]}
                >
                  GASTO
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'ingreso' && { backgroundColor: colors.accentSuccess },
                ]}
                onPress={() => setType('ingreso')}
                activeOpacity={0.8}
              >
                <ArrowDownLeft size={15} color={type === 'ingreso' ? '#000000' : colors.textPrimary} strokeWidth={2.5} />
                <Text
                  style={[
                    styles.typeTabText,
                    { color: type === 'ingreso' ? '#000000' : colors.textPrimary },
                  ]}
                >
                  INGRESO
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'transferencia' && { backgroundColor: colors.accent },
                ]}
                onPress={() => setType('transferencia')}
                activeOpacity={0.8}
              >
                <ArrowLeftRight size={15} color={type === 'transferencia' ? '#000000' : colors.textPrimary} strokeWidth={2.5} />
                <Text
                  style={[
                    styles.typeTabText,
                    { color: type === 'transferencia' ? '#000000' : colors.textPrimary },
                  ]}
                >
                  TRANSF.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Si es transferencia, Selector de Destino: Cuentas Propias vs Externa */}
            {type === 'transferencia' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  MODALIDAD DE TRANSFERENCIA *
                </Text>
                <View style={[styles.targetSelector, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}>
                  <TouchableOpacity
                    style={[
                      styles.targetTab,
                      transferTarget === 'own' && { backgroundColor: colors.accent },
                    ]}
                    onPress={() => setTransferTarget('own')}
                    activeOpacity={0.8}
                  >
                    <Building2 size={13} color={transferTarget === 'own' ? '#000000' : colors.textPrimary} strokeWidth={2.5} />
                    <Text
                      style={[
                        styles.targetTabText,
                        { color: transferTarget === 'own' ? '#000000' : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {width < 420 ? 'PROPIAS' : 'ENTRE CUENTAS PROPIAS'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.targetTab,
                      transferTarget === 'external' && { backgroundColor: colors.accent },
                    ]}
                    onPress={() => setTransferTarget('external')}
                    activeOpacity={0.8}
                  >
                    <Send size={13} color={transferTarget === 'external' ? '#000000' : colors.textPrimary} strokeWidth={2.5} />
                    <Text
                      style={[
                        styles.targetTabText,
                        { color: transferTarget === 'external' ? '#000000' : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {width < 420 ? 'EXTERNA' : 'A CUENTA EXTERNA'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Account Selector Section (Origin - Grouped TDD vs TDC) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                CUENTA DE ORIGEN / FONDOS *
              </Text>
              {accounts.length === 0 ? (
                <View
                  style={[
                    styles.noAccountsCard,
                    {
                      borderColor: colors.borderColor,
                      backgroundColor: colors.bgSurface,
                    },
                  ]}
                >
                  <View style={styles.noAccountsTop}>
                    <AlertCircle size={16} color={colors.accent} strokeWidth={2.5} />
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
                <View style={styles.groupedAccountsContainer}>
                  {/* Cuentas de Débito / Efectivo */}
                  {debitAccounts.length > 0 && (
                    <View style={styles.accountSubGroup}>
                      <View style={styles.subGroupHeader}>
                        <Wallet size={11} color={colors.accentSuccess} strokeWidth={2.5} />
                        <Text style={[styles.subGroupLabel, { color: colors.textSecondary }]}>
                          CUENTAS DE DÉBITO / LIQUIDEZ [TDD] ({debitAccounts.length})
                        </Text>
                      </View>
                      <View style={styles.accountPillsRow}>
                        {debitAccounts.map((acc) => renderAccountPill(acc, accountId, setAccountId))}
                      </View>
                    </View>
                  )}

                  {/* Tarjetas de Crédito */}
                  {creditAccounts.length > 0 && (
                    <View style={[styles.accountSubGroup, debitAccounts.length > 0 && { marginTop: 10 }]}>
                      <View style={styles.subGroupHeader}>
                        <CreditCard size={11} color={colors.accentDanger} strokeWidth={2.5} />
                        <Text style={[styles.subGroupLabel, { color: colors.textSecondary }]}>
                          TARJETAS DE CRÉDITO [TDC] ({creditAccounts.length})
                        </Text>
                      </View>
                      <View style={styles.accountPillsRow}>
                        {creditAccounts.map((acc) => renderAccountPill(acc, accountId, setAccountId))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Separador Visual entre Origen y Destino */}
            {type === 'transferencia' && transferTarget === 'own' && (
              <View style={styles.transferDividerContainer}>
                <View style={[styles.transferDividerLine, { backgroundColor: colors.borderColor }]} />
                <View
                  style={[
                    styles.transferDividerBadge,
                    {
                      backgroundColor: colors.bgBase,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                >
                  <ArrowDown size={13} color={colors.accent} strokeWidth={3} />
                  <Text style={[styles.transferDividerText, { color: colors.textPrimary }]}>
                    TRANSFERIR A // DESTINO
                  </Text>
                  <ArrowDown size={13} color={colors.accent} strokeWidth={3} />
                </View>
                <View style={[styles.transferDividerLine, { backgroundColor: colors.borderColor }]} />
              </View>
            )}

            {/* Destination Selector if Transfer between Own Accounts */}
            {type === 'transferencia' && transferTarget === 'own' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  CUENTA DE DESTINO *
                </Text>
                {accounts.filter((a) => a.id !== accountId).length === 0 ? (
                  <View style={[styles.singleAccountWarning, { borderColor: colors.borderMuted, backgroundColor: colors.bgSurface }]}>
                    <AlertCircle size={14} color={colors.accentWarning} strokeWidth={2.5} />
                    <Text style={[styles.singleAccountWarningText, { color: colors.textSecondary }]}>
                      Necesitas al menos dos cuentas registradas para transferir entre cuentas propias.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.groupedAccountsContainer}>
                    {/* Cuentas de Débito Destino */}
                    {debitAccounts.filter((a) => a.id !== accountId).length > 0 && (
                      <View style={styles.accountSubGroup}>
                        <View style={styles.subGroupHeader}>
                          <Wallet size={11} color={colors.accentSuccess} strokeWidth={2.5} />
                          <Text style={[styles.subGroupLabel, { color: colors.textSecondary }]}>
                            DESTINO DÉBITO / AHORRO [TDD]
                          </Text>
                        </View>
                        <View style={styles.accountPillsRow}>
                          {debitAccounts
                            .filter((a) => a.id !== accountId)
                            .map((acc) => renderAccountPill(acc, destinationAccountId, setDestinationAccountId, true))}
                        </View>
                      </View>
                    )}

                    {/* Tarjetas de Crédito Destino (Pago de Tarjeta) */}
                    {creditAccounts.filter((a) => a.id !== accountId).length > 0 && (
                      <View
                        style={[
                          styles.accountSubGroup,
                          debitAccounts.filter((a) => a.id !== accountId).length > 0 && { marginTop: 10 },
                        ]}
                      >
                        <View style={styles.subGroupHeader}>
                          <CreditCard size={11} color={colors.accentDanger} strokeWidth={2.5} />
                          <Text style={[styles.subGroupLabel, { color: colors.textSecondary }]}>
                            DESTINO TARJETA DE CRÉDITO [TDC - PAGO]
                          </Text>
                        </View>
                        <View style={styles.accountPillsRow}>
                          {creditAccounts
                            .filter((a) => a.id !== accountId)
                            .map((acc) => renderAccountPill(acc, destinationAccountId, setDestinationAccountId, true))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Smart TDC Payment Recommendation Card (Debit -> Credit) */}
            {isTdcPayment && destinationAccount && tdcEstimates && (
              <View
                style={[
                  styles.tdcPaymentBox,
                  {
                    borderColor: colors.accent,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
              >
                <View style={styles.tdcPaymentHeader}>
                  <View style={styles.tdcPaymentHeaderLeft}>
                    <CreditCard size={14} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.tdcPaymentTitle, { color: colors.accent }]}>
                      PAGO DE TARJETA // {destinationAccount.name.toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.tdcDebtBadge,
                      {
                        borderColor: tdcEstimates.currentDebt > 0 ? colors.accentDanger : colors.accentSuccess,
                        backgroundColor: colors.bgBase,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tdcDebtBadgeText,
                        { color: tdcEstimates.currentDebt > 0 ? colors.accentDanger : colors.accentSuccess },
                      ]}
                    >
                      DEUDA: ${formatMoney(tdcEstimates.currentDebt)}
                    </Text>
                  </View>
                </View>

                {tdcEstimates.dueDateLabel ? (
                  <View style={styles.tdcDueRow}>
                    <View style={styles.tdcDueLeft}>
                      <CalendarClock size={12} color={tdcEstimates.isOverdueRisk ? colors.accentDanger : colors.accent} strokeWidth={2.5} />
                      <Text style={[styles.tdcDueLabel, { color: colors.textSecondary }]}>
                        LÍMITE DE PAGO:{' '}
                        <Text style={{ color: tdcEstimates.isOverdueRisk ? colors.accentDanger : colors.textPrimary, fontWeight: '900' }}>
                          {tdcEstimates.dueDateLabel.toUpperCase()}
                        </Text>
                      </Text>
                    </View>

                    {tdcEstimates.daysUntilDue !== undefined && (
                      <View
                        style={[
                          styles.daysCountBadge,
                          {
                            borderColor: tdcEstimates.isOverdueRisk ? colors.accentDanger : colors.accent,
                            backgroundColor: colors.bgBase,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.daysCountBadgeText,
                            { color: tdcEstimates.isOverdueRisk ? colors.accentDanger : colors.accent },
                          ]}
                        >
                          {tdcEstimates.daysUntilDue === 0
                            ? '¡VENCE HOY!'
                            : tdcEstimates.daysUntilDue === 1
                            ? 'FALTA 1 DÍA'
                            : `FALTAN ${tdcEstimates.daysUntilDue} DÍAS`}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {tdcEstimates.currentDebt > 0 ? (
                  <View style={styles.tdcQuickButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.tdcQuickBtn,
                        styles.tdcQuickBtnPrimary,
                        {
                          backgroundColor: colors.accentSuccess,
                          borderColor: colors.borderColor,
                        },
                      ]}
                      onPress={() => {
                        setAmount(tdcEstimates.noInterestPayment.toString());
                        if (!description || description.startsWith('Transferencia') || description.startsWith('Pago') || description.startsWith('Traspaso')) {
                          setDescription(`Pago para no generar intereses - ${destinationAccount.name}`);
                        }
                        setCategory('Pago de Tarjeta');
                        setUserEditedCategory(true);
                        setAutofilledCategory('Pago de Tarjeta');
                        setMatchedKeyword('pago tdc');
                      }}
                      activeOpacity={0.8}
                    >
                      <Sparkles size={13} color="#000000" strokeWidth={2.5} />
                      <View>
                        <Text style={styles.tdcQuickBtnTitle}>NO GENERAR INTERESES</Text>
                        <Text style={styles.tdcQuickBtnAmount}>
                          ${formatMoney(tdcEstimates.noInterestPayment)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.tdcQuickBtn,
                        styles.tdcQuickBtnSecondary,
                        {
                          backgroundColor: colors.accent,
                          borderColor: colors.borderColor,
                        },
                      ]}
                      onPress={() => {
                        setAmount(tdcEstimates.minimumPayment.toString());
                        if (!description || description.startsWith('Transferencia') || description.startsWith('Pago') || description.startsWith('Traspaso')) {
                          setDescription(`Pago mínimo - ${destinationAccount.name}`);
                        }
                        setCategory('Pago de Tarjeta');
                        setUserEditedCategory(true);
                        setAutofilledCategory('Pago de Tarjeta');
                        setMatchedKeyword('pago minimo');
                      }}
                      activeOpacity={0.8}
                    >
                      <Coins size={13} color="#000000" strokeWidth={2.5} />
                      <View>
                        <Text style={styles.tdcQuickBtnTitle}>PAGO MÍNIMO ESTIMADO</Text>
                        <Text style={styles.tdcQuickBtnAmount}>
                          ${formatMoney(tdcEstimates.minimumPayment)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.tdcSettledBox, { borderColor: colors.borderMuted }]}>
                    <Check size={14} color={colors.accentSuccess} strokeWidth={3} />
                    <Text style={[styles.tdcSettledText, { color: colors.accentSuccess }]}>
                      TARJETA AL CORRIENTE // SIN SALDO DEUDOR PENDIENTE
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Recipient Input if External Transfer */}
            {type === 'transferencia' && transferTarget === 'external' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  NOMBRE / BENEFICIARIO EXTERNO *
                </Text>
                <TextInput
                  style={[
                    styles.geometricInput,
                    {
                      borderColor: colors.borderColor,
                      backgroundColor: colors.bgBase,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Ej. Juan Pérez, CFE, Proveedor X..."
                  placeholderTextColor={colors.textMuted}
                  value={externalRecipient}
                  onChangeText={(txt) => {
                    setExternalRecipient(txt);
                    if (!description || description.startsWith('Transferencia a ')) {
                      setDescription(txt.trim() ? `Transferencia a ${txt.trim()}` : '');
                    }
                  }}
                />
              </View>
            )}

            {/* Amount Field (Hero Number) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                MONTO ($) *
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
              />
            </View>

            {/* Description Field (Shown conditionally or general) */}
            {!(type === 'transferencia' && transferTarget === 'external') && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  DESCRIPCIÓN / CONCEPTO *
                </Text>
                <TextInput
                  style={[
                    styles.geometricInput,
                    {
                      borderColor: colors.borderColor,
                      backgroundColor: colors.bgBase,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder={
                    type === 'transferencia'
                      ? 'Ej. Traspaso de nómina, Pago TDC...'
                      : 'Ej. Gasolina Pemex, Uber, Walmart...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={handleDescriptionChange}
                />
              </View>
            )}

            {/* Category Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.categoryLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                  CATEGORÍA (OPCIONAL)
                </Text>
                {autofilledCategory ? (
                  <View style={[styles.autoCategoryBadge, { backgroundColor: 'rgba(254, 157, 1, 0.15)', borderColor: '#FE9D01' }]}>
                    <Sparkles size={11} color="#FE9D01" strokeWidth={2.5} />
                    <Text style={[styles.autoCategoryBadgeText, { color: '#FE9D01' }]}>
                      AUTO: {matchedKeyword ? `"${matchedKeyword.toUpperCase()}"` : 'CATÁLOGO'}
                    </Text>
                  </View>
                ) : userEditedCategory && predictCategory(description) ? (
                  <TouchableOpacity
                    onPress={() => {
                      const pred = predictCategory(description);
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
                      RESTAURAR: {predictCategory(description)?.category.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TextInput
                style={[
                  styles.geometricInput,
                  {
                    borderColor: autofilledCategory ? '#FE9D01' : colors.borderColor,
                    backgroundColor: colors.bgBase,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder={type === 'transferencia' ? 'Transferencias' : 'Ej. Combustible, Transporte, Supermercado...'}
                placeholderTextColor={colors.textMuted}
                value={category}
                onChangeText={handleCategoryChange}
              />

              {/* Quick Category Reference Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryQuickScroll}
                contentContainerStyle={styles.categoryQuickContent}
              >
                {STANDARD_CATEGORIES.map((cat) => {
                  const isSelected = category.trim().toLowerCase() === cat.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => handleSelectCategoryPill(cat)}
                      style={[
                        styles.categoryQuickPill,
                        {
                          borderColor: isSelected ? '#FE9D01' : colors.borderColor,
                          backgroundColor: isSelected ? 'rgba(254, 157, 1, 0.15)' : colors.bgSurface,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryQuickPillText,
                          {
                            color: isSelected ? '#FE9D01' : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Live Rewards Preview Badge */}
            {rewards.hasRewards && parsedAmount > 0 && type === 'gasto' && (
              <View
                style={[
                  styles.rewardsBanner,
                  {
                    borderColor: rewards.badgeColor,
                    backgroundColor: colors.bgSurface,
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
                    backgroundColor: colors.bgSurface,
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
                                backgroundColor: isSelected ? colors.accent : colors.bgBase,
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
                            backgroundColor: colors.bgBase,
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
                          // Cuota mensual durante {msiMonths} meses sin generar intereses
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Error Alert */}
            {error ? (
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
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.borderColor,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.submitBtnText}>
                  + GUARDAR MOVIMIENTO
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalFrame: {
    borderWidth: 2,
    zIndex: 20,
    maxHeight: '90%',
    shadowOffset: { width: 12, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalSub: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  typeSelector: {
    flexDirection: 'row',
    borderWidth: 2,
    marginBottom: 18,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    minHeight: 42,
  },
  typeTabText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  noAccountsCard: {
    borderWidth: 2,
    padding: 14,
    gap: 10,
  },
  noAccountsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noAccountsText: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  quickCreateAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  quickCreateAccountBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
    letterSpacing: 0.8,
  },
  accountPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountPill: {
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
  accountPillText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  accountPillBalance: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  amountInput: {
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  geometricInput: {
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 10.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  submitBtn: {
    borderWidth: 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    minHeight: 48,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
    textTransform: 'uppercase',
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
  targetSelector: {
    flexDirection: 'row',
    borderWidth: 2,
    marginBottom: 14,
  },
  targetTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    minHeight: 38,
  },
  targetTabText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  groupedAccountsContainer: {
    gap: 6,
  },
  accountSubGroup: {
    gap: 6,
  },
  subGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  subGroupLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  typeBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  singleAccountWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    padding: 12,
  },
  singleAccountWarningText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  tdcPaymentBox: {
    borderWidth: 2,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  tdcPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  tdcPaymentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tdcPaymentTitle: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  tdcDebtBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tdcDebtBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  tdcDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingTop: 8,
  },
  tdcDueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  tdcDueLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  daysCountBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  daysCountBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  transferDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  transferDividerLine: {
    flex: 1,
    height: 2,
  },
  transferDividerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  transferDividerText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  tdcQuickButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tdcQuickBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  tdcQuickBtnPrimary: {},
  tdcQuickBtnSecondary: {},
  tdcQuickBtnTitle: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  tdcQuickBtnAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tdcSettledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    padding: 8,
  },
  tdcSettledText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
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
  categoryQuickScroll: {
    marginTop: 8,
    flexGrow: 0,
  },
  categoryQuickContent: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 10,
  },
  categoryQuickPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 2,
  },
  categoryQuickPillText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
});
