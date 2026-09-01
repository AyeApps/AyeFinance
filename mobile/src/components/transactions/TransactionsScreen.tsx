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
import { Account, Transaction, TransactionType } from '../../types';

export const TransactionsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('Comida');
  const [type, setType] = useState<TransactionType>('gasto');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [txData, accData] = await Promise.all([
        api.getTransactions(1, 30),
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

  const handleCreate = async () => {
    if (!amount.trim() || !concept.trim() || !selectedAccountId) return;
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
      alert(err.message || 'Error al registrar movimiento');
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderMuted }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Movimientos</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <Plus size={16} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.accent} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {transactions.map((tx) => (
              <View
                key={tx.id}
                style={[styles.item, { backgroundColor: colors.bgSecondary, borderColor: colors.borderMuted }]}
              >
                <View style={styles.itemLeft}>
                  <Text style={[styles.concept, { color: colors.textPrimary }]}>{tx.concept}</Text>
                  <Text style={[styles.category, { color: colors.textMuted }]}>{tx.category} • {tx.type}</Text>
                </View>

                <View style={styles.itemRight}>
                  <Text
                    style={[
                      styles.amount,
                      { color: tx.type === 'ingreso' ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {tx.type === 'ingreso' ? '+' : '-'}${tx.amount}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(tx.id)} style={{ padding: 4, marginLeft: 8 }}>
                    <Trash2 size={14} color={colors.accentDanger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Nuevo Movimiento */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary, borderColor: colors.borderMuted }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nuevo Movimiento</Text>

            {/* Type selector */}
            <View style={[styles.typeSwitch, { backgroundColor: colors.bgSurface }]}>
              {(['gasto', 'ingreso'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && { backgroundColor: colors.accent }]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeText, { color: type === t ? '#000' : colors.textSecondary }]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalForm}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Monto ($)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted, color: colors.textPrimary }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Concepto</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted, color: colors.textPrimary }]}
                placeholder="Ej. Supermercado / Salario"
                placeholderTextColor={colors.textMuted}
                value={concept}
                onChangeText={setConcept}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalOpen(false)} style={[styles.cancelBtn, { borderColor: colors.borderMuted }]}>
                  <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>Registrar</Text>
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
  list: { gap: 10 },
  item: { padding: 14, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLeft: { flex: 1 },
  concept: { fontSize: 14, fontWeight: '600' },
  category: { fontSize: 11, marginTop: 2 },
  itemRight: { flexDirection: 'row', alignItems: 'center' },
  amount: { fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 360, padding: 20, borderRadius: 14, borderWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  typeSwitch: { flexDirection: 'row', borderRadius: 8, padding: 3, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  typeText: { fontSize: 12, fontWeight: '700' },
  modalForm: { gap: 10 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
});
