import { create } from 'zustand';
import { Linking } from 'react-native';
import { api } from '../services/api';
import { authStorage } from '../services/authStorage';
import { widgetBridge } from '../services/widgetBridge';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (name: string, email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, name?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; current_password?: string; new_password?: string }) => Promise<void>;
  syncWidget: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  error: null,

  initAuth: async () => {
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
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && (initialUrl.includes('access_token=') || initialUrl.includes('token='))) {
          const rawQuery = initialUrl.includes('?')
            ? initialUrl.split('?')[1]
            : (initialUrl.includes('#') ? initialUrl.split('#')[1] : '');
          const params = new URLSearchParams(rawQuery);
          const accessToken = params.get('access_token') || params.get('token');
          const refreshToken = params.get('refresh_token');
          if (accessToken) {
            await authStorage.setTokens(accessToken, refreshToken || undefined);
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
        } catch {
          await authStorage.clearTokens();
          await widgetBridge.clearWidgetData().catch(() => {});
        }
      }
    } catch {
      await authStorage.clearTokens();
      await widgetBridge.clearWidgetData().catch(() => {});
    }
    set({ user: null, isAuthenticated: false, isInitializing: false, isLoading: false });
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
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      await api.deleteAccount().catch(() => {});
      await authStorage.clearTokens();
      await widgetBridge.clearWidgetData().catch(() => {});
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
