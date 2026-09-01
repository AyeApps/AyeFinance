'use client';

import React from 'react';
import { Account, Transaction } from '@/types';
import { TransactionRow } from './TransactionRow';
import { Card } from '../ui/Card';
import { Receipt } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  loading?: boolean;
  onDelete?: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  loading = false,
  onDelete,
}) => {
  const accountsMap = accounts.reduce((acc, a) => {
    acc[a.id] = a;
    return acc;
  }, {} as Record<string, Account>);

  if (loading) {
    return (
      <Card className="p-0 overflow-hidden divide-y divide-white/5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-[#0d0d0d] animate-pulse" />
        ))}
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8a8a8a] mb-3">
          <Receipt className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-[#f5f5f5]">No hay movimientos registrados</h4>
        <p className="text-xs text-[#666] mt-1 max-w-xs">
          Comienza agregando un ingreso, gasto o transferencia para visualizar tu flujo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden divide-y divide-white/5">
      {transactions.map((tx) => (
        <TransactionRow
          key={tx.id}
          transaction={tx}
          accountsMap={accountsMap}
          onDelete={onDelete}
        />
      ))}
    </Card>
  );
};
