import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefixSymbol?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  prefixSymbol,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefixSymbol && (
          <span className="absolute left-3 text-sm font-bold font-mono text-[var(--text-muted)] pointer-events-none">
            {prefixSymbol}
          </span>
        )}
        <input
          id={inputId}
          className={twMerge(
            clsx(
              'w-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)]',
              'placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-amber)] focus:ring-1 focus:ring-[var(--accent-amber)]',
              'transition-all duration-150',
              prefixSymbol && 'pl-8',
              error && 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]',
              className
            )
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-[var(--accent-danger)] mt-0.5 font-medium">{error}</span>}
    </div>
  );
};
