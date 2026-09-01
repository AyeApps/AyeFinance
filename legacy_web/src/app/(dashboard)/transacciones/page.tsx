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
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [modalOpen, setModalOpen] = useState(searchParams.get('nuevo') === '1');

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

  // Compute period totals from loaded transactions
  const totalIncome = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'gasto')
    .reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);
  const netPeriod = totalIncome - totalExpense;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Historial de Movimientos
            </h1>
            <Badge geo className="hidden sm:inline-flex text-[10px]">
              LEDGER ACTIVO
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
            {total} TRANSACCIONES REGISTRADAS EN TOTAL
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          size="md"
          className="gap-2 font-extrabold px-5 py-2.5 shadow-[0_2px_12px_rgba(254,157,1,0.3)] uppercase tracking-wider text-xs"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Top Desktop Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card bracket className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-success)]">
            Total Ingresos (Página)
          </span>
          <div className="text-2xl font-mono font-extrabold text-[var(--accent-success)] mt-1">
            +${totalIncome.toFixed(2)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Entradas de dinero
          </span>
        </Card>

        <Card bracket className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-danger)]">
            Total Gastos (Página)
          </span>
          <div className="text-2xl font-mono font-extrabold text-[var(--accent-danger)] mt-1">
            -${totalExpense.toFixed(2)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Salidas y consumos
          </span>
        </Card>

        <Card bracket glow className="p-4 flex flex-col justify-between border-[var(--accent-amber-border)]">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-amber)]">
            Balance Neto (Página)
          </span>
          <div className={`text-2xl font-mono font-extrabold mt-1 ${netPeriod >= 0 ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'}`}>
            {netPeriod >= 0 ? `+$${netPeriod.toFixed(2)}` : `-$${Math.abs(netPeriod).toFixed(2)}`}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Flujo neto del conjunto actual
          </span>
        </Card>
      </div>

      {/* Filter Bar (Desktop Multi-Column) */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-muted)] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por concepto o notas..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-muted)] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-amber)]"
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
          <div className="flex items-center justify-end">
            {(selectedAccount || selectedType || search) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedAccount('');
                  setSelectedType('');
                  setSearch('');
                  setPage(1);
                }}
                className="gap-1 text-xs text-[var(--accent-amber)] font-bold w-full justify-center"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar Filtros
              </Button>
            ) : (
              <div className="text-[11px] font-mono text-[var(--text-muted)] text-right w-full pr-2">
                Filtros listos
              </div>
            )}
          </div>
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-muted)] overflow-x-auto">
          <span className="text-[11px] text-[var(--text-secondary)] font-bold mr-1 flex items-center gap-1 font-mono uppercase shrink-0">
            <Filter className="w-3 h-3" />
            Tipo:
          </span>
          {[
            { value: '', label: 'Todos los tipos' },
            { value: 'ingreso', label: 'Ingresos (+)' },
            { value: 'gasto', label: 'Gastos (-)' },
            { value: 'transferencia', label: 'Traspasos (⇄)' },
          ].map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setSelectedType(chip.value as any);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedType === chip.value
                  ? 'bg-[var(--accent-amber)] text-black font-bold shadow-[0_1px_6px_rgba(254,157,1,0.3)]'
                  : 'bg-[var(--bg-card)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-amber)]'
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
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-muted)] text-xs text-[var(--text-secondary)] font-mono">
          <span>
            PÁGINA {page} DE {pages}
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
