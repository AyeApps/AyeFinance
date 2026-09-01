'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Account, AccountSummary as IAccountSummary, RecurringItem, Transaction } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { BalanceSummary } from '@/components/dashboard/BalanceSummary';
import { AccountCard } from '@/components/dashboard/AccountCard';
import { QuickAddFAB } from '@/components/dashboard/QuickAddFAB';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Plus,
  ArrowRight,
  Landmark,
  CalendarClock,
  PieChart,
  Wallet,
  PiggyBank,
  LineChart,
  ArrowUpRight,
  Receipt,
  Sparkles,
} from 'lucide-react';

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
        apiFetch<{ items: Transaction[] }>('/transactions/?limit=8'),
        apiFetch<RecurringItem[]>('/recurring/'),
      ]);

      setSummary(sumData);
      setAccounts(accsData);
      setTransactions(txsData.items || []);
      setRecurring(recData.slice(0, 5));
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Compute breakdown for Desktop Widget
  const totalBalance = accounts.reduce((acc, a) => acc + (parseFloat(String(a.current_balance)) || 0), 0);
  const liquidAccountsBalance = accounts
    .filter((a) => a.is_liquid)
    .reduce((acc, a) => acc + (parseFloat(String(a.current_balance)) || 0), 0);
  const savingsBalance = accounts
    .filter((a) => a.account_type === 'ahorro')
    .reduce((acc, a) => acc + (parseFloat(String(a.current_balance)) || 0), 0);
  const investmentsBalance = accounts
    .filter((a) => a.account_type === 'inversion')
    .reduce((acc, a) => acc + (parseFloat(String(a.current_balance)) || 0), 0);

  const liquidPct = totalBalance > 0 ? Math.round((liquidAccountsBalance / totalBalance) * 100) : 0;
  const savingsPct = totalBalance > 0 ? Math.round((savingsBalance / totalBalance) * 100) : 0;
  const investmentsPct = totalBalance > 0 ? Math.round((investmentsBalance / totalBalance) * 100) : 0;

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Dashboard Financiero
            </h1>
            <Badge geo className="hidden sm:inline-flex text-[10px]">
              ATELIER DESKTOP
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
            COMMAND CENTER • CONTROL DE LIQUIDEZ Y FLUJO DE EFECTIVO
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/transacciones">
            <Button size="md" variant="secondary" className="gap-2 font-bold px-4 py-2.5 text-xs">
              <Receipt className="w-4 h-4" />
              Movimientos
            </Button>
          </Link>
          <Link href="/cuentas">
            <Button size="md" variant="primary" className="gap-2 font-extrabold px-5 py-2.5 text-xs shadow-[0_2px_12px_rgba(254,157,1,0.3)] uppercase tracking-wider">
              <Plus className="w-4 h-4 stroke-[3]" />
              Nueva Cuenta
            </Button>
          </Link>
        </div>
      </div>

      {/* Section A: Balance Summary Cards (4-Column Widescreen Grid) */}
      <BalanceSummary summary={summary} loading={loading} />

      {/* Section B: Mis Cuentas Grid (Widescreen up to 5 cols) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[var(--accent-amber)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Mis Cuentas Bancarias</h2>
            <span className="text-xs font-mono text-[var(--text-muted)] font-bold">
              ({accounts.length})
            </span>
          </div>
          <Link
            href="/cuentas"
            className="text-xs font-bold text-[var(--accent-amber)] hover:opacity-80 flex items-center gap-1 transition-colors font-mono uppercase tracking-wider"
          >
            Gestionar cuentas
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {accounts.length === 0 && !loading ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">No tienes cuentas bancarias registradas.</p>
            <Link href="/cuentas" className="mt-3 inline-block">
              <Button size="sm" variant="primary">
                Crear primera cuenta
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {accounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} />
            ))}
          </div>
        )}
      </div>

      {/* Section C & D: Desktop Split Workstation (2/3 Ledger + 1/3 Analytics & Recurring) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {/* Left Col (2/3 or 3/4): Last 8 Transactions Desktop Ledger */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--accent-amber)]" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">Últimos Movimientos</h3>
            </div>
            <Link
              href="/transacciones"
              className="text-xs font-bold text-[var(--accent-amber)] hover:opacity-80 flex items-center gap-1 transition-colors font-mono uppercase tracking-wider"
            >
              Ver libro mayor completo
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

        {/* Right Col (1/3 or 1/4): Analytics & Recurring Widget */}
        <div className="space-y-6">
          {/* Liquidity Distribution Widget */}
          <Card bracket className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[var(--accent-amber)]" />
                <span className="text-xs font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
                  Distribución
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">
                {formatCurrency(totalBalance)}
              </span>
            </div>

            {/* Distribution Bar */}
            <div className="h-3 w-full rounded-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] overflow-hidden flex">
              <div
                style={{ width: `${liquidPct}%` }}
                className="bg-[var(--accent-success)] h-full"
                title={`Líquido: ${liquidPct}%`}
              />
              <div
                style={{ width: `${savingsPct}%` }}
                className="bg-[var(--accent-info)] h-full"
                title={`Ahorro: ${savingsPct}%`}
              />
              <div
                style={{ width: `${investmentsPct}%` }}
                className="bg-purple-500 h-full"
                title={`Inversión: ${investmentsPct}%`}
              />
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-success)]" />
                  <span className="text-[var(--text-secondary)] font-medium">Disponible Líquido</span>
                </div>
                <span className="font-mono font-bold text-[var(--text-primary)]">{liquidPct}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-info)]" />
                  <span className="text-[var(--text-secondary)] font-medium">Ahorros</span>
                </div>
                <span className="font-mono font-bold text-[var(--text-primary)]">{savingsPct}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-[var(--text-secondary)] font-medium">Inversiones</span>
                </div>
                <span className="font-mono font-bold text-[var(--text-primary)]">{investmentsPct}%</span>
              </div>
            </div>
          </Card>

          {/* Upcoming Recurring Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-[var(--accent-amber)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Próximos Recurrentes</h3>
              </div>
              <Link
                href="/recurrentes"
                className="text-[11px] font-bold text-[var(--accent-amber)] hover:opacity-80 flex items-center gap-1 transition-colors font-mono uppercase"
              >
                Ver todos
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recurring.length === 0 && !loading ? (
              <Card className="p-6 text-center text-xs text-[var(--text-muted)]">
                Sin pagos ni sueldos recurrentes pendientes.
              </Card>
            ) : (
              <div className="space-y-2">
                {recurring.map((item) => (
                  <Card key={item.id} lift className="p-3.5 flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-xs font-bold text-[var(--text-primary)] block truncate max-w-[150px]">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">
                        {item.frequency}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-extrabold ${
                        item.type === 'ingreso_fijo' ? 'text-[var(--accent-success)]' : 'text-[var(--text-primary)]'
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
      </div>

      {/* Floating Action Button for Quick Add */}
      <QuickAddFAB accounts={accounts} onSuccess={loadDashboardData} />
    </div>
  );
}
