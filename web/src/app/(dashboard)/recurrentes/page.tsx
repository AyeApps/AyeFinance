'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Account, RecurringItem, RecurringType } from '@/types';
import { RecurringList } from '@/components/recurring/RecurringList';
import { RecurringForm } from '@/components/recurring/RecurringForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Plus, CalendarClock } from 'lucide-react';

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

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#FE9D01]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">
              Ingresos y Gastos Recurrentes
            </h1>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            Automatiza tu flujo de efectivo futuro y proyecta tus saldos bancarios
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nuevo Recurrente
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'ingreso_fijo', label: 'Ingresos Fijos' },
          { key: 'gasto_fijo', label: 'Gastos Fijos' },
          { key: 'mensualidad', label: 'Mensualidades' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedTab === tab.key
                ? 'bg-[#FE9D01] text-black font-semibold shadow-[0_2px_8px_rgba(254,157,1,0.25)]'
                : 'text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-white/5'
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
