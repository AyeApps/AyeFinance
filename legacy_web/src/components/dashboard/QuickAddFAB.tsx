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
      {/* Bottom Center Large Rectangular Amber Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 md:left-64 flex justify-center items-center z-40 px-4 pointer-events-none">
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto w-full max-w-md md:max-w-lg h-13 md:h-14 px-8 rounded-2xl bg-[var(--accent-amber)] hover:bg-[var(--accent-amber-hover)] text-black shadow-[0_8px_32px_rgba(254,157,1,0.55)] flex items-center justify-center gap-3 btn-press cursor-pointer transition-all duration-200 border-2 border-black/15 group select-none"
          aria-label="Registrar nueva transacción o servicio"
        >
          <div className="w-7 h-7 rounded-lg bg-black text-[var(--accent-amber)] flex items-center justify-center font-black">
            <Plus className="w-5 h-5 stroke-[3] transition-transform group-hover:rotate-90 duration-300" />
          </div>
          <span className="font-black text-xs md:text-sm uppercase tracking-widest font-mono">
            Registrar Movimiento / Servicio
          </span>
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Registrar Movimiento o Servicio" maxWidth="lg">
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
