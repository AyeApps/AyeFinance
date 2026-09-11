import React, { useEffect, useState, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  Sparkles,
  Trash2,
  Check,
  X,
  Play,
  AlertCircle,
} from "lucide-react-native";
import { useTheme } from "../../hooks/useTheme";
import { useFinanceStore } from "../../store/useFinanceStore";
import { Account, Frequency, RecurringItem, RecurringType } from "../../types";
import { BankAvatar } from "../ui/BankAvatar";
import { detectBankFromName } from "../../constants/mexicanBanks";

const PRESETS = [
  { name: "Netflix", amount: "219", type: "mensualidad" as RecurringType, freq: "mensual" as Frequency, day: 1 },
  { name: "Spotify", amount: "129", type: "mensualidad" as RecurringType, freq: "mensual" as Frequency, day: 5 },
  { name: "Amazon Prime", amount: "99", type: "mensualidad" as RecurringType, freq: "mensual" as Frequency, day: 10 },
  { name: "CFE (Luz)", amount: "600", type: "gasto_fijo" as RecurringType, freq: "mensual" as Frequency, day: 15 },
  { name: "Internet / Telefonía", amount: "500", type: "gasto_fijo" as RecurringType, freq: "mensual" as Frequency, day: 12 },
  { name: "Smart Fit / Gym", amount: "599", type: "mensualidad" as RecurringType, freq: "mensual" as Frequency, day: 1 },
  { name: "Sueldo Quincenal", amount: "15000", type: "ingreso_fijo" as RecurringType, freq: "quincenal" as Frequency, day: 15 },
];

export const RecurringScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors } = useTheme();
  const {
    recurringItems: items,
    accounts,
    isLoading: storeLoading,
    syncDelta,
    addRecurringOptimistic,
    deleteRecurringOptimistic,
    applyRecurringOptimistic,
  } = useFinanceStore();

  const [refreshing, setRefreshing] = useState(false);

  // Modal & Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyingItemId, setApplyingItemId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<RecurringType>("gasto_fijo");
  const [frequency, setFrequency] = useState<Frequency>("mensual");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const resetForm = () => {
    setName("");
    setAmount("");
    setType("gasto_fijo");
    setFrequency("mensual");
    setDayOfMonth("1");
    setError("");
    if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  };

  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    const whole = parts[0];
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formatted = parts.length > 1 ? `${formattedWhole}.${parts[1]}` : formattedWhole;
    setAmount(formatted);
  };

  const handleCreateRecurring = async () => {
    const validAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(validAmount) || validAmount <= 0) {
      setError("INGRESA UN MONTO VÁLIDO MAYOR A 0");
      return;
    }
    if (!name.trim()) {
      setError("INGRESA EL NOMBRE O CONCEPTO DEL RECURRENTE");
      return;
    }
    if (!selectedAccountId) {
      setError("SELECCIONA LA CUENTA VINCULADA");
      return;
    }

    const parsedDay = parseInt(dayOfMonth, 10);
    const validDay = !isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : 1;

    setError("");
    setIsSubmitting(true);
    try {
      await addRecurringOptimistic({
        name: name.trim(),
        type,
        amount: validAmount.toString(),
        frequency,
        day_of_month: validDay,
        account_id: selectedAccountId,
        is_active: true,
      });

      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message?.toUpperCase() || "ERROR AL CREAR RECURRENTE");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyRecurring = async (item: RecurringItem) => {
    setApplyingItemId(item.id);
    try {
      await applyRecurringOptimistic(item.id);
    } catch (err: any) {
      alert(err.message || "Error al aplicar el pago recurrente");
    } finally {
      setApplyingItemId(null);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await deleteRecurringOptimistic(id);
    } catch (err: any) {
      alert(err.message || "Error al eliminar recurrente");
    }
  };

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setName(p.name);
    setAmount(p.amount);
    setType(p.type);
    setFrequency(p.freq);
    setDayOfMonth(String(p.day));
  };

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
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
                ...(Platform.OS === "web" ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
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
              PAGOS FIJOS
            </Text>
            <Text style={[styles.headerSub, { color: colors.accent }]}>
              // SUSCRIPCIONES & SERVICIOS
            </Text>
          </View>

          {/* Action Button: Nuevo Recurrente */}
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setModalOpen(true);
            }}
            style={[
              styles.headerAddBtn,
              {
                backgroundColor: colors.accent,
                borderColor: colors.borderColor,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === "web" ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#000000" strokeWidth={3} />
            <Text style={styles.headerAddBtnText}>
              NUEVO RECURRENTE
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(bottomInset, 12) + 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await syncDelta(false);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.accent}
          />
        }
      >
        {storeLoading && items.length === 0 ? (
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
                ...(Platform.OS === "web" ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <CalendarClock size={40} color={colors.accent} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              SIN RECURRENTES CONFIGURADOS
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Configura tus sueldos quincenales, suscripciones y servicios para proyectar con precisión tu flujo financiero a 30 días.
            </Text>

            {/* Prominent CTA button inside empty card */}
            <TouchableOpacity
              onPress={() => {
                resetForm();
                setModalOpen(true);
              }}
              style={[
                styles.emptyActionBtn,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.borderColor,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === "web" ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#000000" strokeWidth={3} />
              <Text style={styles.emptyActionBtnText}>
                AGREGAR PRIMER PAGO O SUSCRIPCIÓN
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const isIngreso = item.type === "ingreso_fijo";
              const matchedAcc = accounts.find((a) => a.id === item.account_id);
              const isApplying = applyingItemId === item.id;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === "web" ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
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
                      <View style={styles.titleRow}>
                        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.name.toUpperCase()}
                        </Text>
                        {matchedAcc && (
                          <View style={[styles.accBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                            <Text style={[styles.accBadgeText, { color: colors.textSecondary }]} numberOfLines={1}>
                              {matchedAcc.account_type === "credito" ? "TDC" : "TDD"} // {matchedAcc.name.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.badgeRow}>
                        <View style={[styles.freqBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                          <Text style={[styles.freqBadgeText, { color: colors.textSecondary }]}>
                            {item.frequency.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.nextDate, { color: colors.textMuted }]}>
                          DÍA {item.day_of_month || 1} · {isIngreso ? 'PRÓXIMO DEPÓSITO' : 'PRÓXIMO COBRO'}: {item.next_date ? item.next_date.split("T")[0] : "POR DEFINIR"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text
                      style={[
                        styles.amount,
                        { color: isIngreso ? colors.accentSuccess : colors.textPrimary },
                      ]}
                    >
                      {isIngreso ? "+" : "-"}${parseFloat(String(item.amount || "0")).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </Text>

                    <View style={styles.actionsRow}>
                      {/* Execute / Apply Now Button */}
                      <TouchableOpacity
                        onPress={() => handleApplyRecurring(item)}
                        disabled={isApplying}
                        style={[
                          styles.applyBtn,
                          {
                            borderColor: colors.borderColor,
                            backgroundColor: colors.bgBase,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        {isApplying ? (
                          <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                          <>
                            <Play size={11} color={colors.accent} strokeWidth={2.5} />
                            {!isMobile && (
                              <Text style={[styles.applyBtnText, { color: colors.textPrimary }]}>
                                {isIngreso ? 'ABONAR' : 'APLICAR'}
                              </Text>
                            )}
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        onPress={() => handleDeleteRecurring(item.id)}
                        style={[
                          styles.deleteBtn,
                          {
                            borderColor: colors.accentDanger,
                            backgroundColor: colors.accentDangerSubtle,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={12} color={colors.accentDanger} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for easy quick addition */}
      {items.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setModalOpen(true);
          }}
          style={[
            styles.floatingFab,
            {
              backgroundColor: colors.accent,
              borderColor: colors.borderColor,
              shadowColor: colors.shadowColor,
              bottom: Math.max(bottomInset, 16) + 70,
              ...(Platform.OS === "web" ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
            },
          ]}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#000000" strokeWidth={3} />
          <Text style={styles.floatingFabText}>NUEVO RECURRENTE</Text>
        </TouchableOpacity>
      )}

      {/* MODAL CREAR RECURRENTE */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                width: isMobile ? "94%" : 500,
                maxWidth: 500,
                maxHeight: "90%",
                ...(Platform.OS === "web" ? { boxShadow: `8px 8px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  NUEVO PAGO RECURRENTE
                </Text>
                <Text style={[styles.modalSub, { color: colors.accent }]}>
                  // PROYECCIÓN DE FLUJO AUTOMATIZADA
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={[styles.closeBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}
                activeOpacity={0.7}
              >
                <X size={15} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {error ? (
                <View style={[styles.errorBanner, { borderColor: colors.accentDanger, backgroundColor: colors.accentDangerSubtle }]}>
                  <AlertCircle size={14} color={colors.accentDanger} strokeWidth={2.5} />
                  <Text style={[styles.errorText, { color: colors.accentDanger }]}>{error}</Text>
                </View>
              ) : null}

              {/* Presets Bar */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>PLANTILLAS RÁPIDAS (OPCIONAL)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p.name}
                      onPress={() => handleSelectPreset(p)}
                      style={[
                        styles.presetChip,
                        {
                          borderColor: name === p.name ? colors.accent : colors.borderColor,
                          backgroundColor: name === p.name ? "rgba(254, 157, 1, 0.15)" : colors.bgSurface,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={11} color={name === p.name ? colors.accent : colors.textMuted} />
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: name === p.name ? colors.accent : colors.textPrimary },
                        ]}
                      >
                        {p.name.toUpperCase()} (${p.amount})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Type Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO DE RECURRENTE *</Text>
                <View style={styles.typeRow}>
                  {[
                    { key: "gasto_fijo", label: "GASTO FIJO" },
                    { key: "mensualidad", label: "SUSCRIPCIÓN" },
                    { key: "ingreso_fijo", label: "INGRESO" },
                  ].map((t) => {
                    const isSelected = type === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => setType(t.key as RecurringType)}
                        style={[
                          styles.typeBtn,
                          {
                            borderColor: isSelected ? colors.accent : colors.borderColor,
                            backgroundColor: isSelected ? "rgba(254, 157, 1, 0.15)" : colors.bgSurface,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.typeBtnText,
                            { color: isSelected ? colors.accent : colors.textPrimary },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Name Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {type === 'ingreso_fijo' ? 'NOMBRE / CONCEPTO DEL INGRESO *' : 'NOMBRE / CONCEPTO *'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                  ]}
                  placeholder={
                    type === 'ingreso_fijo'
                      ? 'Ej. Nómina Quincenal, Pensión, Renta cobrada...'
                      : 'Ej. Netflix 4K, Smart Fit, Renta Departamento...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Amount and Frequency Row */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>MONTO ($ MXN) *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={handleAmountChange}
                  />
                </View>

                <View style={[styles.formGroup, { width: 110 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {type === 'ingreso_fijo' ? 'DÍA DEPÓSITO *' : 'DÍA COBRO *'}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderColor, color: colors.textPrimary, textAlign: "center" },
                    ]}
                    placeholder={type === 'ingreso_fijo' ? '15' : '1'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={dayOfMonth}
                    onChangeText={(t) => setDayOfMonth(t.replace(/[^0-9]/g, ""))}
                  />
                </View>
              </View>

              {/* Frequency Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {type === 'ingreso_fijo' ? 'FRECUENCIA DE DEPÓSITO *' : 'FRECUENCIA DE COBRO *'}
                </Text>
                <View style={styles.typeRow}>
                  {[
                    { key: "mensual", label: "MENSUAL" },
                    { key: "quincenal", label: "QUINCENAL" },
                    { key: "semanal", label: "SEMANAL" },
                  ].map((f) => {
                    const isSelected = frequency === f.key;
                    return (
                      <TouchableOpacity
                        key={f.key}
                        onPress={() => setFrequency(f.key as Frequency)}
                        style={[
                          styles.typeBtn,
                          {
                            borderColor: isSelected ? colors.accent : colors.borderColor,
                            backgroundColor: isSelected ? "rgba(254, 157, 1, 0.15)" : colors.bgSurface,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.typeBtnText,
                            { color: isSelected ? colors.accent : colors.textPrimary },
                          ]}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Account Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {type === 'ingreso_fijo' ? 'CUENTA DONDE SE RECIBE EL DEPÓSITO *' : 'CUENTA VINCULADA DE CARGO / PAGO *'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    const isCredit = acc.account_type === "credito";
                    const bankId = detectBankFromName(acc.bank_id || acc.name);

                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={[
                          styles.accountPill,
                          {
                            borderColor: isSelected ? colors.accent : colors.borderColor,
                            backgroundColor: isSelected ? "rgba(254, 157, 1, 0.15)" : colors.bgSurface,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <BankAvatar bankId={bankId} size={18} />
                        <View>
                          <Text
                            style={[
                              styles.accountPillName,
                              { color: isSelected ? colors.accent : colors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {acc.name.toUpperCase()}
                          </Text>
                          <Text style={[styles.accountPillType, { color: colors.textMuted }]}>
                            {isCredit ? "CRÉDITO" : "DÉBITO"}
                          </Text>
                        </View>
                        {isSelected && <Check size={13} color={colors.accent} strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalActions, { borderTopColor: colors.borderColor }]}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={[styles.cancelBtn, { borderColor: colors.borderColor }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateRecurring}
                disabled={isSubmitting}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: colors.accent,
                    borderColor: colors.borderColor,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === "web" ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Check size={15} color="#000000" strokeWidth={3} />
                    <Text style={styles.submitBtnText}>GUARDAR RECURRENTE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  header: {
    height: 64,
    borderBottomWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerMobile: {
    paddingHorizontal: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
  headerTitleCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 9.5,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  headerAddBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  emptyCard: {
    borderWidth: 2,
    padding: 32,
    alignItems: "center",
    gap: 14,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textAlign: "center",
    maxWidth: 420,
    lineHeight: 17,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  emptyActionBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    padding: 14,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  accBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  accBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  freqBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  freqBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  nextDate: {
    fontSize: 9.5,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  amount: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  applyBtnText: {
    fontSize: 9,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.6,
  },
  deleteBtn: {
    borderWidth: 1,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingFab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 99,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  floatingFabText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  modalContent: {
    borderWidth: 2,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 2,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  modalSub: {
    fontSize: 9,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
  closeBtn: {
    borderWidth: 1.5,
    padding: 6,
  },
  modalBody: {
    padding: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  presetScroll: {
    flexGrow: 0,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  presetChipText: {
    fontSize: 9.5,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBtnText: {
    fontSize: 9.5,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.6,
  },
  accountScroll: {
    flexGrow: 0,
  },
  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  accountPillName: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  accountPillType: {
    fontSize: 8.5,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    padding: 16,
    borderTopWidth: 2,
  },
  cancelBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.8,
  },
});
