'use client';

import React from 'react';
import { AccountSummary } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Wallet, ShieldCheck, TrendingUp, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface BalanceSummaryProps {
  summary: AccountSummary | null;
  loading?: boolean;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({ summary, loading = false }) => {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-muted)] animate-pulse p-5" />
        ))}
      </div>
    );
  }

  const liquidNumber = parseFloat(String(summary.liquid_total)) || 0;
  const grandNumber = parseFloat(String(summary.grand_total)) || 0;
  const projectedNumber = parseFloat(String(summary.projected_grand_total)) || 0;
  const netDelta = projectedNumber - grandNumber;
  const liquidRatio = grandNumber > 0 ? Math.round((liquidNumber / grandNumber) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Disponible Líquido */}
      <Card lift bracket className="flex flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
            Disponible Líquido
          </span>
          <Badge variant="green" className="gap-1 text-[10px]">
            <Wallet className="w-3 h-3" />
            {liquidRatio}% total
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-[var(--accent-success)]">
            {formatCurrency(summary.liquid_total)}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block truncate">
            Fondos para gastos inmediatos
          </span>
        </div>
      </Card>

      {/* 2. Total con Ahorros / Patrimonio */}
      <Card lift bracket className="flex flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
            Patrimonio Total
          </span>
          <Badge variant="blue" className="gap-1 text-[10px]">
            <ShieldCheck className="w-3 h-3" />
            Consolidado
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-[var(--text-primary)]">
            {formatCurrency(summary.grand_total)}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block truncate">
            Suma global de tus fondos
          </span>
        </div>
      </Card>

      {/* 3. Resumen de Cuentas */}
      <Card lift bracket className="flex flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
            Cuentas Activas
          </span>
          <Badge variant="neutral" className="gap-1 text-[10px]">
            <Landmark className="w-3 h-3" />
            {summary.accounts_count} {summary.accounts_count === 1 ? 'cuenta' : 'cuentas'}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-[var(--text-primary)]">
            {summary.accounts_count} <span className="text-sm font-semibold text-[var(--text-muted)]">activas</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block truncate">
            Bancarias, ahorros e inversión
          </span>
        </div>
      </Card>

      {/* 4. Gran Total Proyectado */}
      <Card lift bracket glow className="flex flex-col justify-between p-5 border-[var(--accent-amber-border)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
            Proyección (30 Días)
          </span>
          <Badge variant="amber" className="gap-1 text-[10px]">
            {netDelta >= 0 ? <ArrowUpRight className="w-3 h-3 text-[var(--accent-success)]" /> : <ArrowDownRight className="w-3 h-3 text-[var(--accent-danger)]" />}
            {netDelta >= 0 ? `+${formatCurrency(netDelta)}` : formatCurrency(netDelta)}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-[var(--accent-amber)]">
            {formatCurrency(summary.projected_grand_total)}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block truncate">
            Balance tras ingresos y gastos fijos
          </span>
        </div>
      </Card>
    </div>
  );
};
