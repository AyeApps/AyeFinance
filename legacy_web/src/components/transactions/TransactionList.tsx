'use client';

import React from 'react';
import { Account, Transaction } from '@/types';
import { formatCurrency, formatRelativeDate, formatDate } from '@/lib/formatters';
import { TransactionRow } from './TransactionRow';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Receipt, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Trash2, Tag, Landmark } from 'lucide-react';

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
      <Card className="p-0 overflow-hidden divide-y divide-[var(--border-muted)]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-[var(--bg-secondary)] animate-pulse" />
        ))}
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center text-[var(--text-secondary)] mb-3">
          <Receipt className="w-6 h-6 text-[var(--accent-amber)]" />
        </div>
        <h4 className="text-sm font-bold text-[var(--text-primary)]">No hay movimientos registrados</h4>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
          Comienza agregando un ingreso, gasto o transferencia para visualizar tu flujo de efectivo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      {/* 1. Desktop Data Table View (hidden on mobile, visible on desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-muted)] bg-[var(--bg-secondary)]/80 text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Concepto</th>
              <th className="py-3 px-4">Cuenta</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4 text-right">Monto</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-muted)] text-xs">
            {transactions.map((tx) => {
              const originAcc = accountsMap[tx.account_id];
              const destAcc = tx.destination_account_id ? accountsMap[tx.destination_account_id] : null;

              const isIncome = tx.type === 'ingreso';
              const isTransfer = tx.type === 'transferencia';

              const amountColor = isIncome
                ? 'text-[var(--accent-success)]'
                : isTransfer
                ? 'text-[var(--accent-info)]'
                : 'text-[var(--text-primary)]';

              return (
                <tr
                  key={tx.id}
                  className="hover:bg-[var(--bg-secondary)]/60 transition-colors group"
                >
                  {/* Fecha */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[var(--text-secondary)]">
                    <span className="block font-semibold text-[var(--text-primary)]">{formatDate(tx.date)}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{formatRelativeDate(tx.date)}</span>
                  </td>

                  {/* Concepto & Notas */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)] truncate block">
                        {tx.concept}
                      </span>
                      {tx.is_recurring && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-amber-subtle)] text-[var(--accent-amber)] font-mono font-bold border border-[var(--accent-amber-border)] uppercase shrink-0">
                          Fijo
                        </span>
                      )}
                    </div>
                    {tx.notes && (
                      <span className="text-[10px] text-[var(--text-muted)] italic block truncate mt-0.5">
                        {tx.notes}
                      </span>
                    )}
                  </td>

                  {/* Cuenta */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: originAcc?.color || 'var(--accent-amber)' }}
                      />
                      <span className="text-[var(--text-secondary)] font-medium">
                        {originAcc?.name || 'Cuenta'}
                      </span>
                      {destAcc && (
                        <>
                          <span className="text-[var(--text-muted)] text-[10px]">→</span>
                          <span className="text-[var(--text-secondary)] font-medium">{destAcc.name}</span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Categoría */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge variant="neutral" className="text-[10px] py-0.5 px-2 font-mono">
                      {tx.category}
                    </Badge>
                  </td>

                  {/* Tipo */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase">
                      {isIncome ? (
                        <span className="flex items-center gap-1 text-[var(--accent-success)]">
                          <ArrowUpRight className="w-3 h-3" />
                          Ingreso
                        </span>
                      ) : isTransfer ? (
                        <span className="flex items-center gap-1 text-[var(--accent-info)]">
                          <ArrowRightLeft className="w-3 h-3" />
                          Traspaso
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--accent-danger)]">
                          <ArrowDownLeft className="w-3 h-3" />
                          Gasto
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Monto */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-extrabold text-sm">
                    <span className={amountColor}>
                      {isIncome ? '+' : isTransfer ? '' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {onDelete && (
                      <button
                        onClick={() => onDelete(tx.id)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger-subtle)] transition-colors cursor-pointer"
                        title="Eliminar movimiento"
                        aria-label="Eliminar movimiento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile Card Rows (visible on mobile, hidden on desktop) */}
      <div className="md:hidden divide-y divide-[var(--border-muted)]">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            accountsMap={accountsMap}
            onDelete={onDelete}
          />
        ))}
      </div>
    </Card>
  );
};
