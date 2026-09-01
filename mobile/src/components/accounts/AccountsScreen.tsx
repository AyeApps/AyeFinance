import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { Account, AccountType } from '../../types';

export const AccountsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
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
  const [color, setColor] = useState('#FE9D01');

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
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderMuted }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mis Cuentas</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <Plus size={16} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAccounts(); }} tintColor={colors.accent} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {accounts.map((acc) => (
              <View
                key={acc.id}
                style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: acc.color || colors.borderMuted }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.dot, { backgroundColor: acc.color }]} />
                    <View>
                      <Text style={[styles.cardName, { color: colors.textPrimary }]}>{acc.name}</Text>
                      <Text style={[styles.cardType, { color: colors.textMuted }]}>
                        {acc.account_type.toUpperCase()} • {acc.is_liquid ? 'Líquido' : 'No líquido'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(acc.id)}>
                    <Trash2 size={16} color={colors.accentDanger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBalances}>
                  <View>
                    <Text style={[styles.balLabel, { color: colors.textMuted }]}>Saldo Actual</Text>
                    <Text style={[styles.balVal, { color: colors.textPrimary }]}>${acc.current_balance}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.balLabel, { color: colors.textMuted }]}>Proyectado 30d</Text>
                    <Text style={[styles.balVal, { color: colors.accent }]}>${acc.projected_balance}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Nueva Cuenta */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary, borderColor: colors.borderMuted }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nueva Cuenta</Text>

            <View style={styles.modalForm}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre de la Cuenta</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted, color: colors.textPrimary }]}
                placeholder="Ej. Nómina Santander"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Saldo Inicial</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted, color: colors.textPrimary }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={balance}
                onChangeText={setBalance}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalOpen(false)} style={[styles.cancelBtn, { borderColor: colors.borderMuted }]}>
                  <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  addBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  list: { gap: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardType: { fontSize: 11, marginTop: 2 },
  cardBalances: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  balLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  balVal: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 360, padding: 20, borderRadius: 14, borderWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16 },
  modalForm: { gap: 10 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
});
