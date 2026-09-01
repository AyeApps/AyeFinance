import { create } from 'zustand';
import { api } from '../services/api';
import { authStorage } from '../services/authStorage';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, name?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; current_password?: string; new_password?: string }) => Promise<void>;
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
      const token = await authStorage.getAccessToken();
      if (token) {
        try {
          const user = await api.getMe();
          set({ user, isAuthenticated: true, isInitializing: false, isLoading: false });
          return;
        } catch {
          await authStorage.clearTokens();
        }
      }
    } catch {
      await authStorage.clearTokens();
    }
    set({ user: null, isAuthenticated: false, isInitializing: false, isLoading: false });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login({ email, password });
      await authStorage.setTokens(data.access_token, data.refresh_token);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      set({ error: err.message || 'Error al iniciar sesión', isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.register({ name, email, password });
      await authStorage.setTokens(data.access_token, data.refresh_token);
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
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
    } catch (err: any) {
      set({ error: err.message || 'Error con Apple', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await authStorage.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      await api.deleteUserAccount().catch(() => {});
      await authStorage.clearTokens();
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
}));
