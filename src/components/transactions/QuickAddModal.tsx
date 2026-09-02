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
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { Account, TransactionType } from '../../types';
import { BankAvatar } from '../ui/BankAvatar';
import { MexicanBankId, detectBankFromName } from '../../constants/mexicanBanks';



interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors } = useTheme();

  const [type, setType] = useState<TransactionType>('gasto');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDefaultAccount, setIsCreatingDefaultAccount] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = async () => {
    try {
      const accs = await api.getAccounts();
      setAccounts(accs);
      if (accs.length > 0) {
        setAccountId((prev) => (prev && accs.some((a) => a.id === prev) ? prev : accs[0].id));
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      loadAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickCreateDefaultAccount = async () => {
    setIsCreatingDefaultAccount(true);
    setError('');
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
      setAccountId(created.id || (accs.length > 0 ? accs[0].id : ''));
    } catch (err: any) {
      setError(err.message?.toUpperCase() || 'ERROR AL CREAR CUENTA RÁPIDA');
    } finally {
      setIsCreatingDefaultAccount(false);
    }
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('INGRESA UN MONTO VÁLIDO MAYOR A 0');
      return;
    }
    if (!description.trim()) {
      setError('INGRESA UNA DESCRIPCIÓN DEL MOVIMIENTO');
      return;
    }
    if (!accountId) {
      setError('SELECCIONA O CREA UNA CUENTA DE ORIGEN ANTES DE GUARDAR');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await api.createTransaction({
        account_id: accountId,
        type,
        amount: parsedAmount.toString(),
        concept: description.trim(),
        category: category.trim() || 'General',
        date: new Date().toISOString().split('T')[0],
      });
      // Reset
      setAmount('');
      setDescription('');
      setCategory('');
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
      <View style={styles.modalRoot}>
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
              width: isMobile ? '92%' : 520,
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
              accessibilityLabel="Cerrar modal"
            >
              <X size={16} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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

            {/* Account Selector Section (Always Rendered & Handled) */}
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
                <View style={styles.accountPillsRow}>
                  {accounts.map((acc) => {
                    const isSelected = accountId === acc.id;
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
                        onPress={() => setAccountId(acc.id)}
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
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Description Field */}
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
                placeholder="Ej. Compra de insumos, Pago de nómina..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Category Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                CATEGORÍA (OPCIONAL)
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
                placeholder="Ej. Alimentación, Software, Renta..."
                placeholderTextColor={colors.textMuted}
                value={category}
                onChangeText={setCategory}
              />
            </View>

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
      </View>
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
});
