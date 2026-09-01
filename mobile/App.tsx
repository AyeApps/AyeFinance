import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View, StyleSheet } from 'react-native';
import { useAuthStore } from './src/store/useAuthStore';
import { useThemeStore } from './src/hooks/useTheme';
import { useLanguageStore } from './src/store/useLanguageStore';
import { AuthScreen } from './src/components/auth/AuthScreen';
import { DashboardScreen } from './src/components/dashboard/DashboardScreen';
import { AccountsScreen } from './src/components/accounts/AccountsScreen';
import { TransactionsScreen } from './src/components/transactions/TransactionsScreen';
import { RecurringScreen } from './src/components/recurring/RecurringScreen';

export default function App() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initAuth = useAuthStore((state) => state.initAuth);

  const loadSavedTheme = useThemeStore((state) => state.loadSavedTheme);
  const isDark = useThemeStore((state) => state.isDark);
  const colors = useThemeStore((state) => state.colors);
  const loadSavedLanguage = useLanguageStore((state) => state.loadSavedLanguage);

  const [currentScreen, setCurrentScreen] = useState('dashboard');

  useEffect(() => {
    loadSavedTheme();
    loadSavedLanguage();
    initAuth();
  }, [initAuth, loadSavedTheme, loadSavedLanguage]);

  if (isInitializing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgBase} />
      {!isAuthenticated ? (
        <AuthScreen />
      ) : currentScreen === 'accounts' ? (
        <AccountsScreen onBack={() => setCurrentScreen('dashboard')} />
      ) : currentScreen === 'transactions' ? (
        <TransactionsScreen onBack={() => setCurrentScreen('dashboard')} />
      ) : currentScreen === 'recurring' ? (
        <RecurringScreen onBack={() => setCurrentScreen('dashboard')} />
      ) : (
        <DashboardScreen onNavigate={(screen) => setCurrentScreen(screen)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
