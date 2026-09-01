'use client';

import React from 'react';
import { AccountSummary } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Wallet, ShieldCheck, TrendingUp } from 'lucide-react';

interface BalanceSummaryProps {
  summary: AccountSummary | null;
  loading?: boolean;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({ summary, loading = false }) => {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-[#0d0d0d] border border-white/10 animate-pulse p-5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Disponible Líquido */}
      <Card lift bracket className="flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
            Disponible Líquido
          </span>
          <Badge variant="green" className="gap-1">
            <Wallet className="w-3.5 h-3.5" />
            Líquido
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-emerald-400">
            {formatCurrency(summary.liquid_total)}
          </div>
          <span className="text-xs text-[#666] mt-1 block">
            Dinero real listo para gastar sin tocar ahorros
          </span>
        </div>
      </Card>

      {/* 2. Total con Ahorros */}
      <Card lift bracket className="flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
            Total con Ahorros
          </span>
          <Badge variant="blue" className="gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Patrimonio
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-[#f5f5f5]">
            {formatCurrency(summary.grand_total)}
          </div>
          <span className="text-xs text-[#666] mt-1 block">
            Suma de todas tus {summary.accounts_count} cuentas activas
          </span>
        </div>
      </Card>

      {/* 3. Gran Total Proyectado */}
      <Card lift bracket glow className="flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
            Total Proyectado (30 Días)
          </span>
          <Badge variant="amber" className="gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Cash Flow
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-[#FE9D01]">
            {formatCurrency(summary.projected_grand_total)}
          </div>
          <span className="text-xs text-[#FE9D01]/70 mt-1 block">
            Estimado considerando ingresos y gastos recurrentes
          </span>
        </div>
      </Card>
    </div>
  );
};
