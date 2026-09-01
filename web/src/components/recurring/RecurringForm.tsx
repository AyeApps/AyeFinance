'use client';

import React, { useState } from 'react';
import { Account, Frequency, RecurringType } from '@/types';
import { apiFetch } from '@/lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';

interface RecurringFormProps {
  accounts: Account[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const RecurringForm: React.FC<RecurringFormProps> = ({
  accounts,
  onSuccess,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<RecurringType>('gasto_fijo');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('mensual');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor ingresa un monto válido.');
      return;
    }

    if (!name.trim()) {
      setError('Por favor ingresa un nombre para el concepto recurrente.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/recurring/', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type,
          amount: parsedAmount.toFixed(2),
          frequency,
          day_of_month: frequency === 'mensual' ? parseInt(dayOfMonth, 10) : null,
          account_id: accountId,
          next_date: new Date(nextDate).toISOString(),
          is_active: true,
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar elemento recurrente.');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'ingreso_fijo', label: 'Ingreso Fijo (Sueldo, Renta Cobrada, Tanda...)' },
    { value: 'gasto_fijo', label: 'Gasto Fijo (Renta, Luz, Agua, Internet...)' },
    { value: 'mensualidad', label: 'Mensualidad (Netflix, Spotify, Gimnasio...)' },
  ];

  const frequencyOptions = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
  ];

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

      <Input
        label="Nombre del Recurrente"
        placeholder="Ej: Salario Quincenal, Renta Departamento, Netflix"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Dropdown
          label="Tipo de Recurrente"
          options={typeOptions}
          value={type}
          onChange={(e) => setType(e.target.value as RecurringType)}
        />
        <Input
          label="Monto Estimado"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          prefixSymbol="$"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Dropdown
          label="Frecuencia"
          options={frequencyOptions}
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
        />
        <Dropdown
          label="Cuenta Asociada"
          options={accountOptions}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {frequency === 'mensual' && (
          <Input
            label="Día del Mes (1-31)"
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />
        )}
        <Input
          label="Próxima Fecha de Aplicación"
          type="date"
          value={nextDate}
          onChange={(e) => setNextDate(e.target.value)}
          required
        />
      </div>

      <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Guardar Recurrente
        </Button>
      </div>
    </form>
  );
};
