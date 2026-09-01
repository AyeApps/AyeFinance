'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { TransactionForm } from '../transactions/TransactionForm';
import { Account } from '@/types';

interface QuickAddFABProps {
  accounts: Account[];
  onSuccess?: () => void;
}

export const QuickAddFAB: React.FC<QuickAddFABProps> = ({ accounts, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#FE9D01] hover:bg-[#FFAF20] text-black shadow-[0_4px_20px_rgba(254,157,1,0.4)] flex items-center justify-center btn-press cursor-pointer transition-all duration-200"
        aria-label="Registrar nueva transacción"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Registrar Movimiento" maxWidth="lg">
        <TransactionForm
          accounts={accounts}
          onSuccess={() => {
            setIsOpen(false);
            if (onSuccess) onSuccess();
          }}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
};
