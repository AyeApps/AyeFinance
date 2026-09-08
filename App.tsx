import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Linking,
  StatusBar,
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/useAuthStore';
import { useThemeStore } from './src/hooks/useTheme';
import { useLanguageStore } from './src/store/useLanguageStore';
import { AuthScreen } from './src/components/auth/AuthScreen';
import { LandingPage } from './src/components/landing/LandingPage';
import { DashboardScreen } from './src/components/dashboard/DashboardScreen';
import { AccountsScreen } from './src/components/accounts/AccountsScreen';
import { TransactionsScreen } from './src/components/transactions/TransactionsScreen';
import { RecurringScreen } from './src/components/recurring/RecurringScreen';
import { SettingsView } from './src/components/settings/SettingsView';
import { AnimatedDotBackground } from './src/components/canvas/AnimatedDotBackground';
import { FinanceHeader } from './src/components/navigation/FinanceHeader';
import { FinanceFloatingDock } from './src/components/navigation/FinanceFloatingDock';
import { SidebarDrawer } from './src/components/navigation/SidebarDrawer';
import { QuickAddModal, QuickAddInitialData } from './src/components/transactions/QuickAddModal';
import { TransactionType } from './src/types';

/**
 * Parses deep link URLs (e.g. ayefinance://transaction/new or ayefinance://quick-add)
 * Extracts parameters: amount, concept / desc, accountId / account, type.
 */
function parseQuickAddUrl(url: string): { isQuickAdd: boolean; initialData?: QuickAddInitialData } {
  if (!url) return { isQuickAdd: false };

  try {
    const [rawPath, rawQuery] = url.split('?');
    const path = rawPath.toLowerCase();

    // Check if the URL target is a quick-add / new transaction movement
    const isMatch =
      path.includes('transaction/new') ||
      path.includes('quick-add') ||
      path.includes('quickadd') ||
      path.endsWith('/new');

    if (!isMatch) {
      return { isQuickAdd: false };
    }

    const params: Record<string, string> = {};
    if (rawQuery) {
      rawQuery.split('&').forEach((part) => {
        const [k, v] = part.split('=');
        if (k) {
          try {
            params[decodeURIComponent(k).trim().toLowerCase()] = v
              ? decodeURIComponent(v.replace(/\+/g, ' ')).trim()
              : '';
          } catch {
            params[k.trim().toLowerCase()] = v ? v.trim() : '';
          }
        }
      });
    }

    const initialData: QuickAddInitialData = {};

    // 1. Amount
    if (params.amount) {
      initialData.amount = params.amount;
    }

    // 2. Concept / desc / description
    const concept = params.concept || params.desc || params.description;
    if (concept) {
      initialData.concept = concept;
    }

    // 3. Account / accountId / account_id
    const accountId = params.accountid || params.account || params.account_id;
    if (accountId) {
      initialData.accountId = accountId;
    }

    // 4. Type (gasto, ingreso, transferencia)
    const rawType = (params.type || '').toLowerCase();
    if (rawType === 'ingreso' || rawType === 'income') {
      initialData.type = 'ingreso' as TransactionType;
    } else if (rawType === 'gasto' || rawType === 'expense') {
      initialData.type = 'gasto' as TransactionType;
    } else if (rawType === 'transferencia' || rawType === 'transfer') {
      initialData.type = 'transferencia' as TransactionType;
    }

    return { isQuickAdd: true, initialData };
  } catch (err) {
    if (__DEV__) {
      console.warn('[DeepLinking] Error parsing deep link:', url, err);
    }
    return { isQuickAdd: false };
  }
}

function MainApp() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initAuth = useAuthStore((state) => state.initAuth);

  const loadSavedTheme = useThemeStore((state) => state.loadSavedTheme);
  const isDark = useThemeStore((state) => state.isDark);
  const colors = useThemeStore((state) => state.colors);
  const loadSavedLanguage = useLanguageStore((state) => state.loadSavedLanguage);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomInset = insets.bottom;

  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddInitialData, setQuickAddInitialData] = useState<QuickAddInitialData | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showAuth, setShowAuth] = useState<boolean>(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('login') || hash.includes('auth') || search.includes('auth') || search.includes('login');
  });

  // Deep linking listener for quick movements (ayefinance://transaction/new or ayefinance://quick-add) or auth tokens
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (url.includes('access_token=') || url.includes('token=')) {
        initAuth();
        return;
      }
      const parsed = parseQuickAddUrl(url);
      if (parsed.isQuickAdd) {
        setQuickAddInitialData(parsed.initialData);
        setIsQuickAddOpen(true);
      }
    };

    // Cold start deep link check
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          handleUrl(initialUrl);
        }
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[DeepLinking] Failed to get initial URL:', err);
        }
      });

    // Runtime deep link events listener
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Listen to AppState transitions to refresh dashboard data when app returns to foreground
  useEffect(() => {
    let currentAppState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        currentAppState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App transitioned to foreground/active: refresh dashboard data in case of silent background recording
        setRefreshKey((prev) => prev + 1);
      }
      currentAppState = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
      <View style={[styles.center, { backgroundColor: colors.bgBase, paddingTop: topInset, paddingBottom: bottomInset }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
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
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {/* Edge-to-Edge Background Animated Matrix Grid Canvas */}
        <AnimatedDotBackground />
        {Platform.OS === 'web' && !showAuth ? (
          <LandingPage onStartAuth={() => setShowAuth(true)} />
        ) : (
          <AuthScreen onBack={Platform.OS === 'web' ? () => setShowAuth(false) : undefined} />
        )}
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
            onOpenQuickAdd={(initData) => {
              setQuickAddInitialData(initData);
              setIsQuickAddOpen(true);
            }}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

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
          onOpenQuickAdd={() => {
            setQuickAddInitialData(undefined);
            setIsQuickAddOpen(true);
          }}
        />
      )}

      {/* Quick Add Transaction Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        initialData={quickAddInitialData}
        onClose={() => {
          setIsQuickAddOpen(false);
          setQuickAddInitialData(undefined);
        }}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Left-anchored Cyber Navigation & Settings Drawer */}
      <SidebarDrawer
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <MainApp />
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
