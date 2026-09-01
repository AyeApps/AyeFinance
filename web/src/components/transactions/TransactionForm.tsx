'use client';

import React, { useState } from 'react';
import { Account, TransactionType } from '@/types';
import { apiFetch } from '@/lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';

interface TransactionFormProps {
  accounts: Account[];
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = {
  ingreso: ['Salario', 'Freelance', 'Inversiones', 'Venta', 'Regalo', 'Otro'],
  gasto: ['Comida', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Ropa', 'Supermercado', 'Otro'],
  transferencia: ['Ahorro', 'Inversión', 'Traspaso de fondos', 'Pago de tarjeta', 'Otro'],
};

export const TransactionForm: React.FC<TransactionFormProps> = ({
  accounts,
  onSuccess,
  onCancel,
}) => {
  const [type, setType] = useState<TransactionType>('gasto');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState(
    accounts.find((a) => a.id !== accounts[0]?.id)?.id || ''
  );
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState(CATEGORIES.gasto[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(CATEGORIES[newType][0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    if (!concept.trim()) {
      setError('Por favor ingresa un concepto descriptivo.');
      return;
    }

    if (type === 'transferencia' && accountId === destinationAccountId) {
      setError('La cuenta de origen y destino no pueden ser la misma.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/transactions/', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          destination_account_id: type === 'transferencia' ? destinationAccountId : null,
          amount: parsedAmount.toFixed(2),
          type,
          concept: concept.trim(),
          category,
          date: new Date(date).toISOString(),
          notes: notes.trim() || null,
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al registrar transacción.');
    } finally {
      setLoading(false);
    }
  };

  const accountOptions = accounts.map((acc) => ({
    value: acc.id,
    label: `${acc.name} (${acc.currency})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* 1. Selector de Tipo (Ingreso / Gasto / Transferencia) */}
      <div className="grid grid-cols-3 gap-2 bg-[#121212] p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => handleTypeChange('gasto')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            type === 'gasto'
              ? 'bg-rose-500 text-white shadow-[0_2px_10px_rgba(244,63,94,0.3)]'
              : 'text-[#8a8a8a] hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          Gasto
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('ingreso')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            type === 'ingreso'
              ? 'bg-emerald-500 text-black shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
              : 'text-[#8a8a8a] hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Ingreso
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('transferencia')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            type === 'transferencia'
              ? 'bg-sky-500 text-white shadow-[0_2px_10px_rgba(14,165,233,0.3)]'
              : 'text-[#8a8a8a] hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Traspaso
        </button>
      </div>

      {/* 2. Input de Monto Grande */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#8a8a8a] font-medium">Monto</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold font-mono text-[#8a8a8a]">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#121212] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-2xl font-mono font-bold text-white focus:outline-none focus:border-[#FE9D01] transition-all placeholder:text-[#444]"
          />
        </div>
      </div>

      {/* 3. Selección de Cuenta(s) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Dropdown
          label={type === 'transferencia' ? 'Cuenta Origen' : 'Cuenta'}
          options={accountOptions}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        />
        {type === 'transferencia' && (
          <Dropdown
            label="Cuenta Destino"
            options={accountOptions}
            value={destinationAccountId}
            onChange={(e) => setDestinationAccountId(e.target.value)}
          />
        )}
      </div>

      {/* 4. Concepto */}
      <Input
        label="Concepto"
        placeholder="Ej: Supermercado Chedraui, Pago Nómina..."
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        required
      />

      {/* 5. Chips de Categoría */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[#8a8a8a] font-medium">Categoría</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES[type].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                category === cat
                  ? 'bg-[#FE9D01] text-black font-semibold'
                  : 'bg-white/5 text-[#8a8a8a] hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Fecha y Notas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Notas (Opcional)"
          placeholder="Detalles adicionales..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* 7. Botones */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Guardar Transacción
        </Button>
      </div>
    </form>
  );
};
