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
        return <Landmark className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <Link href={`/transacciones?account=${account.id}`} className="block group">
      <Card lift className="h-full flex flex-col justify-between relative overflow-hidden">
        {/* Accent Bar based on account color */}
        <div
          className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
          style={{ backgroundColor: account.color || '#FE9D01' }}
        />

        <div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10"
                style={{ borderColor: `${account.color}40` }}
              >
                {getIcon()}
              </div>
              <h4 className="text-sm font-semibold text-[#f5f5f5] group-hover:text-[#FE9D01] transition-colors line-clamp-1">
                {account.name}
              </h4>
            </div>
            <Badge geo className="text-[10px]">
              {account.account_type}
            </Badge>
          </div>

          <div className="mt-4">
            <span className="text-[11px] text-[#8a8a8a] block uppercase font-medium">Saldo Actual</span>
            <div className="text-xl font-bold font-mono text-[#f5f5f5] mt-0.5">
              {formatCurrency(account.current_balance, account.currency)}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#8a8a8a]">
          <span>Proyectado (30d):</span>
          <span className="font-mono font-medium text-[#FE9D01]">
            {formatCurrency(account.projected_balance, account.currency)}
          </span>
        </div>
      </Card>
    </Link>
  );
};
