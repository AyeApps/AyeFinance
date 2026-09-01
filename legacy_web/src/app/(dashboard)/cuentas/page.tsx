'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Account, AccountType } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Plus, Edit2, Trash2, Landmark, PiggyBank, LineChart } from 'lucide-react';

const COLORS = [
  '#FE9D01', // Cyber-Amber
  '#00e676', // Emerald
  '#00b0ff', // Sky Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ff1744', // Rose/Red
  '#64748b', // Slate
  '#14b8a6', // Teal
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('corriente');
  const [currency, setCurrency] = useState('MXN');
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [isLiquid, setIsLiquid] = useState(true);
  const [color, setColor] = useState(COLORS[0]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<Account[]>('/accounts/');
      setAccounts(data);
    } catch (err) {
      console.error('Error cargando cuentas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setAccountType('corriente');
    setCurrency('MXN');
    setInitialBalance('0.00');
    setIsLiquid(true);
    setColor(COLORS[0]);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setAccountType(acc.account_type);
    setCurrency(acc.currency);
    setInitialBalance(String(acc.current_balance));
    setIsLiquid(acc.is_liquid);
    setColor(acc.color || COLORS[0]);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Ingresa el nombre de la cuenta.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingAccount) {
        await apiFetch(`/accounts/${editingAccount.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            account_type: accountType,
            currency,
            is_liquid: isLiquid,
            color,
          }),
        });
      } else {
        await apiFetch('/accounts/', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            account_type: accountType,
            currency,
            initial_balance: parseFloat(initialBalance) || 0,
            is_liquid: isLiquid,
            color,
          }),
        });
      }
      setModalOpen(false);
      loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Error al guardar cuenta.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta cuenta? Los registros asociados serán archivados.')) return;
    try {
      await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar cuenta');
    }
  };

  // Compute totals
  const totalBalance = accounts.reduce((acc, a) => acc + (parseFloat(String(a.current_balance)) || 0), 0);
  const liquidBalance = accounts
    .filter((a) => a.is_liquid)
    .reduce((acc, a) => acc + (parseFloat(String(a.current_balance)) || 0), 0);
  const totalProjected = accounts.reduce((acc, a) => acc + (parseFloat(String(a.projected_balance)) || 0), 0);
  const savingsAndInv = accounts
    .filter((a) => a.account_type === 'ahorro' || a.account_type === 'inversion')
    .reduce((acc, a) => acc + (parseFloat(String(a.current_balance)) || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Gestión de Cuentas
            </h1>
            <Badge geo className="hidden sm:inline-flex text-[10px]">
              {accounts.length} ACTIVAS
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono uppercase">
            Billeteras, cuentas de débito, fondos de ahorro e inversiones
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          size="md"
          className="gap-2 font-extrabold px-5 py-2.5 shadow-[0_2px_12px_rgba(254,157,1,0.3)] uppercase tracking-wider text-xs"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nueva Cuenta
        </Button>
      </div>

      {/* Top Desktop Analytics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card bracket className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
            Total Consolidado
          </span>
          <div className="text-2xl font-mono font-extrabold text-[var(--text-primary)] mt-1">
            {formatCurrency(totalBalance)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            En todas tus cuentas
          </span>
        </Card>

        <Card bracket className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-success)]">
            Disponible Líquido
          </span>
          <div className="text-2xl font-mono font-extrabold text-[var(--accent-success)] mt-1">
            {formatCurrency(liquidBalance)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Fondos para uso diario
          </span>
        </Card>

        <Card bracket className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-info)]">
            Ahorro e Inversión
          </span>
          <div className="text-2xl font-mono font-extrabold text-[var(--accent-info)] mt-1">
            {formatCurrency(savingsAndInv)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            Capital reservado
          </span>
        </Card>

        <Card bracket glow className="p-4 flex flex-col justify-between border-[var(--accent-amber-border)]">
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-amber)]">
            Proyección a 30 Días
          </span>
          <div className="text-2xl font-mono font-extrabold text-[var(--accent-amber)] mt-1">
            {formatCurrency(totalProjected)}
          </div>
          <span className="text-[10px] text-[var(--accent-amber)]/80 mt-1">
            Estimado con recurrentes
          </span>
        </Card>
      </div>

      {/* Grid of Accounts (Widescreen 4 columns) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-muted)] animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center text-[var(--text-secondary)] mx-auto mb-3">
            <Landmark className="w-6 h-6 text-[var(--accent-amber)]" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Sin cuentas creadas</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
            Crea una cuenta bancaria o de efectivo para comenzar a registrar movimientos.
          </p>
          <Button onClick={openCreateModal} size="sm" className="mt-4">
            Crear Cuenta Ahora
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {accounts.map((acc) => (
            <Card key={acc.id} lift className="flex flex-col justify-between relative overflow-hidden p-5">
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: acc.color || 'var(--accent-amber)' }}
              />

              <div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center shrink-0">
                      {acc.account_type === 'ahorro' ? (
                        <PiggyBank className="w-4 h-4 text-sky-400" />
                      ) : acc.account_type === 'inversion' ? (
                        <LineChart className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Landmark className="w-4 h-4 text-[var(--accent-success)]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">{acc.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono font-bold">{acc.currency}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">•</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                          {acc.is_liquid ? 'LÍQUIDA' : 'PATRIMONIO'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger-subtle)] transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-mono font-bold tracking-wider">Saldo Actual</span>
                  <div className="text-2xl font-extrabold font-mono text-[var(--text-primary)] mt-0.5">
                    {formatCurrency(acc.current_balance, acc.currency)}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-[var(--border-muted)] flex items-center justify-between text-xs">
                <Badge geo className="text-[10px]">
                  {acc.account_type}
                </Badge>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-muted)] block font-mono">Proyectado (30d)</span>
                  <span className="font-mono font-bold text-[var(--accent-amber)]">
                    {formatCurrency(acc.projected_balance, acc.currency)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Nueva / Editar Cuenta */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {error && (
            <div className="p-3 rounded-lg bg-[var(--accent-danger-subtle)] border border-[var(--accent-danger-border)] text-[var(--accent-danger)] text-xs font-semibold">
              {error}
            </div>
          )}

          <Input
            label="Nombre de la Cuenta"
            placeholder="Ej: Scotiabank Nómina, Efectivo, Mercado Pago"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Dropdown
              label="Tipo de Cuenta"
              options={[
                { value: 'corriente', label: 'Corriente / Débito' },
                { value: 'ahorro', label: 'Ahorro' },
                { value: 'inversion', label: 'Inversión' },
              ]}
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
            />

            <Dropdown
              label="Divisa"
              options={[
                { value: 'MXN', label: 'MXN (Pesos)' },
                { value: 'USD', label: 'USD (Dólares)' },
                { value: 'EUR', label: 'EUR (Euros)' },
              ]}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>

          {!editingAccount && (
            <Input
              label="Saldo Inicial"
              type="number"
              step="0.01"
              min="0.00"
              prefixSymbol="$"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              required
            />
          )}

          {/* Color Picker Palette */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-secondary)] font-mono uppercase font-bold tracking-wider">Color de Identificación</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border transition-all cursor-pointer ${
                    color === c ? 'scale-110 border-[var(--text-primary)] ring-2 ring-[var(--accent-amber)]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Toggle Liquid */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-muted)] mt-1">
            <div>
              <span className="text-xs font-bold text-[var(--text-primary)] block">¿Cuenta de Dinero Líquido?</span>
              <span className="text-[10px] text-[var(--text-muted)] block">
                Cuenta para el indicador de &ldquo;Disponible Líquido para gastar&rdquo;
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLiquid(!isLiquid)}
              className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                isLiquid ? 'bg-[var(--accent-amber)]' : 'bg-[var(--border-muted)]'
              }`}
              aria-label="Toggle líquida"
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  isLiquid ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-[var(--border-muted)]">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              {editingAccount ? 'Actualizar Cuenta' : 'Crear Cuenta'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
