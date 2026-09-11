import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  LayoutDashboard,
  Landmark,
  Receipt,
  CalendarClock,
  Sliders,
  LogOut,
  ChevronRight,
  Languages,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../hooks/useTheme';
import { useUIStore } from '../../store/useUIStore';
import { useTranslation } from '../../store/useLanguageStore';
import { AyeFinanceLogo } from '../ui/AyeFinanceLogo';

interface SidebarDrawerProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ currentScreen, onNavigate }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const drawerWidth = isMobile ? Math.min(width * 0.84, 320) : 340;

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomInset = Math.max(insets.bottom, 12);

  const { language, toggleLanguage, t } = useTranslation();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const closeSidebar = useUIStore((state) => state.closeSidebar);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const { colors, toggleTheme, isDark } = useTheme();

  // Fast, hardware-accelerated drawer animation state
  const [isRendered, setIsRendered] = useState(isSidebarOpen);
  const [isOpenAnimated, setIsOpenAnimated] = useState(isSidebarOpen);
  const closeTimerRef = useRef<any>(null);
  const anim = useRef(new Animated.Value(isSidebarOpen ? 1 : 0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (isSidebarOpen) {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        setIsRendered(true);
        // Double requestAnimationFrame guarantees the DOM node is rendered at starting position
        // before triggering the CSS GPU transition
        const raf = requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsOpenAnimated(true);
          });
        });
        return () => cancelAnimationFrame(raf);
      } else {
        setIsOpenAnimated(false);
        // Clean unmount after transition completes
        closeTimerRef.current = setTimeout(() => {
          setIsRendered(false);
        }, 180);
        return () => {
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
          }
        };
      }
    } else {
      // Native animation: 120Hz locked on Android RenderThread (Galaxy S22 / One UI)
      if (isSidebarOpen) {
        setIsRendered(true);
        Animated.timing(anim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(anim, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            setIsRendered(false);
          }
        });
      }
    }
  }, [isSidebarOpen, anim]);

  // Escape key listener for web
  useEffect(() => {
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

  if (!isRendered) return null;

  const handleSelectScreen = (screen: string) => {
    closeSidebar();
    if (screen !== currentScreen) {
      // Defer screen switch until the drawer has mostly cleared the screen (~110ms).
      // This ensures 100% silky 120fps GPU animation and completely eliminates
      // ghost text / sudden content flashes in the middle of the screen.
      setTimeout(() => {
        onNavigate(screen);
      }, 110);
    }
  };

  const handleLogout = async () => {
    closeSidebar();
    await logout();
  };

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: t.nav?.dashboard || 'RESUMEN GENERAL',
      sub: t.nav?.dashboardSub || 'Panel de control y flujo',
      icon: LayoutDashboard,
    },
    {
      id: 'accounts',
      label: t.nav?.accounts || 'MIS CUENTAS',
      sub: t.nav?.accountsSub || 'Bancos, efectivo e inversiones',
      icon: Landmark,
    },
    {
      id: 'transactions',
      label: t.nav?.transactions || 'LIBRO DE MOVIMIENTOS',
      sub: t.nav?.transactionsSub || 'Ingresos, gastos y transferencias',
      icon: Receipt,
    },
    {
      id: 'recurring',
      label: t.nav?.recurring || 'PAGOS RECURRENTES',
      sub: t.nav?.recurringSub || 'Suscripciones y servicios fijos',
      icon: CalendarClock,
    },
    {
      id: 'settings',
      label: t.nav?.settings || 'CONFIGURACIÓN',
      sub: t.nav?.settingsSub || 'Ajustes del sistema y perfil',
      icon: Sliders,
    },
  ];

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth - 30, 0],
  });

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const isWeb = Platform.OS === 'web';

  const webDrawerTransform = isOpenAnimated
    ? 'translate3d(0, 0, 0)'
    : `translate3d(-${drawerWidth + 30}px, 0, 0)`;

  const webBackdropOpacity = isOpenAnimated ? 1 : 0;

  return (
    <View
      style={[
        styles.overlayRoot,
        isWeb && {
          position: 'fixed' as any,
          height: '100vh' as any,
          width: '100vw' as any,
        },
      ]}
      pointerEvents={isSidebarOpen ? 'auto' : 'none'}
    >
      {/* Smooth Backdrop Overlay */}
      {isWeb ? (
        <View
          style={[
            styles.backdrop,
            {
              opacity: webBackdropOpacity,
              transition: isOpenAnimated
                ? 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'opacity 170ms cubic-bezier(0.4, 0, 0.2, 1)',
            } as any,
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeSidebar}
            accessibilityLabel={language === 'en' ? 'Close sidebar' : 'Cerrar barra lateral'}
          />
        </View>
      ) : (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeSidebar}
            accessibilityLabel={language === 'en' ? 'Close sidebar' : 'Cerrar barra lateral'}
          />
        </Animated.View>
      )}

      {/* Slide-in Drawer Surface */}
      {isWeb ? (
        <View
          style={[
            styles.drawerSurface,
            {
              backgroundColor: colors.bgBase,
              borderColor: colors.borderColor,
              shadowColor: colors.shadowColor,
              width: drawerWidth,
              boxShadow: `12px 12px 0px 0px ${colors.shadowColor}`,
              transform: webDrawerTransform,
              transition: isOpenAnimated
                ? 'transform 210ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'transform 170ms cubic-bezier(0.4, 0, 0.2, 1)',
            } as any,
          ]}
        >
          <View style={[styles.safeDrawerInner, { paddingTop: topInset, paddingBottom: bottomInset }]}>
            {/* Top Neon Accent Stripe */}
            <View style={[styles.drawerTopStripe, { backgroundColor: colors.accent }]} />

            {/* Header: Brand Anchor & Close Button */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.borderMuted }]}>
              <View style={styles.brandRow}>
                <AyeFinanceLogo size={36} />

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
                    boxShadow: `3px 3px 0px 0px ${colors.shadowColor}`,
                  },
                ]}
                onPress={closeSidebar}
                activeOpacity={0.7}
                accessibilityLabel={language === 'en' ? 'Close sidebar' : 'Cerrar barra lateral'}
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
                [ {t.nav?.mainNavigation || 'NAVEGACIÓN PRINCIPAL'} ]
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
                        boxShadow: `3px 3px 0px 0px ${colors.shadowColor}`,
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
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.navItemTitle,
                            {
                              color: isActive ? colors.accent : colors.textPrimary,
                              fontWeight: isActive ? '900' : '800',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[styles.navItemSub, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
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
                [ {t.nav?.systemPreferences || 'PREFERENCIAS DE SISTEMA'} ]
              </Text>

              {/* Theme Toggle */}
              <TouchableOpacity
                style={[
                  styles.utilityRow,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    boxShadow: `3px 3px 0px 0px ${colors.shadowColor}`,
                  },
                ]}
                onPress={toggleTheme}
                activeOpacity={0.7}
                accessibilityLabel={isDark ? 'Switch to light mode' : 'Cambiar a modo oscuro'}
              >
                <View style={styles.utilityLeft}>
                  {isDark ? (
                    <Sun size={16} color={colors.accentWarning} strokeWidth={2.5} />
                  ) : (
                    <Moon size={16} color={colors.textPrimary} strokeWidth={2.5} />
                  )}
                  <Text style={[styles.utilityLabel, { color: colors.textPrimary }]}>
                    {isDark ? (t.nav?.lightMode || 'MODO CLARO') : (t.nav?.darkMode || 'MODO OSCURO')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.utilityTag,
                    {
                      borderColor: colors.borderColor,
                      backgroundColor: colors.bgBase,
                    },
                  ]}
                >
                  <Text style={[styles.utilityValue, { color: colors.accent }]}>
                    {isDark ? 'DARK' : 'LIGHT'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Language Toggle with Instant Reactive Switcher */}
              <TouchableOpacity
                style={[
                  styles.utilityRow,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                    boxShadow: `3px 3px 0px 0px ${colors.shadowColor}`,
                  },
                ]}
                onPress={toggleLanguage}
                activeOpacity={0.7}
                accessibilityLabel="Cambiar idioma / Change language"
              >
                <View style={styles.utilityLeft}>
                  <Languages size={16} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.utilityLabel, { color: colors.textPrimary }]}>
                    {t.nav?.language || 'IDIOMA'}
                  </Text>
                </View>
                <View style={styles.langBadgeRow}>
                  <View
                    style={[
                      styles.langPill,
                      language === 'es'
                        ? { backgroundColor: colors.accent, borderColor: colors.borderColor }
                        : { backgroundColor: 'transparent', borderColor: 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langPillText,
                        { color: language === 'es' ? '#000000' : colors.textMuted },
                      ]}
                    >
                      ES
                    </Text>
                  </View>
                  <Text style={{ color: colors.borderMuted, fontSize: 10 }}>|</Text>
                  <View
                    style={[
                      styles.langPill,
                      language === 'en'
                        ? { backgroundColor: colors.accent, borderColor: colors.borderColor }
                        : { backgroundColor: 'transparent', borderColor: 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langPillText,
                        { color: language === 'en' ? '#000000' : colors.textMuted },
                      ]}
                    >
                      EN
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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

                <View style={{ flex: 1, marginRight: 8 }}>
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
                  accessibilityLabel={t.nav?.logout || 'Cerrar sesión'}
                >
                  <LogOut size={15} color={colors.accentDanger} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <Animated.View
          renderToHardwareTextureAndroid={true}
          style={[
            styles.drawerSurface,
            {
              backgroundColor: colors.bgBase,
              borderColor: colors.borderColor,
              shadowColor: colors.shadowColor,
              width: drawerWidth,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={[styles.safeDrawerInner, { paddingTop: topInset, paddingBottom: bottomInset }]}>
            {/* Top Neon Accent Stripe */}
            <View style={[styles.drawerTopStripe, { backgroundColor: colors.accent }]} />

            {/* Header: Brand Anchor & Close Button */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.borderMuted }]}>
              <View style={styles.brandRow}>
                <AyeFinanceLogo size={36} />

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
                  },
                ]}
                onPress={closeSidebar}
                activeOpacity={0.7}
                accessibilityLabel={language === 'en' ? 'Close sidebar' : 'Cerrar barra lateral'}
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
                [ {t.nav?.mainNavigation || 'NAVEGACIÓN PRINCIPAL'} ]
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
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.navItemTitle,
                            {
                              color: isActive ? colors.accent : colors.textPrimary,
                              fontWeight: isActive ? '900' : '800',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[styles.navItemSub, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
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
                [ {t.nav?.systemPreferences || 'PREFERENCIAS DE SISTEMA'} ]
              </Text>

              {/* Theme Toggle */}
              <TouchableOpacity
                style={[
                  styles.utilityRow,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                  },
                ]}
                onPress={toggleTheme}
                activeOpacity={0.7}
                accessibilityLabel={isDark ? 'Switch to light mode' : 'Cambiar a modo oscuro'}
              >
                <View style={styles.utilityLeft}>
                  {isDark ? (
                    <Sun size={16} color={colors.accentWarning} strokeWidth={2.5} />
                  ) : (
                    <Moon size={16} color={colors.textPrimary} strokeWidth={2.5} />
                  )}
                  <Text style={[styles.utilityLabel, { color: colors.textPrimary }]}>
                    {isDark ? (t.nav?.lightMode || 'MODO CLARO') : (t.nav?.darkMode || 'MODO OSCURO')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.utilityTag,
                    {
                      borderColor: colors.borderColor,
                      backgroundColor: colors.bgBase,
                    },
                  ]}
                >
                  <Text style={[styles.utilityValue, { color: colors.accent }]}>
                    {isDark ? 'DARK' : 'LIGHT'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Language Toggle with Instant Reactive Switcher */}
              <TouchableOpacity
                style={[
                  styles.utilityRow,
                  {
                    borderColor: colors.borderColor,
                    backgroundColor: colors.bgSurface,
                    shadowColor: colors.shadowColor,
                  },
                ]}
                onPress={toggleLanguage}
                activeOpacity={0.7}
                accessibilityLabel="Cambiar idioma / Change language"
              >
                <View style={styles.utilityLeft}>
                  <Languages size={16} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.utilityLabel, { color: colors.textPrimary }]}>
                    {t.nav?.language || 'IDIOMA'}
                  </Text>
                </View>
                <View style={styles.langBadgeRow}>
                  <View
                    style={[
                      styles.langPill,
                      language === 'es'
                        ? { backgroundColor: colors.accent, borderColor: colors.borderColor }
                        : { backgroundColor: 'transparent', borderColor: 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langPillText,
                        { color: language === 'es' ? '#000000' : colors.textMuted },
                      ]}
                    >
                      ES
                    </Text>
                  </View>
                  <Text style={{ color: colors.borderMuted, fontSize: 10 }}>|</Text>
                  <View
                    style={[
                      styles.langPill,
                      language === 'en'
                        ? { backgroundColor: colors.accent, borderColor: colors.borderColor }
                        : { backgroundColor: 'transparent', borderColor: 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langPillText,
                        { color: language === 'en' ? '#000000' : colors.textMuted },
                      ]}
                    >
                      EN
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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

                <View style={{ flex: 1, marginRight: 8 }}>
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
                  accessibilityLabel={t.nav?.logout || 'Cerrar sesión'}
                >
                  <LogOut size={15} color={colors.accentDanger} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    ...(Platform.OS === 'web' ? { willChange: 'opacity' } : {}),
  },
  drawerSurface: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    height: '100%',
    borderRightWidth: 2,
    zIndex: 100,
    overflow: 'hidden',
    shadowOffset: { width: 12, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 0,
    ...(Platform.OS === 'web'
      ? {
          willChange: 'transform',
          contain: 'paint' as any,
        }
      : {}),
  },
  safeDrawerInner: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
    flex: 1,
    marginRight: 6,
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
  utilityTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  utilityValue: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  langBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
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
