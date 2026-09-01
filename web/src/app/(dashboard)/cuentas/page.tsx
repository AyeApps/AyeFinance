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
  '#10B981', // Emerald
  '#0EA5E9', // Sky Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#64748B', // Slate
  '#14B8A6', // Teal
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

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">Gestión de Cuentas</h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            Cuentas corrientes, de ahorro e inversión para seguimiento financiero
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </Button>
      </div>

      {/* Grid of Accounts */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-[#0d0d0d] rounded-xl border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8a8a8a] mx-auto mb-3">
            <Landmark className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#f5f5f5]">Sin cuentas creadas</h3>
          <p className="text-xs text-[#666] mt-1 max-w-sm mx-auto">
            Crea una cuenta bancaria o de efectivo para comenzar a registrar movimientos.
          </p>
          <Button onClick={openCreateModal} size="sm" className="mt-4">
            Crear Cuenta Ahora
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} lift className="flex flex-col justify-between relative overflow-hidden p-5">
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: acc.color || '#FE9D01' }}
              />

              <div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      {acc.account_type === 'ahorro' ? (
                        <PiggyBank className="w-4 h-4 text-sky-400" />
                      ) : acc.account_type === 'inversion' ? (
                        <LineChart className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Landmark className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#f5f5f5] line-clamp-1">{acc.name}</h3>
                      <span className="text-[10px] text-[#8a8a8a] uppercase">{acc.currency}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="p-1.5 rounded-lg text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-white/5 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-1.5 rounded-lg text-[#8a8a8a] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-[11px] text-[#8a8a8a] block uppercase font-medium">Saldo Actual</span>
                  <div className="text-2xl font-bold font-mono text-[#f5f5f5] mt-0.5">
                    {formatCurrency(acc.current_balance, acc.currency)}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <Badge geo className="text-[10px]">
                  {acc.account_type}
                </Badge>
                <div className="text-right">
                  <span className="text-[10px] text-[#8a8a8a] block">Proyectado (30d)</span>
                  <span className="font-mono font-semibold text-[#FE9D01]">
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
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
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
            <label className="text-xs text-[#8a8a8a] font-medium">Color de Identificación</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border transition-all cursor-pointer ${
                    color === c ? 'scale-110 border-white ring-2 ring-white/30' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Toggle Liquid */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 mt-1">
            <div>
              <span className="text-xs font-semibold text-[#f5f5f5] block">¿Cuenta de Dinero Líquido?</span>
              <span className="text-[10px] text-[#8a8a8a] block">
                Cuenta para el indicador de &ldquo;Disponible Líquido para gastar&rdquo;
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLiquid(!isLiquid)}
              className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                isLiquid ? 'bg-[#FE9D01]' : 'bg-white/20'
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

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
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
