import { Platform } from 'react-native';
import { authStorage } from './authStorage';
import { Account, AccountSummary, PaginatedResponse, RecurringItem, Transaction, User } from '../types';

export const getApiBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8003/api/v1';
  if (Platform.OS === 'android' && url.includes('localhost')) {
    url = url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
};

export const getAuthApiBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_AUTH_API_URL || 'http://localhost:8000/api/v1';
  if (Platform.OS === 'android' && url.includes('localhost')) {
    url = url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
};

export const api = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBaseUrl().replace('/api/v1', '')}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async login(payload: { email: string; password: string }): Promise<{ access_token: string; refresh_token?: string; user?: User }> {
    const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Credenciales inválidas');
    }
    return res.json();
  },

  async register(payload: { name: string; email: string; password: string }): Promise<{ access_token: string; refresh_token?: string }> {
    const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al registrar usuario');
    }
    return res.json();
  },

  async loginWithGoogle(idToken: string): Promise<{ access_token: string; refresh_token?: string }> {
    // Falls back to direct login or central auth token
    const res = await fetch(`${getAuthApiBaseUrl()}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error con autenticación de Google');
    }
    return res.json();
  },

  async loginWithApple(identityToken: string, name?: string, email?: string): Promise<{ access_token: string; refresh_token?: string }> {
    const res = await fetch(`${getAuthApiBaseUrl()}/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity_token: identityToken, name, email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error con autenticación de Apple');
    }
    return res.json();
  },

  async getMe(): Promise<User> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('No autorizado');
    }
    return res.json();
  },

  async updateProfile(data: { name?: string; email?: string; current_password?: string; new_password?: string }): Promise<User> {
    const token = await authStorage.getAccessToken();
    try {
      const res = await fetch(`${getAuthApiBaseUrl()}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {}

    const localRes = await fetch(`${getApiBaseUrl()}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!localRes.ok) {
      const err = await localRes.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al actualizar perfil');
    }
    return localRes.json();
  },

  async getSummary(): Promise<AccountSummary> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/accounts/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar resumen');
    return res.json();
  },

  async getAccounts(): Promise<Account[]> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/accounts/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar cuentas');
    return res.json();
  },

  async createAccount(data: any): Promise<Account> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/accounts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = Array.isArray(err.detail)
        ? err.detail.map((e: any) => e.msg).join(', ')
        : err.detail || 'Error al crear cuenta';
      throw new Error(msg);
    }
    return res.json();
  },

  async deleteAccount(id: string): Promise<void> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al eliminar cuenta');
    }
  },

  async getTransactions(page = 1, limit = 20): Promise<PaginatedResponse<Transaction>> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/transactions/?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar transacciones');
    return res.json();
  },

  async createTransaction(data: any): Promise<Transaction> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/transactions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = Array.isArray(err.detail)
        ? err.detail.map((e: any) => e.msg).join(', ')
        : err.detail || 'Error al registrar movimiento';
      throw new Error(msg);
    }
    return res.json();
  },

  async deleteTransaction(id: string): Promise<void> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/transactions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al eliminar movimiento');
  },

  async getRecurring(): Promise<RecurringItem[]> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/recurring/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar recurrentes');
    return res.json();
  },

  async deleteUserAccount(): Promise<void> {
    const token = await authStorage.getAccessToken();
    const res = await fetch(`${getAuthApiBaseUrl()}/auth/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      await fetch(`${getApiBaseUrl()}/auth/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  },
};
