import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Landmark, Receipt, CalendarClock, Plus } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface FinanceFloatingDockProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onOpenQuickAdd?: () => void;
}

export const FinanceFloatingDock: React.FC<FinanceFloatingDockProps> = ({
  currentScreen,
  onNavigate,
  onOpenQuickAdd,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 420;
  const insets = useSafeAreaInsets();

  const { colors } = useTheme();

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'RESUMEN', shortLabel: 'INICIO', icon: LayoutDashboard },
    { id: 'accounts', label: 'CUENTAS', shortLabel: 'BANCO', icon: Landmark },
    { id: 'transactions', label: 'LIBRO', shortLabel: 'LIBRO', icon: Receipt },
    { id: 'recurring', label: 'FIJOS', shortLabel: 'FIJOS', icon: CalendarClock },
  ];

  // Safe bottom offset: respects home indicator on iPhone and Android nav bar
  const safeBottom = Platform.OS === 'web'
    ? 24
    : Math.max(insets.bottom, 12) + (isMobile ? 8 : 16);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockRoot,
        isMobile && styles.dockRootMobile,
        { bottom: safeBottom },
      ]}
    >
      <View
        style={[
          styles.dockContainer,
          isMobile && styles.dockContainerMobile,
          {
            backgroundColor: colors.bgBase,
            borderColor: colors.borderColor,
            shadowColor: colors.shadowColor,
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: isMobile
                    ? `4px 4px 0px 0px ${colors.shadowColor}`
                    : `6px 6px 0px 0px ${colors.shadowColor}`,
                }
              : {}),
          },
        ]}
      >
        {isMobile ? (
          <>
            {/* Left 2 Items: Resumen & Cuentas */}
            {NAV_ITEMS.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navBtn,
                    styles.navBtnMobile,
                    isActive && {
                      backgroundColor: colors.textPrimary,
                    },
                  ]}
                  onPress={() => onNavigate(item.id)}
                  activeOpacity={0.8}
                  accessibilityLabel={item.label}
                >
                  <Icon
                    size={15}
                    color={isActive ? colors.bgBase : colors.textPrimary}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.navBtnText,
                      styles.navBtnTextMobile,
                      { color: isActive ? colors.bgBase : colors.textPrimary },
                    ]}
                  >
                    {isSmallMobile ? item.shortLabel : item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Center + Action Button on Mobile */}
            <TouchableOpacity
              style={[
                styles.heroActionBtnMobile,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.borderColor,
                  shadowColor: colors.shadowColor,
                  ...(Platform.OS === 'web' ? { boxShadow: `3px 3px 0px 0px ${colors.shadowColor}` } : {}),
                },
              ]}
              onPress={onOpenQuickAdd}
              activeOpacity={0.8}
              accessibilityLabel="Registrar nuevo movimiento"
            >
              <Plus size={20} color="#000000" strokeWidth={3} />
            </TouchableOpacity>

            {/* Right 2 Items: Libro & Fijos */}
            {NAV_ITEMS.slice(2, 4).map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navBtn,
                    styles.navBtnMobile,
                    isActive && {
                      backgroundColor: colors.textPrimary,
                    },
                  ]}
                  onPress={() => onNavigate(item.id)}
                  activeOpacity={0.8}
                  accessibilityLabel={item.label}
                >
                  <Icon
                    size={15}
                    color={isActive ? colors.bgBase : colors.textPrimary}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.navBtnText,
                      styles.navBtnTextMobile,
                      { color: isActive ? colors.bgBase : colors.textPrimary },
                    ]}
                  >
                    {isSmallMobile ? item.shortLabel : item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          /* Desktop Layout: 4 Full Items */
          NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.navBtn,
                  isActive && {
                    backgroundColor: colors.textPrimary,
                  },
                ]}
                onPress={() => onNavigate(item.id)}
                activeOpacity={0.8}
                accessibilityLabel={item.label}
              >
                <Icon
                  size={16}
                  color={isActive ? colors.bgBase : colors.textPrimary}
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    styles.navBtnText,
                    { color: isActive ? colors.bgBase : colors.textPrimary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockRoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dockRootMobile: {
    paddingHorizontal: 12,
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  dockContainerMobile: {
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    maxWidth: '100%',
    shadowOffset: { width: 4, height: 4 },
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  navBtnMobile: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    minHeight: 44,
  },
  navBtnText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  navBtnTextMobile: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  heroActionBtnMobile: {
    width: 42,
    height: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginHorizontal: 2,
  },
});
