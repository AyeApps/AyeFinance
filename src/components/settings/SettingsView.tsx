import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
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
import {
  ArrowLeft,
  Shield,
  Sun,
  Moon,
  Laptop,
  Smartphone,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Database,
  Cpu,
  Edit3,
  Save,
  Lock,
  Mail,
  User as UserIcon,
  X,
  AlertCircle,
  Languages,
  Globe,
  Trash2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../store/useLanguageStore';
import { api } from '../../services/api';

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { language, toggleLanguage, setLanguage } = useTranslation();
  const { themePreference, themeMode, colors, toggleTheme, setThemePreference, isDark } = useTheme();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  // Edit profile state
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Delete account state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteErrorMsg(null);
    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setDeleteErrorMsg(err.message || 'Error al eliminar la cuenta');
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    if (user) {
      setNameInput(user.name || '');
      setEmailInput(user.email || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!nameInput.trim() || !emailInput.trim()) {
      setProfileErrorMsg('El nombre y el correo no pueden estar vacíos.');
      return;
    }
    if (showPasswordChange && newPassword) {
      if (!currentPassword) {
        setProfileErrorMsg('Debes ingresar tu contraseña actual para cambiarla.');
        return;
      }
      if (newPassword.length < 8) {
        setProfileErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.');
        return;
      }
    }

    setIsSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      await updateProfile({
        name: nameInput.trim(),
        email: emailInput.trim(),
        current_password: showPasswordChange && currentPassword ? currentPassword : undefined,
        new_password: showPasswordChange && newPassword ? newPassword : undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordChange(false);
      setProfileSuccessMsg('¡Datos de la cuenta actualizados correctamente!');
      setTimeout(() => {
        setProfileSuccessMsg(null);
        setIsEditingAccount(false);
      }, 1500);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error al guardar los cambios de la cuenta.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setNameInput(user.name || '');
      setEmailInput(user.email || '');
    }
    setCurrentPassword('');
    setNewPassword('');
    setShowPasswordChange(false);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);
    setIsEditingAccount(false);
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomInset = insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Settings Header Bar with Back Button */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.bgBase,
            borderBottomColor: colors.borderColor,
            borderBottomWidth: 2,
            paddingTop: topInset,
            height: (isMobile ? 60 : 70) + topInset,
          },
          isMobile && styles.headerBarMobile,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              borderColor: colors.borderColor,
              backgroundColor: colors.bgSurface,
              shadowColor: colors.shadowColor,
              ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
            },
          ]}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Volver al panel"
        >
          <ArrowLeft size={16} color={colors.textPrimary} strokeWidth={2.5} />
          <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>
            VOLVER AL PANEL
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={[styles.headerTitleText, { color: colors.textPrimary }]}>
            CONFIGURACIÓN // SISTEMA
          </Text>
          <Text style={[styles.headerSubText, { color: colors.accent }]}>
            AYEFINANCE CYBER-ENGINE V1.0
          </Text>
        </View>
      </View>

      {/* Settings Scrollable Body */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile && styles.scrollContentMobile,
          { paddingBottom: bottomInset + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.centerWrapper, { maxWidth: isMobile ? '100%' : 780 }]}>
          {/* ── CARD 1: ACCOUNT & OPERATOR PROFILE ── */}
          <View
            style={[
              styles.card,
              {
                borderColor: colors.borderColor,
                backgroundColor: colors.bgSurface,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={styles.cardHeaderWithAction}>
              <View style={styles.cardHeader}>
                <Shield size={16} color={colors.accent} strokeWidth={2.5} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  PERFIL DE OPERADOR & IDENTIDAD
                </Text>
              </View>

              {!isEditingAccount ? (
                <TouchableOpacity
                  style={[
                    styles.editAccountBtn,
                    {
                      borderColor: colors.borderColor,
                      backgroundColor: colors.bgBase,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === 'web' ? { boxShadow: `2px 2px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                  onPress={() => setIsEditingAccount(true)}
                  activeOpacity={0.7}
                >
                  <Edit3 size={13} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.editAccountBtnText, { color: colors.textPrimary }]}>
                    EDITAR PERFIL
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.editAccountBtn,
                    {
                      borderColor: colors.borderColor,
                      backgroundColor: colors.bgBase,
                    },
                  ]}
                  onPress={handleCancelEdit}
                  activeOpacity={0.7}
                >
                  <X size={13} color={colors.textSecondary} strokeWidth={2.5} />
                  <Text style={[styles.editAccountBtnText, { color: colors.textSecondary }]}>
                    CANCELAR
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Profile Alerts */}
            {profileSuccessMsg && (
              <View style={[styles.alertBanner, { backgroundColor: colors.accentSuccessSubtle, borderColor: colors.accentSuccess }]}>
                <CheckCircle2 size={15} color={colors.accentSuccess} />
                <Text style={[styles.alertText, { color: colors.accentSuccess }]}>{profileSuccessMsg}</Text>
              </View>
            )}

            {profileErrorMsg && (
              <View style={[styles.alertBanner, { backgroundColor: colors.accentDangerSubtle, borderColor: colors.accentDanger }]}>
                <AlertCircle size={15} color={colors.accentDanger} />
                <Text style={[styles.alertText, { color: colors.accentDanger }]}>{profileErrorMsg}</Text>
              </View>
            )}

            {!isEditingAccount && user ? (
              <View style={styles.profileRow}>
                <View
                  style={[
                    styles.avatarBadge,
                    {
                      backgroundColor: colors.accent,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.textInvert }]}>
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.profileDetails}>
                  <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                    {user.name ? user.name.toUpperCase() : 'OPERADOR AYE'}
                  </Text>
                  <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                    {user.email}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.pillBadge, { borderColor: colors.accentSuccess, backgroundColor: colors.accentSuccessSubtle }]}>
                      <Text style={[styles.pillBadgeText, { color: colors.accentSuccess }]}>CUENTA AYE: ACTIVA</Text>
                    </View>
                    <View style={[styles.pillBadge, { borderColor: colors.accent, backgroundColor: colors.accentSubtle }]}>
                      <Text style={[styles.pillBadgeText, { color: colors.accent }]}>ACCESO: FINANCE</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Edit Mode Form */}
            {isEditingAccount ? (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NOMBRE DE OPERADOR / ALIAS:</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                    <UserIcon size={15} color={colors.textMuted} />
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                      value={nameInput}
                      onChangeText={setNameInput}
                      placeholder="Tu nombre"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CORREO ELECTRÓNICO DE LA CUENTA:</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.borderColor, backgroundColor: colors.bgBase }]}>
                    <Mail size={15} color={colors.textMuted} />
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                      value={emailInput}
                      onChangeText={setEmailInput}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {/* Optional Change Password Accordion */}
                <TouchableOpacity
                  style={styles.togglePasswordBtn}
                  onPress={() => setShowPasswordChange(!showPasswordChange)}
                  activeOpacity={0.7}
                >
                  <Lock size={13} color={colors.accentWarning} />
                  <Text style={[styles.togglePasswordText, { color: colors.accentWarning }]}>
                    {showPasswordChange ? '− OCULTAR CAMBIO DE CONTRASEÑA' : '+ CAMBIAR CONTRASEÑA DE ACCESO (OPCIONAL)'}
                  </Text>
                </TouchableOpacity>

                {showPasswordChange ? (
                  <View style={[styles.passwordBox, { borderColor: colors.borderMuted, backgroundColor: colors.bgBase }]}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CONTRASEÑA ACTUAL:</Text>
                      <View style={[styles.inputWrapper, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}>
                        <Lock size={15} color={colors.textMuted} />
                        <TextInput
                          style={[styles.textInput, { color: colors.textPrimary }]}
                          value={currentPassword}
                          onChangeText={setCurrentPassword}
                          placeholder="Requerida para establecer nueva clave"
                          placeholderTextColor={colors.textMuted}
                          secureTextEntry
                        />
                      </View>
                    </View>

                    <View style={[styles.inputGroup, { marginTop: 10 }]}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NUEVA CONTRASEÑA (MÍN. 8 CARACTERES):</Text>
                      <View style={[styles.inputWrapper, { borderColor: colors.borderColor, backgroundColor: colors.bgSurface }]}>
                        <Lock size={15} color={colors.textMuted} />
                        <TextInput
                          style={[styles.textInput, { color: colors.textPrimary }]}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder="••••••••"
                          placeholderTextColor={colors.textMuted}
                          secureTextEntry
                        />
                      </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.editFormActions}>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      {
                        backgroundColor: colors.accent,
                        borderColor: colors.borderColor,
                        shadowColor: colors.shadowColor,
                        ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                      },
                    ]}
                    onPress={handleSaveProfile}
                    disabled={isSavingProfile}
                    activeOpacity={0.8}
                  >
                    {isSavingProfile ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <Save size={14} color="#000000" strokeWidth={2.5} />
                        <Text style={styles.saveBtnText}>GUARDAR CAMBIOS</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      {
                        borderColor: colors.borderColor,
                        backgroundColor: colors.bgBase,
                      },
                    ]}
                    onPress={handleCancelEdit}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>CANCELAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          {/* ── CARD 2: APPEARANCE & THEME PREFERENCES ── */}
          <View
            style={[
              styles.card,
              {
                borderColor: colors.borderColor,
                backgroundColor: colors.bgSurface,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Sun size={16} color={colors.accent} strokeWidth={2.5} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                APARIENCIA & TEMA VISUAL
              </Text>
            </View>

            <View style={[styles.themeOptionsGrid, isMobile && styles.themeOptionsGridMobile]}>
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    borderColor: themePreference === 'dark' ? colors.accent : colors.borderColor,
                    backgroundColor: themePreference === 'dark' ? colors.accentSubtle : colors.bgBase,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={() => setThemePreference('dark')}
                activeOpacity={0.8}
              >
                <Moon size={20} color={themePreference === 'dark' ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.themeOptionTitle, { color: themePreference === 'dark' ? colors.accent : colors.textPrimary }]}>
                  OSCURO
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  Fondo Obsidian #000
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    borderColor: themePreference === 'light' ? colors.accent : colors.borderColor,
                    backgroundColor: themePreference === 'light' ? colors.accentSubtle : colors.bgBase,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={() => setThemePreference('light')}
                activeOpacity={0.8}
              >
                <Sun size={20} color={themePreference === 'light' ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.themeOptionTitle, { color: themePreference === 'light' ? colors.accent : colors.textPrimary }]}>
                  CLARO
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  Fondo Atelier #FFF
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    borderColor: themePreference === 'system' ? colors.accent : colors.borderColor,
                    backgroundColor: themePreference === 'system' ? colors.accentSubtle : colors.bgBase,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={() => setThemePreference('system')}
                activeOpacity={0.8}
              >
                <Laptop size={20} color={themePreference === 'system' ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.themeOptionTitle, { color: themePreference === 'system' ? colors.accent : colors.textPrimary }]}>
                  SISTEMA
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  Auto Sync con SO
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── CARD 3: LANGUAGE & LOCALIZATION ── */}
          <View
            style={[
              styles.card,
              {
                borderColor: colors.borderColor,
                backgroundColor: colors.bgSurface,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Languages size={16} color={colors.accent} strokeWidth={2.5} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                IDIOMA & LOCALIZACIÓN
              </Text>
            </View>

            <View style={styles.themeOptionsGrid}>
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    borderColor: language === 'es' ? colors.accent : colors.borderColor,
                    backgroundColor: language === 'es' ? colors.accentSubtle : colors.bgBase,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={() => setLanguage('es')}
                activeOpacity={0.8}
              >
                <Globe size={20} color={language === 'es' ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.themeOptionTitle, { color: language === 'es' ? colors.accent : colors.textPrimary }]}>
                  ESPAÑOL (ES)
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  Idioma Predeterminado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    borderColor: language === 'en' ? colors.accent : colors.borderColor,
                    backgroundColor: language === 'en' ? colors.accentSubtle : colors.bgBase,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={() => setLanguage('en')}
                activeOpacity={0.8}
              >
                <Globe size={20} color={language === 'en' ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.themeOptionTitle, { color: language === 'en' ? colors.accent : colors.textPrimary }]}>
                  ENGLISH (US)
                </Text>
                <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>
                  English Localization
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── CARD 4: ARCHITECTURE & TELEMETRY ── */}
          <View
            style={[
              styles.card,
              {
                borderColor: colors.borderColor,
                backgroundColor: colors.bgSurface,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Cpu size={16} color={colors.accentSuccess} strokeWidth={2.5} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                TELEMETRÍA & ARQUITECTURA DEL SISTEMA
              </Text>
            </View>

            <View style={styles.telemetryList}>
              <View style={[styles.telemetryRow, { borderBottomColor: colors.borderMuted }]}>
                <Text style={[styles.telemetryKey, { color: colors.textSecondary }]}>ESTADO DE RED:</Text>
                <View style={styles.telemetryValueRow}>
                  <View style={[styles.pulseDot, { backgroundColor: colors.accentSuccess }]} />
                  <Text style={[styles.telemetryValText, { color: colors.accentSuccess }]}>ONLINE // SINCRONIZADO</Text>
                </View>
              </View>

              <View style={[styles.telemetryRow, { borderBottomColor: colors.borderMuted }]}>
                <Text style={[styles.telemetryKey, { color: colors.textSecondary }]}>SERVICIO IDENTIDAD:</Text>
                <Text style={[styles.telemetryValText, { color: colors.textPrimary }]}>aye-auth (FastAPI :8000)</Text>
              </View>

              <View style={[styles.telemetryRow, { borderBottomColor: colors.borderMuted }]}>
                <Text style={[styles.telemetryKey, { color: colors.textSecondary }]}>MOTOR BACKEND:</Text>
                <Text style={[styles.telemetryValText, { color: colors.textPrimary }]}>AyeFinance API (FastAPI :8003)</Text>
              </View>

              <View style={styles.telemetryRow}>
                <Text style={[styles.telemetryKey, { color: colors.textSecondary }]}>FRAMEWORK CLIENTE:</Text>
                <Text style={[styles.telemetryValText, { color: colors.accent }]}>React Native + Expo SDK 57 Unified</Text>
              </View>
            </View>
          </View>

          {/* ── CARD 5: DANGER ZONE // ELIMINAR CUENTA & SESIÓN ── */}
          <View
            style={[
              styles.card,
              {
                borderColor: colors.accentDanger,
                backgroundColor: colors.bgSurface,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `4px 4px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <AlertTriangle size={16} color={colors.accentDanger} strokeWidth={2.5} />
              <Text style={[styles.cardTitle, { color: colors.accentDanger }]}>
                ZONA DE SEGURIDAD & CUENTA
              </Text>
            </View>

            <Text style={[styles.dangerDesc, { color: colors.textMuted }]}>
              Puedes cerrar sesión o eliminar definitivamente tu cuenta y todos tus registros financieros del servidor central. Esta acción no se puede deshacer.
            </Text>

            <View style={styles.dangerActionsCol}>
              <TouchableOpacity
                style={[
                  styles.deleteAccountBtn,
                  {
                    borderColor: colors.accentDanger,
                    backgroundColor: colors.accentDangerSubtle,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={() => setIsDeleteModalOpen(true)}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color={colors.accentDanger} strokeWidth={2.5} />
                <Text style={[styles.deleteAccountBtnText, { color: colors.accentDanger }]}>
                  ELIMINAR MI CUENTA DEFINITIVAMENTE
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.logoutHeroBtn,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgBase,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={logout}
                activeOpacity={0.8}
              >
                <LogOut size={16} color={colors.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.logoutHeroBtnText, { color: colors.textPrimary }]}>
                  CERRAR SESIÓN DE LA CUENTA
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Account Deletion Confirmation Modal (Apple / Google Guideline Mandatory) */}
      <Modal
        visible={isDeleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeletingAccount && setIsDeleteModalOpen(false)}
      >
        <View style={styles.deleteModalBackdrop}>
          <View
            style={[
              styles.deleteModalContent,
              {
                backgroundColor: colors.bgBase,
                borderColor: colors.accentDanger,
                shadowColor: colors.accentDanger,
                ...(Platform.OS === 'web' ? { boxShadow: `12px 12px 0px 0px ${colors.accentDanger}` } : {}),
              },
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <View style={[styles.deleteModalIconBox, { backgroundColor: colors.accentDangerSubtle }]}>
                <AlertTriangle size={24} color={colors.accentDanger} strokeWidth={2.5} />
              </View>
              <Text style={[styles.deleteModalTitle, { color: colors.textPrimary }]}>
                ¿ELIMINAR TU CUENTA AYE?
              </Text>
            </View>

            <Text style={[styles.deleteModalWarningText, { color: colors.textSecondary }]}>
              Esta acción eliminará de forma permanente e irrecuperable tu cuenta, tus accesos a la suite de aplicaciones y todos tus registros de cuentas y movimientos financieros en la base de datos central.
            </Text>

            {deleteErrorMsg ? (
              <View style={[styles.alertBanner, { backgroundColor: colors.accentDangerSubtle, borderColor: colors.accentDanger, marginTop: 12 }]}>
                <AlertCircle size={15} color={colors.accentDanger} />
                <Text style={[styles.alertText, { color: colors.accentDanger }]}>
                  {deleteErrorMsg}
                </Text>
              </View>
            ) : null}

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[
                  styles.deleteModalCancelBtn,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                  },
                ]}
                onPress={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingAccount}
                activeOpacity={0.7}
              >
                <Text style={[styles.deleteModalCancelText, { color: colors.textPrimary }]}>
                  CANCELAR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteModalConfirmBtn,
                  {
                    borderColor: colors.accentDanger,
                    backgroundColor: colors.accentDanger,
                  },
                ]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
                activeOpacity={0.8}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Trash2 size={16} color="#ffffff" strokeWidth={2.5} />
                    <Text style={styles.deleteModalConfirmText}>
                      CONFIRMAR ELIMINACIÓN
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  headerBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  headerBarMobile: {
    paddingHorizontal: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  headerTitleGroup: {
    alignItems: 'flex-end',
  },
  headerTitleText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSubText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  scrollContentMobile: {
    padding: 16,
  },
  centerWrapper: {
    width: '100%',
    gap: 20,
  },
  card: {
    borderWidth: 2,
    padding: 20,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  editAccountBtn: {
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
  editAccountBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
  },
  profileDetails: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pillBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  editForm: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    paddingHorizontal: 12,
    gap: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  togglePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: 2,
  },
  togglePasswordText: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  passwordBox: {
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
    marginVertical: 4,
  },
  editFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    paddingVertical: 12,
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000000',
    letterSpacing: 0.8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  themeOptionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOptionsGridMobile: {
    flexDirection: 'column',
  },
  themeOptionCard: {
    flex: 1,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  themeOptionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  themeOptionSub: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  telemetryList: {
    gap: 10,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  telemetryKey: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  telemetryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  telemetryValText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dangerDesc: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
    marginBottom: 16,
  },
  dangerActionsCol: {
    gap: 12,
    marginTop: 4,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 14,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  deleteAccountBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  logoutHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 14,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  logoutHeroBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 2,
    padding: 24,
    shadowOffset: { width: 12, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  deleteModalIconBox: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: '#ff1744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  deleteModalWarningText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteModalCancelBtn: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCancelText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  deleteModalConfirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 14,
  },
  deleteModalConfirmText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
});
