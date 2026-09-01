import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  LayoutDashboard,
  Landmark,
  Receipt,
  CalendarClock,
  Sliders,
  LogOut,
  ChevronRight,
  Shield,
  Layers,
  Languages,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { useUIStore } from '../../store/useUIStore';
import { useTranslation } from '../../store/useLanguageStore';
import { AyeLogo } from '../ui/AyeLogo';

interface SidebarDrawerProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ currentScreen, onNavigate }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { language, toggleLanguage } = useTranslation();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const closeSidebar = useUIStore((state) => state.closeSidebar);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const { colors, toggleTheme, isDark } = useTheme();

  // Escape key listener for web
  React.useEffect(() => {
    if (Platform.OS === 'web' && isSidebarOpen && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeSidebar();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSidebarOpen, closeSidebar]);

  if (!isSidebarOpen) return null;

  const handleSelectScreen = (screen: string) => {
    onNavigate(screen);
    closeSidebar();
  };

  const handleLogout = async () => {
    closeSidebar();
    await logout();
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'RESUMEN GENERAL', sub: 'Panel de control y flujo', icon: LayoutDashboard },
    { id: 'accounts', label: 'MIS CUENTAS', sub: 'Bancos, efectivo e inversiones', icon: Landmark },
    { id: 'transactions', label: 'LIBRO DE MOVIMIENTOS', sub: 'Ingresos, gastos y transferencias', icon: Receipt },
    { id: 'recurring', label: 'PAGOS RECURRENTES', sub: 'Suscripciones y servicios fijos', icon: CalendarClock },
    { id: 'settings', label: 'CONFIGURACIÓN', sub: 'Ajustes del sistema y perfil', icon: Sliders },
  ];

  return (
    <Modal
      visible={isSidebarOpen}
      transparent
      animationType="fade"
      onRequestClose={closeSidebar}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop Overlay */}
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}
          activeOpacity={1}
          onPress={closeSidebar}
        />

        {/* Sidebar Drawer Surface */}
        <View
          style={[
            styles.drawerSurface,
            {
              backgroundColor: colors.bgBase,
              borderColor: colors.borderColor,
              shadowColor: colors.shadowColor,
              width: isMobile ? '84%' : 340,
              ...(Platform.OS === 'web' ? { boxShadow: `12px 12px 0px 0px ${colors.shadowColor}` } : {}),
            },
          ]}
        >
          <SafeAreaView style={styles.safeDrawerInner}>
            {/* Top Neon Accent Stripe */}
            <View style={[styles.drawerTopStripe, { backgroundColor: colors.accent }]} />

            {/* Header: Brand Anchor & Close Button */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.borderMuted }]}>
              <View style={styles.brandRow}>
                <View
                  style={[
                    styles.logoBadge,
                    {
                      backgroundColor: colors.accent,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                >
                  <AyeLogo width={30} color={colors.textInvert} />
                </View>

                <View style={styles.brandTextGroup}>
                  <Text style={[styles.brandTitleText, { color: colors.textPrimary }]}>
                    AyeFinance
                  </Text>
                  <View
                    style={[
                      styles.cyberTag,
                      {
                        borderColor: colors.accent,
                        backgroundColor: colors.accentSubtle,
                      },
                    ]}
                  >
                    <Text style={[styles.cyberTagText, { color: colors.accent }]}>
                      CYBER V1.0
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.closeBtn,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={closeSidebar}
                activeOpacity={0.7}
                accessibilityLabel="Cerrar barra lateral"
              >
                <X size={18} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Navigation Body */}
            <ScrollView
              style={styles.drawerBody}
              contentContainerStyle={styles.drawerBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.navSectionLabel, { color: colors.textMuted }]}>
                [ NAVEGACIÓN PRINCIPAL ]
              </Text>

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.navItemBtn,
                      {
                        borderColor: isActive ? colors.accent : colors.borderColor,
                        backgroundColor: isActive ? colors.accentSubtle : colors.bgSurface,
                        shadowColor: colors.shadowColor,
                        ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                      },
                    ]}
                    onPress={() => handleSelectScreen(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navItemLeft}>
                      <Icon
                        size={18}
                        color={isActive ? colors.accent : colors.textPrimary}
                        strokeWidth={2.5}
                      />
                      <View>
                        <Text
                          style={[
                            styles.navItemTitle,
                            {
                              color: isActive ? colors.accent : colors.textPrimary,
                              fontWeight: isActive ? '900' : '800',
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text style={[styles.navItemSub, { color: colors.textMuted }]}>
                          {item.sub}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={14} color={isActive ? colors.accent : colors.textMuted} />
                  </TouchableOpacity>
                );
              })}

              {/* Quick Settings Section */}
              <Text style={[styles.navSectionLabel, { color: colors.textMuted, marginTop: 24 }]}>
                [ PREFERENCIAS DE SISTEMA ]
              </Text>

              {/* Theme Toggle */}
              <TouchableOpacity
                style={[
                  styles.utilityRow,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={styles.utilityLeft}>
                  {isDark ? (
                    <Sun size={16} color={colors.accentWarning} strokeWidth={2.5} />
                  ) : (
                    <Moon size={16} color={colors.textPrimary} strokeWidth={2.5} />
                  )}
                  <Text style={[styles.utilityLabel, { color: colors.textPrimary }]}>
                    {isDark ? 'MODO CLARO' : 'MODO OSCURO'}
                  </Text>
                </View>
                <Text style={[styles.utilityValue, { color: colors.accent }]}>
                  {isDark ? 'DARK' : 'LIGHT'}
                </Text>
              </TouchableOpacity>

              {/* Language Toggle */}
              <TouchableOpacity
                style={[
                  styles.utilityRow,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                  },
                ]}
                onPress={toggleLanguage}
                activeOpacity={0.7}
              >
                <View style={styles.utilityLeft}>
                  <Languages size={16} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.utilityLabel, { color: colors.textPrimary }]}>
                    IDIOMA
                  </Text>
                </View>
                <Text style={[styles.utilityValue, { color: colors.accent }]}>
                  {language.toUpperCase()}
                </Text>
              </TouchableOpacity>

              {/* Engine Telemetry Card */}
              <View
                style={[
                  styles.telemetryCard,
                  {
                    borderColor: colors.borderMuted,
                    backgroundColor: colors.bgSurface,
                  },
                ]}
              >
                <View style={styles.telemetryHeader}>
                  <Shield size={13} color={colors.accentSuccess} />
                  <Text style={[styles.telemetryTitle, { color: colors.accentSuccess }]}>
                    SISTEMA SEGURO Y SINCRONIZADO
                  </Text>
                </View>
                <Text style={[styles.telemetryItem, { color: colors.textSecondary }]}>
                  • AUTH: <Text style={{ color: colors.textPrimary }}>aye-auth (PORT 8000)</Text>
                </Text>
                <Text style={[styles.telemetryItem, { color: colors.textSecondary }]}>
                  • BACKEND: <Text style={{ color: colors.textPrimary }}>FastAPI (PORT 8003)</Text>
                </Text>
                <Text style={[styles.telemetryItem, { color: colors.textSecondary }]}>
                  • CORE: <Text style={{ color: colors.textPrimary }}>Expo SDK 57 Unified</Text>
                </Text>
              </View>
            </ScrollView>

            {/* Bottom User Profile Section */}
            <View
              style={[
                styles.drawerFooter,
                {
                  borderTopColor: colors.borderMuted,
                  backgroundColor: colors.bgSurface,
                },
              ]}
            >
              <View style={styles.userProfileRow}>
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
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.userNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {(user?.name || 'USUARIO').toUpperCase()}
                  </Text>
                  <Text style={[styles.userEmailText, { color: colors.textMuted }]} numberOfLines={1}>
                    {user?.email || 'usuario@ayeapps.com'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.logoutBtn,
                    {
                      borderColor: colors.accentDanger,
                      backgroundColor: colors.accentDangerSubtle,
                    },
                  ]}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                  accessibilityLabel="Cerrar sesión"
                >
                  <LogOut size={15} color={colors.accentDanger} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerSurface: {
    height: '100%',
    borderRightWidth: 2,
    zIndex: 100,
    shadowOffset: { width: 12, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  safeDrawerInner: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerTopStripe: {
    height: 4,
    width: '100%',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1.5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  brandTextGroup: {
    gap: 2,
  },
  brandTitleText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cyberTag: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  cyberTagText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  drawerBody: {
    flex: 1,
  },
  drawerBodyContent: {
    padding: 20,
  },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    marginBottom: 12,
  },
  navItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    padding: 14,
    marginBottom: 12,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navItemTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  navItemSub: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    padding: 14,
    marginBottom: 12,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  utilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  utilityLabel: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  utilityValue: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  telemetryCard: {
    borderWidth: 1.5,
    padding: 14,
    marginTop: 12,
    gap: 6,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  telemetryTitle: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  telemetryItem: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  drawerFooter: {
    borderTopWidth: 2,
    padding: 16,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '900',
  },
  userNameText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  userEmailText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
