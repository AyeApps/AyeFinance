'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Account, PaginatedResponse, Transaction, TransactionType } from '@/types';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { Plus, Search, Filter, X } from 'lucide-react';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const accountParam = searchParams.get('account') || '';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [selectedAccount, setSelectedAccount] = useState(accountParam);
  const [selectedType, setSelectedType] = useState<TransactionType | ''>('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<Account[]>('/accounts/');
      setAccounts(data);
    } catch (err) {
      console.error('Error cargando cuentas:', err);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (selectedAccount) params.set('account_id', selectedAccount);
      if (selectedType) params.set('type', selectedType);
      if (search.trim()) params.set('search', search.trim());

      const data = await apiFetch<PaginatedResponse<Transaction>>(`/transactions/?${params.toString()}`);
      setTransactions(data.items || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Error cargando transacciones:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedAccount, selectedType, search]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este movimiento? El saldo de la cuenta será restablecido.')) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      loadTransactions();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const accountOptions = [
    { value: '', label: 'Todas las cuentas' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">Historial de Movimientos</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            {total} transacciones registradas en total
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#0d0d0d] border border-white/10 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8a8a8a] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por concepto..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#121212] border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#FE9D01]"
            />
          </div>

          {/* Account selector */}
          <Dropdown
            options={accountOptions}
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setPage(1);
            }}
            className="py-2 text-xs"
          />

          {/* Clear Filters Button */}
          {(selectedAccount || selectedType || search) && (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedAccount('');
                  setSelectedType('');
                  setSearch('');
                  setPage(1);
                }}
                className="gap-1 text-xs text-[#FE9D01]"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar Filtros
              </Button>
            </div>
          )}
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
          <span className="text-[11px] text-[#8a8a8a] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Tipo:
          </span>
          {[
            { value: '', label: 'Todos' },
            { value: 'ingreso', label: 'Ingresos' },
            { value: 'gasto', label: 'Gastos' },
            { value: 'transferencia', label: 'Traspasos' },
          ].map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setSelectedType(chip.value as any);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                selectedType === chip.value
                  ? 'bg-[#FE9D01] text-black font-semibold'
                  : 'bg-white/5 text-[#8a8a8a] hover:bg-white/10 hover:text-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <TransactionList
        transactions={transactions}
        accounts={accounts}
        loading={loading}
        onDelete={handleDelete}
      />

      {/* Pagination Controls */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-[#8a8a8a]">
          <span>
            Página {page} de {pages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal Nueva Transacción */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Movimiento" maxWidth="lg">
        <TransactionForm
          accounts={accounts}
          onSuccess={() => {
            setModalOpen(false);
            loadTransactions();
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
