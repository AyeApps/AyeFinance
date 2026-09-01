import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/useAuthStore';
import { useThemeStore } from './src/hooks/useTheme';
import { useLanguageStore } from './src/store/useLanguageStore';
import { AuthScreen } from './src/components/auth/AuthScreen';
import { DashboardScreen } from './src/components/dashboard/DashboardScreen';
import { AccountsScreen } from './src/components/accounts/AccountsScreen';
import { TransactionsScreen } from './src/components/transactions/TransactionsScreen';
import { RecurringScreen } from './src/components/recurring/RecurringScreen';
import { SettingsView } from './src/components/settings/SettingsView';
import { AnimatedDotBackground } from './src/components/canvas/AnimatedDotBackground';
import { FinanceHeader } from './src/components/navigation/FinanceHeader';
import { FinanceFloatingDock } from './src/components/navigation/FinanceFloatingDock';
import { SidebarDrawer } from './src/components/navigation/SidebarDrawer';
import { QuickAddModal } from './src/components/transactions/QuickAddModal';

export default function App() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initAuth = useAuthStore((state) => state.initAuth);

  const loadSavedTheme = useThemeStore((state) => state.loadSavedTheme);
  const isDark = useThemeStore((state) => state.isDark);
  const colors = useThemeStore((state) => state.colors);
  const loadSavedLanguage = useLanguageStore((state) => state.loadSavedLanguage);

  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadSavedTheme();
    loadSavedLanguage();
    initAuth();
  }, [initAuth, loadSavedTheme, loadSavedLanguage]);

  // Inject web CSS directly into document.head to guarantee 100% active animations in browser
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'ayefinance-master-animations';
      let styleTag = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }

      styleTag.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700;800;900&display=swap');

        /* 1. Canvas Grid Motion */
        @keyframes gridMove {
          0% { background-position: 0px 0px; }
          100% { background-position: 32px 32px; }
        }

        /* 2. Telemetry Pulse */
        .telemetry-pulse {
          animation: pulseGreen 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        /* 3. Base Reset */
        body, html, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          overflow: hidden;
          background-color: ${colors.bgBase};
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* 4. Smooth Transition on Theme Toggle */
        body, html, #root, div, span, p, h1, h2, h3, h4, h5, h6, input, textarea, button, a, svg {
          transition: background-color 400ms cubic-bezier(0.4, 0, 0.2, 1),
                      border-color 400ms cubic-bezier(0.4, 0, 0.2, 1),
                      color 400ms cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `;
    }
  }, [colors.bgBase]);

  if (isInitializing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          [ INITIALIZING AYEFINANCE ENGINE... ]
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgBase} />
        {/* Background Animated Matrix Grid Canvas */}
        <AnimatedDotBackground />
        <AuthScreen />
      </View>
    );
  }

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'settings':
        return <SettingsView onBack={() => setCurrentScreen('dashboard')} />;
      case 'accounts':
        return <AccountsScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'transactions':
        return <TransactionsScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'recurring':
        return <RecurringScreen onBack={() => setCurrentScreen('dashboard')} />;
      default:
        return (
          <DashboardScreen
            key={refreshKey}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bgBase }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgBase} translucent={false} />

        {/* Edge-to-Edge Animated Cyber Dot Matrix */}
        <AnimatedDotBackground />

        {/* Top Precision Atelier Header */}
        <FinanceHeader
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />

        {/* Main Screen Content */}
        <View style={styles.mainContentArea}>
          {renderCurrentScreen()}
        </View>

        {/* Bottom Floating Command Dock (Hidden in Settings) */}
        {currentScreen !== 'settings' && (
          <FinanceFloatingDock
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        )}

        {/* Quick Add Transaction Modal */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Left-anchored Cyber Navigation & Settings Drawer */}
        <SidebarDrawer
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  mainContentArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
});
