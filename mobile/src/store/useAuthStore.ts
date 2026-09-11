import { create } from 'zustand';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { authStorage } from '../services/authStorage';
import { widgetBridge } from '../services/widgetBridge';
import { useFinanceStore } from './useFinanceStore';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: (url?: string) => Promise<void>;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (name: string, email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, name?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; current_password?: string; new_password?: string }) => Promise<void>;
  syncWidget: () => Promise<void>;
}

let initAuthLock: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  error: null,

  initAuth: async (url?: string) => {
    if (initAuthLock) return initAuthLock;
    
    initAuthLock = (async () => {
      set({ isInitializing: true, error: null });
      try {
        // Check for OAuth tokens in URL hash or query string (e.g. from Apple redirect)
        if (typeof window !== 'undefined' && (window.location?.hash || window.location?.search)) {
          try {
            const hashString = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
            const searchString = window.location.search.startsWith('?') ? window.location.search.substring(1) : '';
            const hashParams = new URLSearchParams(hashString);
            const searchParams = new URLSearchParams(searchString);

            const errorParam = hashParams.get('error') || searchParams.get('error');
            if (errorParam) {
               set({ error: errorParam === 'apple_auth_failed' ? 'Error al autenticar con Apple' : errorParam });
               window.history.replaceState(null, '', window.location.pathname);
            }

            const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

            if (accessToken) {
              await authStorage.setTokens(accessToken, refreshToken || undefined);
              window.history.replaceState(null, '', window.location.pathname);
            }
          } catch {}
        }

        // Check for tokens passed via native deep link (e.g. ayefinance://auth?access_token=...)
        try {
          const targetUrl = url || await Linking.getInitialURL();
          if (targetUrl && (targetUrl.includes('access_token=') || targetUrl.includes('refresh_token='))) {
            const lastConsumedUrl = await AsyncStorage.getItem('@ayefinance_last_initial_url');
            if (lastConsumedUrl !== targetUrl) {
              const rawQuery = targetUrl.includes('?')
                ? targetUrl.split('?')[1]
                : (targetUrl.includes('#') ? targetUrl.split('#')[1] : '');
              const params = new URLSearchParams(rawQuery);
              const accessToken = params.get('access_token') || params.get('token');
              const refreshToken = params.get('refresh_token');
              if (accessToken) {
                await authStorage.setTokens(accessToken, refreshToken || undefined);
                await AsyncStorage.setItem('@ayefinance_last_initial_url', targetUrl);
              }
            }
          }
        } catch {}

        const token = await authStorage.getAccessToken();
        if (token) {
          try {
            const user = await api.getMe();
            set({ user, isAuthenticated: true, isInitializing: false, isLoading: false });
            // Synchronize accounts to native widget bridge
            api.getAccounts()
              .then((accounts) => {
                widgetBridge.syncWidgetData(token, accounts).catch(() => {});
              })
              .catch(() => {});
            return;
          } catch (e: any) {
            if (e?.message === 'No autorizado') {
              // Token de acceso expiró, intentar usar el Refresh Token
              try {
                const refresh = await authStorage.getRefreshToken();
                if (refresh) {
                  const newTokens = await api.refreshToken(refresh);
                  await authStorage.setTokens(newTokens.access_token, newTokens.refresh_token);
                  
                  // Reintentar getMe con el nuevo token
                  const user = await api.getMe();
                  set({ user, isAuthenticated: true, isInitializing: false, isLoading: false });
                  
                  // Sincronizar cuentas
                  api.getAccounts().then((accounts) => {
                    widgetBridge.syncWidgetData(newTokens.access_token, accounts).catch(() => {});
                  }).catch(() => {});
                  return;
                }
              } catch (refreshErr) {
                // El refresh token también expiró o es inválido
              }
              // Si no había refresh token o falló el proceso, cerramos sesión
              await authStorage.clearTokens();
              await widgetBridge.clearWidgetData().catch(() => {});
            } else {
              // Es un error de red o de servidor, pero el token podría seguir siendo válido
              set({ isAuthenticated: true, isInitializing: false, isLoading: false });
              return;
            }
          }
        }
      } catch {
        await authStorage.clearTokens();
        await widgetBridge.clearWidgetData().catch(() => {});
      }
      set({ user: null, isAuthenticated: false, isInitializing: false, isLoading: false });
    })();

    try {
      await initAuthLock;
    } finally {
      initAuthLock = null;
    }
  },

  login: async (email, password, turnstileToken) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login({ email, password, turnstile_token: turnstileToken });
      await authStorage.setTokens(data.access_token, data.refresh_token);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      api.getAccounts()
        .then((accounts) => {
          widgetBridge.syncWidgetData(data.access_token, accounts).catch(() => {});
        })
        .catch(() => {});
    } catch (err: any) {
      set({ error: err.message || 'Error al iniciar sesión', isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password, turnstileToken) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.register({ name, email, password, turnstile_token: turnstileToken });
      await authStorage.setTokens(data.access_token, data.refresh_token);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      api.getAccounts()
        .then((accounts) => {
          widgetBridge.syncWidgetData(data.access_token, accounts).catch(() => {});
        })
        .catch(() => {});
    } catch (err: any) {
      set({ error: err.message || 'Error al registrar usuario', isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.loginWithGoogle(idToken);
      await authStorage.setTokens(data.access_token, data.refresh_token);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      api.getAccounts()
        .then((accounts) => {
          widgetBridge.syncWidgetData(data.access_token, accounts).catch(() => {});
        })
        .catch(() => {});
    } catch (err: any) {
      set({ error: err.message || 'Error con Google', isLoading: false });
      throw err;
    }
  },

  loginWithApple: async (identityToken, name, email) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.loginWithApple(identityToken, name, email);
      await authStorage.setTokens(data.access_token, data.refresh_token);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      api.getAccounts()
        .then((accounts) => {
          widgetBridge.syncWidgetData(data.access_token, accounts).catch(() => {});
        })
        .catch(() => {});
    } catch (err: any) {
      set({ error: err.message || 'Error con Apple', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await api.logout().catch(() => {});
    await authStorage.clearTokens();
    await widgetBridge.clearWidgetData().catch(() => {});
    await useFinanceStore.getState().clearStore().catch(() => {});
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      await api.deleteAccount().catch(() => {});
      await authStorage.clearTokens();
      await widgetBridge.clearWidgetData().catch(() => {});
      await useFinanceStore.getState().clearStore().catch(() => {});
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await api.updateProfile(data);
      set({ user: updatedUser, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error al actualizar perfil', isLoading: false });
      throw err;
    }
  },

  syncWidget: async () => {
    try {
      const token = await authStorage.getAccessToken();
      if (!token) return;
      const accounts = await api.getAccounts().catch(() => []);
      await widgetBridge.syncWidgetData(token, accounts);
    } catch {}
  },
}));
