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
          icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30',
          amountPrefix: '+',
          amountColor: 'text-emerald-400',
        };
      case 'transferencia':
        return {
          icon: <ArrowRightLeft className="w-4 h-4 text-sky-400" />,
          bgColor: 'bg-sky-500/10 border-sky-500/30',
          amountPrefix: '',
          amountColor: 'text-sky-400',
        };
      default:
        return {
          icon: <ArrowDownLeft className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30',
          amountPrefix: '-',
          amountColor: 'text-rose-400',
        };
    }
  };

  const details = getTypeDetails();

  return (
    <div className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
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
              <span className="text-sm font-semibold text-[#f5f5f5] line-clamp-1">
                {transaction.concept}
              </span>
              {transaction.is_recurring && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FE9D01]/10 text-[#FE9D01] font-mono border border-[#FE9D01]/20">
                  RECURRENTE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8a8a8a] mt-0.5">
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
            <span className={`text-sm font-bold font-mono ${details.amountColor}`}>
              {details.amountPrefix}
              {formatCurrency(transaction.amount)}
            </span>
            <span className="text-[11px] text-[#666] block">
              {formatRelativeDate(transaction.date)}
            </span>
          </div>
          <button className="text-[#666] hover:text-white p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 flex items-center justify-between text-xs text-[#8a8a8a] bg-black/20 border-t border-white/5">
          <div>
            {transaction.notes ? (
              <p className="italic text-[#aaa]">Nota: &ldquo;{transaction.notes}&rdquo;</p>
            ) : (
              <span className="text-[#555]">Sin notas adicionales</span>
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transaction.id);
              }}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium cursor-pointer p-1 rounded hover:bg-red-500/10 transition-colors"
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
