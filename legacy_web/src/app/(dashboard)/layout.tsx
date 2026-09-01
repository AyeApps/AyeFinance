'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredToken, getStoredUser, removeStoredToken } from '@/lib/auth';
import { ThemeToggleButton, ThemeSegmentedSelector } from '@/lib/theme';
import { User } from '@/types';
import {
  LayoutDashboard,
  Landmark,
  Receipt,
  CalendarClock,
  LogOut,
  Sliders,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Cuentas', href: '/cuentas', icon: Landmark },
  { label: 'Transacciones', href: '/transacciones', icon: Receipt },
  { label: 'Recurrentes', href: '/recurrentes', icon: CalendarClock },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = getStoredToken();
    if (!token) {
      router.push('/login');
      return;
    }
    const currentUser = getStoredUser();
    setUser(currentUser);
  }, [router]);

  const handleLogout = () => {
    removeStoredToken();
    router.push('/login');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      {/* 1. Desktop Sidebar (260px) */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-[var(--border-muted)] bg-[var(--bg-secondary)] p-5 sticky top-0 h-screen z-30 select-none">
        <div>
          {/* Brand Header */}
          <Link href="/" className="flex items-center gap-3 px-2 mb-6 group">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-amber)] flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(254,157,1,0.35)] transition-transform group-hover:scale-105">
              ₳
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)] block">
                AyeFinance
              </span>
              <span className="text-[10px] text-[var(--accent-amber)] font-mono uppercase tracking-widest font-bold">
                Atelier Suite
              </span>
            </div>
          </Link>

          {/* Telemetry Badge */}
          <div className="mb-6 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-muted)] flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] telemetry-pulse" />
              <span className="text-[var(--text-secondary)] font-semibold uppercase">Engine 4.0</span>
            </div>
            <span className="text-[10px] text-[var(--accent-amber)] font-bold">SYNCED</span>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--accent-amber)] text-black font-bold shadow-[0_2px_10px_rgba(254,157,1,0.25)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Prominent Sidebar Action Button */}
          <div className="mt-6 pt-4 border-t border-[var(--border-muted)]">
            <Link href="/transacciones?nuevo=1" className="block w-full">
              <button className="w-full py-2.5 px-3 rounded-xl bg-[var(--accent-amber)] hover:bg-[var(--accent-amber-hover)] text-black font-extrabold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(254,157,1,0.3)] btn-press cursor-pointer transition-all">
                <span className="text-base font-black leading-none">+</span>
                <span>Registrar</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Theme Switching & User Footer */}
        <div className="space-y-4 pt-4 border-t border-[var(--border-muted)]">
          {/* 3-Mode Theme Selector */}
          <div>
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-1.5 font-semibold">
              Tema / Theme
            </span>
            <ThemeSegmentedSelector />
          </div>

          {/* User Profile Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-muted)] flex items-center justify-center font-bold text-xs text-[var(--accent-amber)] shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="truncate text-left">
                <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                  {user?.name || 'Usuario Aye'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block truncate font-mono">
                  {user?.email || 'usuario@ayeapps.com'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger-subtle)] transition-colors cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Top Header */}
        <header className="md:hidden sticky top-0 z-40 bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-muted)] px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-amber)] flex items-center justify-center text-black font-black text-sm shadow-[0_0_10px_rgba(254,157,1,0.3)]">
              ₳
            </div>
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              AyeFinance
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent-danger)]"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Inner Container - Widescreen Optimized */}
        <main className="flex-1 pb-24 md:pb-10 p-4 sm:p-6 md:p-8 max-w-[1680px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-t border-[var(--border-muted)] px-4 py-2 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[var(--accent-amber)] font-bold' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
