import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  error,
  className,
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={twMerge(
          clsx(
            'w-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)]',
            'focus:outline-none focus:border-[var(--accent-amber)] focus:ring-1 focus:ring-[var(--accent-amber)]',
            'transition-all duration-150 cursor-pointer',
            error && 'border-[var(--accent-danger)]',
            className
          )
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-[var(--accent-danger)] mt-0.5 font-medium">{error}</span>}
    </div>
  );
};
