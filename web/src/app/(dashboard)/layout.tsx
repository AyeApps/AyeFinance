'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredToken, getStoredUser, removeStoredToken } from '@/lib/auth';
import { User } from '@/types';
import {
  LayoutDashboard,
  Landmark,
  Receipt,
  CalendarClock,
  LogOut,
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#f5f5f5]">
      {/* 1. Desktop Sidebar (240px) */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-[rgba(255,255,255,0.08)] bg-[#090909] p-5 sticky top-0 h-screen z-30">
        <div>
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 px-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#FE9D01] flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(254,157,1,0.3)]">
              ₳
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#f5f5f5] block">
                AyeFinance
              </span>
              <span className="text-[10px] text-[#FE9D01] font-mono uppercase tracking-widest">
                Atelier Suite
              </span>
            </div>
          </Link>

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
                      ? 'bg-[#FE9D01] text-black font-semibold shadow-[0_2px_10px_rgba(254,157,1,0.25)]'
                      : 'text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center font-bold text-xs text-[#FE9D01] shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="truncate text-left">
              <span className="text-xs font-semibold text-[#f5f5f5] block truncate">
                {user?.name || 'Usuario Aye'}
              </span>
              <span className="text-[10px] text-[#666] block truncate">
                {user?.email || 'usuario@ayeapps.com'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 pb-24 md:pb-10 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090909]/90 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#FE9D01]' : 'text-[#8a8a8a]'
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
