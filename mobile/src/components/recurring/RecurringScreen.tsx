import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { RecurringItem } from '../../types';

export const RecurringScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { colors } = useTheme();
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecurring = useCallback(async () => {
    try {
      const data = await api.getRecurring();
      setItems(data);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecurring();
  }, [loadRecurring]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderMuted }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Gastos e Ingresos Fijos</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRecurring(); }} tintColor={colors.accent} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.borderMuted }]}
              >
                <View style={styles.cardLeft}>
                  <Calendar size={18} color={item.type === 'ingreso_fijo' ? '#10B981' : colors.accent} />
                  <View>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.sub, { color: colors.textMuted }]}>
                      {item.frequency.toUpperCase()} • Próximo: {item.next_date}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.amount,
                    { color: item.type === 'ingreso_fijo' ? '#10B981' : colors.accent },
                  ]}
                >
                  {item.type === 'ingreso_fijo' ? '+' : '-'}${item.amount}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  list: { gap: 10 },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 11, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '900' },
});
