'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Account, AccountSummary as IAccountSummary, RecurringItem, Transaction } from '@/types';
import { BalanceSummary } from '@/components/dashboard/BalanceSummary';
import { AccountCard } from '@/components/dashboard/AccountCard';
import { QuickAddFAB } from '@/components/dashboard/QuickAddFAB';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight, Landmark, CalendarClock } from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<IAccountSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [sumData, accsData, txsData, recData] = await Promise.all([
        apiFetch<IAccountSummary>('/accounts/summary'),
        apiFetch<Account[]>('/accounts/'),
        apiFetch<{ items: Transaction[] }>('/transactions/?limit=5'),
        apiFetch<RecurringItem[]>('/recurring/'),
      ]);

      setSummary(sumData);
      setAccounts(accsData);
      setTransactions(txsData.items || []);
      setRecurring(recData.slice(0, 3));
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">Dashboard Financiero</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            Panorama general de liquidez, cuentas y calendario de pagos
          </p>
        </div>
        <Link href="/cuentas">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nueva Cuenta
          </Button>
        </Link>
      </div>

      {/* Section A: Balance Summary Cards */}
      <BalanceSummary summary={summary} loading={loading} />

      {/* Section B: Mis Cuentas Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#FE9D01]" />
            <h2 className="text-base font-semibold text-[#f5f5f5]">Mis Cuentas</h2>
          </div>
          <Link
            href="/cuentas"
            className="text-xs font-medium text-[#FE9D01] hover:text-[#FFAF20] flex items-center gap-1 transition-colors"
          >
            Gestionar cuentas
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {accounts.length === 0 && !loading ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-[#8a8a8a]">No tienes cuentas bancarias registradas.</p>
            <Link href="/cuentas" className="mt-3 inline-block">
              <Button size="sm" variant="primary">
                Crear primera cuenta
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} />
            ))}
          </div>
        )}
      </div>

      {/* Section C & D: Recent Transactions & Upcoming Recurring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Last 5 Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#f5f5f5]">Últimos Movimientos</h3>
            <Link
              href="/transacciones"
              className="text-xs font-medium text-[#FE9D01] hover:text-[#FFAF20] flex items-center gap-1 transition-colors"
            >
              Ver todas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <TransactionList
            transactions={transactions}
            accounts={accounts}
            loading={loading}
            onDelete={loadDashboardData}
          />
        </div>

        {/* Right 1 Col: Upcoming Recurring Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-[#FE9D01]" />
              <h3 className="text-base font-semibold text-[#f5f5f5]">Próximos Recurrentes</h3>
            </div>
            <Link
              href="/recurrentes"
              className="text-xs font-medium text-[#FE9D01] hover:text-[#FFAF20] flex items-center gap-1 transition-colors"
            >
              Ver todos
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recurring.length === 0 && !loading ? (
            <Card className="p-6 text-center text-xs text-[#8a8a8a]">
              Sin pagos ni sueldos recurrentes pendientes.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {recurring.map((item) => (
                <Card key={item.id} lift className="p-3.5 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-xs font-semibold text-[#f5f5f5] block">{item.name}</span>
                    <span className="text-[10px] text-[#8a8a8a]">{item.frequency}</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold ${
                      item.type === 'ingreso_fijo' ? 'text-emerald-400' : 'text-[#f5f5f5]'
                    }`}
                  >
                    {item.type === 'ingreso_fijo' ? '+' : '-'}
                    ${parseFloat(String(item.amount)).toFixed(2)}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Quick Add */}
      <QuickAddFAB accounts={accounts} onSuccess={loadDashboardData} />
    </div>
  );
}
