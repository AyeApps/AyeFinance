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
} from 'react-native';
import { ArrowLeft, Plus, Trash2, Landmark, PiggyBank, LineChart, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { Account, AccountType } from '../../types';

const PALETTE = ['#FE9D01', '#00e676', '#00b0ff', '#a855f7', '#ec4899', '#ff1744'];

export const AccountsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('corriente');
  const [balance, setBalance] = useState('');
  const [isLiquid, setIsLiquid] = useState(true);
  const [color, setColor] = useState(PALETTE[0]);
  const [isCreating, setIsCreating] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleCreate = async () => {
    if (!name.trim() || !balance.trim()) return;
    setIsCreating(true);
    try {
      await api.createAccount({
        name: name.trim(),
        account_type: type,
        initial_balance: parseFloat(balance) || 0,
        is_liquid: isLiquid,
        color,
      });
      setModalOpen(false);
      setName('');
      setBalance('');
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Error al crear cuenta');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAccount(id);
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Sub Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bgBase,
            borderBottomColor: colors.borderColor,
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
            MIS CUENTAS BANCARIAS
          </Text>
          <Text style={[styles.headerSub, { color: colors.accent }]}>
            // GESTIÓN DE CAPITAL & LIQUIDEZ
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
          {!isMobile && <Text style={styles.addBtnText}>NUEVA CUENTA</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isMobile ? 100 : 120 }]}
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
              <Text style={styles.createFirstBtnText}>CREAR PRIMERA CUENTA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {accounts.map((acc) => (
              <View
                key={acc.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderColor,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
              >
                <View style={[styles.cardTopStripe, { backgroundColor: acc.color || colors.accent }]} />

                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.bgBase,
                          borderColor: colors.borderColor,
                        },
                      ]}
                    >
                      {acc.account_type === 'ahorro' ? (
                        <PiggyBank size={18} color="#00b0ff" strokeWidth={2.5} />
                      ) : acc.account_type === 'inversion' ? (
                        <LineChart size={18} color="#a855f7" strokeWidth={2.5} />
                      ) : (
                        <Landmark size={18} color={colors.accentSuccess} strokeWidth={2.5} />
                      )}
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {acc.name.toUpperCase()}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.typeBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                          <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>
                            {acc.account_type.toUpperCase()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.typeBadge,
                            {
                              borderColor: acc.is_liquid ? colors.accentSuccess : colors.accent,
                              backgroundColor: acc.is_liquid ? colors.accentSuccessSubtle : colors.accentSubtle,
                            },
                          ]}
                        >
                          <Text style={[styles.typeBadgeText, { color: acc.is_liquid ? colors.accentSuccess : colors.accent }]}>
                            {acc.is_liquid ? 'LÍQUIDO' : 'PATRIMONIO'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(acc.id)}
                    style={[styles.deleteBtn, { borderColor: colors.accentDanger, backgroundColor: colors.accentDangerSubtle }]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color={colors.accentDanger} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.cardBalances, { borderTopColor: colors.borderMuted }]}>
                  <View>
                    <Text style={[styles.balLabel, { color: colors.textSecondary }]}>SALDO ACTUAL</Text>
                    <Text style={[styles.balVal, { color: colors.textPrimary }]}>${acc.current_balance}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.balLabel, { color: colors.textSecondary }]}>PROYECTADO 30D</Text>
                    <Text style={[styles.balVal, { color: colors.accent }]}>${acc.projected_balance}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Nueva Cuenta */}
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
                width: isMobile ? '92%' : 460,
                ...(Platform.OS === 'web' ? { boxShadow: `8px 8px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={[styles.modalHeaderRow, { borderBottomColor: colors.borderColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>NUEVA CUENTA</Text>
                <Text style={[styles.modalSub, { color: colors.accent }]}>// REGISTRO DE ACTIVO</Text>
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
                <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE DE LA CUENTA</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                  ]}
                  placeholder="Ej. Nómina Santander"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>SALDO INICIAL ($)</Text>
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

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO DE CUENTA</Text>
                <View style={styles.typeRow}>
                  {(['corriente', 'ahorro', 'inversion'] as AccountType[]).map((t) => (
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
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
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
  deleteBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBalances: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  balLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  balVal: {
    fontSize: 18,
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
