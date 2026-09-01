import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ArrowLeft, CalendarClock, Plus, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { RecurringItem } from '../../types';

export const RecurringScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
            PAGOS RECURRENTES
          </Text>
          <Text style={[styles.headerSub, { color: colors.accent }]}>
            // SERVICIOS, SUSCRIPCIONES & SUELDOS
          </Text>
        </View>

        <View style={{ width: isMobile ? 0 : 80 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isMobile ? 100 : 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRecurring();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              [ CARGANDO RECURRENTES... ]
            </Text>
          </View>
        ) : items.length === 0 ? (
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
            <CalendarClock size={36} color={colors.accent} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              SIN RECURRENTES CONFIGURADOS
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Configura tus sueldos quincenales, suscripciones y servicios para proyectar con precisión tu flujo a 30 días.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const isIngreso = item.type === 'ingreso_fijo';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                >
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.bgBase,
                          borderColor: isIngreso ? colors.accentSuccess : colors.accent,
                        },
                      ]}
                    >
                      <CalendarClock
                        size={16}
                        color={isIngreso ? colors.accentSuccess : colors.accent}
                        strokeWidth={2.5}
                      />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.name.toUpperCase()}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.freqBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                          <Text style={[styles.freqBadgeText, { color: colors.textSecondary }]}>
                            {item.frequency.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.nextDate, { color: colors.textMuted }]}>
                          PRÓXIMO COBRO: {item.next_date}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.amount,
                      { color: isIngreso ? colors.accentSuccess : colors.textPrimary },
                    ]}
                  >
                    {isIngreso ? '+' : '-'}${item.amount}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    padding: 14,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freqBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  freqBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  nextDate: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  amount: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
