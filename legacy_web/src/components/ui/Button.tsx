import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all btn-press focus:outline-none focus:ring-2 focus:ring-[var(--accent-amber)]/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none font-sans select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-[var(--accent-amber)] hover:bg-[var(--accent-amber-hover)] text-black font-bold shadow-[0_2px_10px_rgba(254,157,1,0.25)] border border-[var(--accent-amber)]',
    secondary: 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-muted)] hover:border-[var(--accent-amber)]',
    danger: 'bg-[var(--accent-danger-subtle)] hover:opacity-90 text-[var(--accent-danger)] border border-[var(--accent-danger-border)]',
    ghost: 'bg-transparent hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    outline: 'bg-transparent border border-[var(--accent-amber-border)] text-[var(--accent-amber)] hover:bg-[var(--accent-amber-subtle)] hover:border-[var(--accent-amber)]',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};
