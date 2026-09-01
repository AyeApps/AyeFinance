'use client';

import React, { useState } from 'react';
import { Account, Transaction } from '@/types';
import { formatCurrency, formatRelativeDate } from '@/lib/formatters';
import { Badge } from '../ui/Badge';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface TransactionRowProps {
  transaction: Transaction;
  accountsMap: Record<string, Account>;
  onDelete?: (id: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  accountsMap,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const originAccount = accountsMap[transaction.account_id];
  const destAccount = transaction.destination_account_id
    ? accountsMap[transaction.destination_account_id]
    : null;

  const getTypeDetails = () => {
    switch (transaction.type) {
      case 'ingreso':
        return {
          icon: <ArrowUpRight className="w-4 h-4 text-[var(--accent-success)]" />,
          bgColor: 'bg-[var(--accent-success-subtle)] border-[var(--accent-success-border)]',
          amountPrefix: '+',
          amountColor: 'text-[var(--accent-success)]',
        };
      case 'transferencia':
        return {
          icon: <ArrowRightLeft className="w-4 h-4 text-[var(--accent-info)]" />,
          bgColor: 'bg-[var(--accent-info-subtle)] border-[var(--border-muted)]',
          amountPrefix: '',
          amountColor: 'text-[var(--accent-info)]',
        };
      default:
        return {
          icon: <ArrowDownLeft className="w-4 h-4 text-[var(--accent-danger)]" />,
          bgColor: 'bg-[var(--accent-danger-subtle)] border-[var(--accent-danger-border)]',
          amountPrefix: '-',
          amountColor: 'text-[var(--accent-danger)]',
        };
    }
  };

  const details = getTypeDetails();

  return (
    <div className="border-b border-[var(--border-muted)] last:border-0 hover:bg-[var(--bg-secondary)]/50 transition-colors">
      <div
        className="flex items-center justify-between p-3.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Icon Badge */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${details.bgColor}`}
          >
            {details.icon}
          </div>

          {/* Title & Account */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                {transaction.concept}
              </span>
              {transaction.is_recurring && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-amber-subtle)] text-[var(--accent-amber)] font-mono font-bold border border-[var(--accent-amber-border)]">
                  RECURRENTE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
              <span>{originAccount ? originAccount.name : 'Cuenta'}</span>
              {destAccount && (
                <>
                  <span>→</span>
                  <span>{destAccount.name}</span>
                </>
              )}
              <span>•</span>
              <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                {transaction.category}
              </Badge>
            </div>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="text-right flex items-center gap-3">
          <div>
            <span className={`text-sm font-extrabold font-mono ${details.amountColor}`}>
              {details.amountPrefix}
              {formatCurrency(transaction.amount)}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block font-mono">
              {formatRelativeDate(transaction.date)}
            </span>
          </div>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 flex items-center justify-between text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] border-t border-[var(--border-muted)]">
          <div>
            {transaction.notes ? (
              <p className="italic text-[var(--text-secondary)]">Nota: &ldquo;{transaction.notes}&rdquo;</p>
            ) : (
              <span className="text-[var(--text-muted)]">Sin notas adicionales</span>
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transaction.id);
              }}
              className="flex items-center gap-1 text-[var(--accent-danger)] hover:opacity-80 font-bold cursor-pointer p-1 rounded hover:bg-[var(--accent-danger-subtle)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
};
