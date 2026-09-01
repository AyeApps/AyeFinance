'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Account, RecurringItem, RecurringType } from '@/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { RecurringList } from '@/components/recurring/RecurringList';
import { RecurringForm } from '@/components/recurring/RecurringForm';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Plus, CalendarClock, ArrowUpRight, ArrowDownLeft, Clock, ShieldCheck } from 'lucide-react';

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<RecurringType | 'todos'>('todos');
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [recData, accsData] = await Promise.all([
        apiFetch<RecurringItem[]>('/recurring/'),
        apiFetch<Account[]>('/accounts/'),
      ]);
      setItems(recData);
      setAccounts(accsData);
    } catch (err) {
      console.error('Error cargando recurrentes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = selectedTab === 'todos' ? items : items.filter((i) => i.type === selectedTab);

  // Compute fixed cashflow summary
  const totalFixedIncome = items
    .filter((i) => i.is_active && i.type === 'ingreso_fijo')
    .reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);
  const totalFixedExpenses = items
    .filter((i) => i.is_active && (i.type === 'gasto_fijo' || i.type === 'mensualidad'))
    .reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0);
  const netFixedFlow = totalFixedIncome - totalFixedExpenses;

  // Chronological upcoming events for Desktop Timeline
  const sortedUpcoming = [...items]
    .filter((i) => i.is_active)
    .sort((a, b) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime());

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Ingresos y Gastos Recurrentes
            </h1>
            <Badge geo className="hidden sm:inline-flex text-[10px]">
              {items.filter((i) => i.is_active).length} ACTIVOS
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono uppercase">
            Automatización de flujo de efectivo • Proyección bancaria mensual
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          size="md"
          className="gap-2 font-extrabold px-5 py-2.5 shadow-[0_2px_12px_rgba(254,157,1,0.3)] uppercase tracking-wider text-xs"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nuevo Recurrente
        </Button>
      </div>

      {/* Top Desktop Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card bracket className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-success)]">
              Ingresos Fijos Mensuales
            </span>
            <ArrowUpRight className="w-4 h-4 text-[var(--accent-success)]" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-[var(--accent-success)] mt-1">
            +${totalFixedIncome.toFixed(2)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Sueldos, rentas y cobros programados
          </span>
        </Card>

        <Card bracket className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-danger)]">
              Gastos y Suscripciones Fijas
            </span>
            <ArrowDownLeft className="w-4 h-4 text-[var(--accent-danger)]" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-[var(--accent-danger)] mt-1">
            -${totalFixedExpenses.toFixed(2)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Servicios, mensualidades y pagos fijos
          </span>
        </Card>

        <Card bracket glow className="p-4 flex flex-col justify-between border-[var(--accent-amber-border)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-amber)]">
              Flujo Fijo Neto
            </span>
            <ShieldCheck className="w-4 h-4 text-[var(--accent-amber)]" />
          </div>
          <div className={`text-2xl font-mono font-extrabold mt-1 ${netFixedFlow >= 0 ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'}`}>
            {netFixedFlow >= 0 ? `+$${netFixedFlow.toFixed(2)}` : `-$${Math.abs(netFixedFlow).toFixed(2)}`}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Margen de ahorro o compromiso fijo
          </span>
        </Card>
      </div>

      {/* 2-Column Desktop Widescreen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {/* Left Col (2/3 or 3/4): Main Tabs and List */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--border-muted)] pb-2 overflow-x-auto">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'ingreso_fijo', label: 'Ingresos Fijos' },
              { key: 'gasto_fijo', label: 'Gastos Fijos' },
              { key: 'mensualidad', label: 'Mensualidades' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedTab === tab.key
                    ? 'bg-[var(--accent-amber)] text-black font-bold shadow-[0_2px_8px_rgba(254,157,1,0.25)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Recurring Items List */}
          <RecurringList
            items={filteredItems}
            accounts={accounts}
            loading={loading}
            onRefresh={loadData}
          />

          {/* Large Rectangular Add Service Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-4 px-6 rounded-2xl bg-[var(--accent-amber)] hover:bg-[var(--accent-amber-hover)] text-black font-black text-xs sm:text-sm uppercase tracking-widest font-mono flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(254,157,1,0.4)] btn-press cursor-pointer transition-all border-2 border-black/15 mt-4 select-none"
          >
            <div className="w-6 h-6 rounded-md bg-black text-[var(--accent-amber)] flex items-center justify-center font-black">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span>+ Agregar Servicio o Suscripción Recurrente</span>
          </button>
        </div>

        {/* Right Col (1/3 or 1/4): Desktop Schedule Timeline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--accent-amber)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
              Cronograma de Pagos
            </h3>
          </div>

          <Card bracket className="p-4 space-y-3">
            {sortedUpcoming.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">
                No hay pagos ni cobros programados activos.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedUpcoming.slice(0, 6).map((item) => {
                  const isInc = item.type === 'ingreso_fijo';
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block truncate max-w-[140px]">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {formatDate(item.next_date)}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-extrabold text-xs ${
                          isInc ? 'text-[var(--accent-success)]' : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {isInc ? '+' : '-'}${parseFloat(String(item.amount)).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Nuevo Recurrente */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Elemento Recurrente">
        <RecurringForm
          accounts={accounts}
          onSuccess={() => {
            setModalOpen(false);
            loadData();
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
