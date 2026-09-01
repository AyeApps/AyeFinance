import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Menu,
  Sun,
  Moon,
  Languages,
  LogOut,
  ChevronDown,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useTranslation } from '../../store/useLanguageStore';
import { AyeLogo } from '../ui/AyeLogo';

interface FinanceHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNavigate?: (screen: string) => void;
}

export const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  onRefresh,
  isRefreshing,
  onNavigate,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { colors, toggleTheme, isDark } = useTheme();
  const { language, toggleLanguage } = useTranslation();
  const openSidebar = useUIStore((state) => state.openSidebar);
  const syncStatus = useUIStore((state) => state.syncStatus);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
  };

  const handleOpenSettings = () => {
    setShowProfileMenu(false);
    if (onNavigate) {
      onNavigate('settings');
    }
  };

  return (
    <View
      style={[
        styles.headerWrapper,
        {
          backgroundColor: colors.bgBase,
          borderBottomColor: colors.borderColor,
        },
      ]}
    >
      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
        {/* Left Side: Hamburger Menu + Brand Anchor + Engine Meta */}
        <View style={[styles.topLeftCluster, isMobile && styles.topLeftClusterMobile]}>
          {/* Menu / Sidebar Drawer Open Button */}
          <TouchableOpacity
            style={[
              styles.menuBtn,
              {
                borderColor: colors.borderColor,
                backgroundColor: colors.bgSurface,
                shadowColor: colors.shadowColor,
                ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
              },
            ]}
            onPress={openSidebar}
            activeOpacity={0.7}
            accessibilityLabel="Abrir menú"
          >
            <Menu size={18} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Brand Anchor */}
          <View style={styles.brandGroup}>
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
              <AyeLogo width={32} color={colors.textInvert} />
            </View>

            <View style={styles.brandMeta}>
              <View style={styles.brandTitleRow}>
                <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
                  AyeFinance
                </Text>
                {!isMobile ? (
                  <View
                    style={[
                      styles.engineTag,
                      {
                        borderColor: colors.borderColor,
                        backgroundColor: colors.bgSurface,
                      },
                    ]}
                  >
                    <Text style={[styles.engineTagText, { color: colors.textPrimary }]}>
                      CYBER V1.0
                    </Text>
                  </View>
                ) : null}
              </View>
              {!isMobile ? (
                <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                  CASH FLOW & ASSET ENGINE
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Right Side: Cloud Sync + Utility Controls + Profile Chip */}
        <View style={styles.topRightCluster}>
          {/* Cloud Sync Status Badge */}
          {!isMobile ? (
            <View
              style={[
                styles.syncBadge,
                {
                  borderColor: colors.accentSuccess,
                  backgroundColor: colors.accentSuccessSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.pulseDot,
                  styles.telemetryPulse,
                  { backgroundColor: colors.accentSuccess },
                ]}
              />
              <Text style={[styles.syncText, { color: colors.accentSuccess }]}>
                CLOUD SYNCED
              </Text>
            </View>
          ) : null}

          {/* Refresh Action */}
          {onRefresh && (
            <TouchableOpacity
              style={[
                styles.utilityBtn,
                {
                  borderColor: colors.borderColor,
                  backgroundColor: colors.bgSurface,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              onPress={onRefresh}
              activeOpacity={0.7}
              disabled={isRefreshing}
              accessibilityLabel="Refrescar datos"
            >
              <RefreshCw size={15} color={isRefreshing ? colors.accent : colors.textPrimary} />
            </TouchableOpacity>
          )}

          {/* Theme Switcher */}
          {!isMobile ? (
            <TouchableOpacity
              style={[
                styles.utilityBtn,
                {
                  borderColor: colors.borderColor,
                  backgroundColor: colors.bgSurface,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityLabel="Cambiar tema"
            >
              {isDark ? (
                <Sun size={16} color={colors.accentWarning} strokeWidth={2.5} />
              ) : (
                <Moon size={16} color={colors.textPrimary} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          ) : null}

          {/* Language Switcher */}
          {!isMobile ? (
            <TouchableOpacity
              style={[
                styles.utilityBtn,
                styles.langBtn,
                {
                  borderColor: colors.borderColor,
                  backgroundColor: colors.bgSurface,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              onPress={toggleLanguage}
              activeOpacity={0.7}
              accessibilityLabel="Cambiar idioma"
            >
              <Languages size={15} color={colors.accent} strokeWidth={2.5} />
              <Text style={[styles.langBtnText, { color: colors.textPrimary }]}>
                {language.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* User Account / Profile Chip & Popover */}
          <View style={styles.userWrapper}>
            <TouchableOpacity
              style={[
                styles.profileChip,
                {
                  borderColor: colors.borderColor,
                  backgroundColor: colors.bgSurface,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              onPress={() => setShowProfileMenu(!showProfileMenu)}
              activeOpacity={0.7}
              accessibilityLabel="Perfil de usuario"
            >
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
                  {userInitial}
                </Text>
              </View>

              {!isMobile ? (
                <Text
                  style={[styles.userName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {(user?.name || user?.email?.split('@')[0] || 'USUARIO').toUpperCase()}
                </Text>
              ) : null}
              <ChevronDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Profile Dropdown Popover */}
            {showProfileMenu ? (
              <>
                <TouchableOpacity
                  style={styles.popoverBackdrop}
                  activeOpacity={1}
                  onPress={() => setShowProfileMenu(false)}
                />
                <View
                  style={[
                    styles.profilePopover,
                    {
                      backgroundColor: colors.bgBase,
                      borderColor: colors.borderColor,
                      shadowColor: colors.shadowColor,
                      ...(Platform.OS === 'web' ? { boxShadow: `6px 6px 0px 0px ${colors.shadowColor}` } : {}),
                    },
                  ]}
                >
                  <View style={[styles.popoverHeader, { borderBottomColor: colors.borderMuted }]}>
                    <Text style={[styles.popoverUserName, { color: colors.textPrimary }]}>
                      {(user?.name || user?.email || 'USUARIO').toUpperCase()}
                    </Text>
                    <Text style={[styles.popoverUserEmail, { color: colors.textSecondary }]}>
                      {user?.email || 'usuario@ayeapps.com'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.settingsButton,
                      {
                        borderColor: colors.borderColor,
                        backgroundColor: colors.bgSurface,
                      },
                    ]}
                    onPress={handleOpenSettings}
                    activeOpacity={0.7}
                    accessibilityLabel="Abrir configuración"
                  >
                    <Sliders size={14} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.settingsButtonText, { color: colors.textPrimary }]}>
                      CONFIGURACIÓN
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.logoutButton,
                      {
                        borderColor: colors.accentDanger,
                        backgroundColor: colors.accentDangerSubtle,
                      },
                    ]}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                    accessibilityLabel="Cerrar sesión"
                  >
                    <LogOut size={14} color={colors.accentDanger} strokeWidth={2.5} />
                    <Text style={[styles.logoutButtonText, { color: colors.accentDanger }]}>
                      LOG OUT
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: '100%',
    borderBottomWidth: 2,
    zIndex: 50,
  },
  topBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topBarMobile: {
    height: 60,
    paddingHorizontal: 12,
  },
  topLeftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topLeftClusterMobile: {
    gap: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  brandMeta: {
    gap: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  engineTag: {
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  engineTagText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 38,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  telemetryPulse: {
    // animated via css telemetry-pulse
  },
  syncText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  utilityBtn: {
    width: 38,
    height: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  langBtn: {
    width: 'auto',
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 6,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  userWrapper: {
    position: 'relative',
    zIndex: 60,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    minHeight: 38,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  avatarBadge: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '900',
  },
  userName: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    maxWidth: 130,
  },
  popoverBackdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  profilePopover: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 220,
    borderWidth: 2,
    padding: 14,
    zIndex: 100,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  popoverHeader: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 12,
  },
  popoverUserName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  popoverUserEmail: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    paddingVertical: 10,
    marginBottom: 8,
  },
  settingsButtonText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  logoutButtonText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
});
