'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Account } from '@/types';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { Card } from '@/components/ui/Card';

export default function NewTransactionPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Account[]>('/accounts/')
      .then((data) => setAccounts(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">Registrar Movimiento</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">
          Agrega un nuevo ingreso, gasto o transferencia entre tus cuentas
        </p>
      </div>

      <Card bracket lift glow className="p-6">
        {loading ? (
          <div className="h-64 animate-pulse bg-white/5 rounded-xl" />
        ) : (
          <TransactionForm
            accounts={accounts}
            onSuccess={() => router.push('/transacciones')}
            onCancel={() => router.push('/')}
          />
        )}
      </Card>
    </div>
  );
}
