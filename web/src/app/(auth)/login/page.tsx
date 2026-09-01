'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setStoredToken, setStoredUser } from '@/lib/auth';
import { AuthResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setStoredToken(data.access_token);
      setStoredUser(data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card bracket lift glow className="w-full max-w-md p-8 bg-[#0d0d0d] border-white/10 text-center">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FE9D01] flex items-center justify-center text-black font-black text-2xl shadow-[0_0_25px_rgba(254,157,1,0.4)] mb-3">
            ₳
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">AyeFinance</h1>
          <span className="text-xs text-[#8a8a8a] mt-1">
            Control de cuentas, ahorros y flujo de caja proyectado
          </span>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@ayeapps.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div className="relative">
            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-[#8a8a8a] hover:text-white p-1"
              aria-label="Mostrar contraseña"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            <Lock className="w-4 h-4 mr-1" />
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/5 text-center">
          <p className="text-xs text-[#666]">
            Conectado al microservicio central de identidad <span className="text-[#8a8a8a]">aye-auth</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
