import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sun, Moon, Languages, AlertCircle } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../store/useLanguageStore';
import { AyeLogo } from '../ui/AyeLogo';
import { api } from '../../services/api';

WebBrowser.maybeCompleteAuthSession();

const REMEMBERED_EMAIL_KEY = '@ayefinance_remembered_email';

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </Svg>
);

const AppleIcon = ({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.66-.99 1.72-.85 2.76 1.01.08 2.03-.51 2.56-1.26z" />
  </Svg>
);

export const AuthScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { language, t, toggleLanguage } = useTranslation();

  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const loginWithApple = useAuthStore((state) => state.loginWithApple);
  const { colors, toggleTheme, isDark } = useTheme();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(Platform.OS === 'ios');
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const checkStatus = React.useCallback(async () => {
    setServerStatus('checking');
    try {
      const isHealthy = await api.checkHealth();
      setServerStatus(isHealthy ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkStatus();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => checkStatus();
      const handleOffline = () => setServerStatus('offline');
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          checkStatus();
        }
      });
      return () => subscription.remove();
    }
  }, [checkStatus]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then((avail) => setIsAppleAuthAvailable(avail))
        .catch(() => setIsAppleAuthAvailable(false));
    } else {
      setIsAppleAuthAvailable(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).then((savedEmail) => {
      if (savedEmail) setAuthEmail(savedEmail);
    });
  }, []);

  const handleEmailAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Por favor completa todos los campos requeridos');
      return;
    }

    if (authMode === 'register' && !authName.trim()) {
      setAuthError('Por favor ingresa tu nombre');
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        await login(authEmail.trim(), authPassword.trim());
      } else {
        await register(authName.trim(), authEmail.trim(), authPassword.trim());
      }
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, authEmail.trim());
    } catch (err: any) {
      setAuthError(err.message || 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    try {
      setIsLoading(true);
      setAuthError('');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No se recibió token de Apple');
      }

      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;

      await loginWithApple(credential.identityToken, fullName || undefined, credential.email || undefined);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        setAuthError(err.message || 'Error al autenticar con Apple');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Top action controls */}
      <View style={styles.topBar}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  serverStatus === 'online' ? '#10B981' : serverStatus === 'offline' ? '#EF4444' : '#FE9D01',
              },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {serverStatus === 'online'
              ? t.auth.serverOnline
              : serverStatus === 'offline'
              ? t.auth.serverOffline
              : t.auth.serverChecking}
          </Text>
        </View>

        <View style={styles.topRightControls}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.iconButton}>
            <Languages size={18} color={colors.textSecondary} />
            <Text style={[styles.langText, { color: colors.textSecondary }]}>
              {language.toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            {isDark ? (
              <Sun size={18} color={colors.textSecondary} />
            ) : (
              <Moon size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main card */}
      <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.borderMuted }]}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <AyeLogo width={50} color={colors.accent} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.auth.appName}</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t.auth.tagline}</Text>
        </View>

        {/* Tab switch */}
        <View style={[styles.tabs, { backgroundColor: colors.bgSurface }]}>
          <TouchableOpacity
            style={[styles.tab, authMode === 'login' && { backgroundColor: colors.accent }]}
            onPress={() => {
              setAuthMode('login');
              setAuthError('');
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: authMode === 'login' ? '#000' : colors.textSecondary },
                authMode === 'login' && styles.tabTextActive,
              ]}
            >
              {t.auth.loginTitle}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, authMode === 'register' && { backgroundColor: colors.accent }]}
            onPress={() => {
              setAuthMode('register');
              setAuthError('');
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: authMode === 'register' ? '#000' : colors.textSecondary },
                authMode === 'register' && styles.tabTextActive,
              ]}
            >
              {t.auth.registerTitle}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error message */}
        {!!authError && (
          <View style={[styles.errorContainer, { backgroundColor: colors.accentDangerSubtle, borderColor: colors.accentDanger }]}>
            <AlertCircle size={16} color={colors.accentDanger} />
            <Text style={[styles.errorText, { color: colors.accentDanger }]}>{authError}</Text>
          </View>
        )}

        {/* Form fields */}
        <View style={styles.form}>
          {authMode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t.auth.nameLabel}</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted, color: colors.textPrimary },
                ]}
                placeholder={t.auth.namePlaceholder}
                placeholderTextColor={colors.textMuted}
                value={authName}
                onChangeText={setAuthName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.auth.emailLabel}</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted, color: colors.textPrimary },
              ]}
              placeholder={t.auth.emailPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.auth.passwordLabel}</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderMuted, color: colors.textPrimary },
              ]}
              placeholder={t.auth.passwordPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={handleEmailAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authMode === 'login' ? t.auth.loginButton : t.auth.registerButton}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Apple Sign-In on iOS */}
        {isAppleAuthAvailable && (
          <View style={styles.socialAuth}>
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderMuted }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t.auth.orDivider}</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderMuted }]} />
            </View>

            <TouchableOpacity
              style={[styles.appleButton, { backgroundColor: isDark ? '#ffffff' : '#000000' }]}
              onPress={handleAppleAuth}
              disabled={isLoading}
            >
              <AppleIcon size={18} color={isDark ? '#000000' : '#ffffff'} />
              <Text style={[styles.appleButtonText, { color: isDark ? '#000000' : '#ffffff' }]}>
                {t.auth.appleButton}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  tagline: {
    fontSize: 12,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  primaryButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  socialAuth: {
    marginTop: 16,
    gap: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
  },
  appleButton: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  appleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
