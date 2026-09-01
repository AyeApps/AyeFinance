'use client';

import React from 'react';
import Link from 'next/link';
import { Account } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Landmark, PiggyBank, LineChart } from 'lucide-react';

interface AccountCardProps {
  account: Account;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account }) => {
  const getIcon = () => {
    switch (account.account_type) {
      case 'ahorro':
        return <PiggyBank className="w-4 h-4 text-sky-400" />;
      case 'inversion':
        return <LineChart className="w-4 h-4 text-purple-400" />;
      default:
        return <Landmark className="w-4 h-4 text-[var(--accent-success)]" />;
    }
  };

  return (
    <Link href={`/transacciones?account=${account.id}`} className="block group">
      <Card lift className="h-full flex flex-col justify-between relative overflow-hidden">
        {/* Accent Bar based on account color */}
        <div
          className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
          style={{ backgroundColor: account.color || 'var(--accent-amber)' }}
        />

        <div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-muted)]"
                style={{ borderColor: `${account.color}40` }}
              >
                {getIcon()}
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-amber)] transition-colors line-clamp-1">
                {account.name}
              </h4>
            </div>
            <Badge geo className="text-[10px]">
              {account.account_type}
            </Badge>
          </div>

          <div className="mt-4">
            <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-mono font-bold tracking-wider">Saldo Actual</span>
            <div className="text-xl font-extrabold font-mono text-[var(--text-primary)] mt-0.5">
              {formatCurrency(account.current_balance, account.currency)}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-muted)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span className="font-mono text-[11px]">Proyectado (30d):</span>
          <span className="font-mono font-bold text-[var(--accent-amber)]">
            {formatCurrency(account.projected_balance, account.currency)}
          </span>
        </div>
      </Card>
    </Link>
  );
};
