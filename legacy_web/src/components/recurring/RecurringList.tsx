'use client';

import React, { useState } from 'react';
import { Account, RecurringItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { apiFetch } from '@/lib/api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CalendarClock, CheckCircle2, Play, Trash2 } from 'lucide-react';

interface RecurringListProps {
  items: RecurringItem[];
  accounts: Account[];
  loading?: boolean;
  onRefresh: () => void;
}

export const RecurringList: React.FC<RecurringListProps> = ({
  items,
  accounts,
  loading = false,
  onRefresh,
}) => {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const accountsMap = accounts.reduce((acc, a) => {
    acc[a.id] = a;
    return acc;
  }, {} as Record<string, Account>);

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      await apiFetch(`/recurring/${id}/apply`, { method: 'POST' });
      setSuccessMessage('✓ Movimiento aplicado como transacción');
      setTimeout(() => setSuccessMessage(null), 3500);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al aplicar movimiento');
    } finally {
      setApplyingId(null);
    }
  };

  const handleToggle = async (item: RecurringItem) => {
    try {
      await apiFetch(`/recurring/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este elemento recurrente?')) return;
    try {
      await apiFetch(`/recurring/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-muted)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center text-[var(--text-secondary)] mb-3">
          <CalendarClock className="w-6 h-6 text-[var(--accent-amber)]" />
        </div>
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Sin recurrentes configurados</h4>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
          Agrega tus sueldos fijos, servicios mensuales o suscripciones para proyectar tu saldo futuro.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {successMessage && (
        <div className="p-3 rounded-xl bg-[var(--accent-success-subtle)] border border-[var(--accent-success-border)] text-[var(--accent-success)] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {items.map((item) => {
        const acc = accountsMap[item.account_id];
        const isIncome = item.type === 'ingreso_fijo';

        return (
          <Card
            key={item.id}
            lift
            className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
              !item.is_active ? 'opacity-50 grayscale' : ''
            }`}
          >
            {/* Left info */}
            <div className="flex items-center gap-3 text-left">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  isIncome
                    ? 'bg-[var(--accent-success-subtle)] border-[var(--accent-success-border)] text-[var(--accent-success)]'
                    : 'bg-[var(--accent-danger-subtle)] border-[var(--accent-danger-border)] text-[var(--accent-danger)]'
                }`}
              >
                <CalendarClock className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.name}</h4>
                  <Badge variant={isIncome ? 'green' : 'amber'} className="text-[10px]">
                    {item.frequency}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                  <span>{acc ? acc.name : 'Cuenta'}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px]">Próximo: {formatDate(item.next_date)}</span>
                </div>
              </div>
            </div>

            {/* Right actions & amount */}
            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
              <div className="text-left md:text-right">
                <span
                  className={`text-base font-extrabold font-mono ${
                    isIncome ? 'text-[var(--accent-success)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(item.amount)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block uppercase tracking-wider font-mono">
                  {item.type.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={applyingId === item.id}
                  onClick={() => handleApply(item.id)}
                  title="Aplicar transacción ahora y avanzar fecha"
                  className="gap-1 text-xs font-bold"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Aplicar
                </Button>

                {/* Toggle Active */}
                <button
                  onClick={() => handleToggle(item)}
                  className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                    item.is_active ? 'bg-[var(--accent-amber)]' : 'bg-[var(--border-muted)]'
                  }`}
                  aria-label="Toggle activo"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform ${
                      item.is_active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger-subtle)] transition-colors cursor-pointer"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
