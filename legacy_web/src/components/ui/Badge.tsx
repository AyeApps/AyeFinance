import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'amber' | 'green' | 'red' | 'blue' | 'neutral';
  geo?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  geo = false,
  ...props
}) => {
  const variantStyles = {
    amber: 'bg-[var(--accent-amber-subtle)] text-[var(--accent-amber)] border-[var(--accent-amber-border)]',
    green: 'bg-[var(--accent-success-subtle)] text-[var(--accent-success)] border-[var(--accent-success-border)]',
    red: 'bg-[var(--accent-danger-subtle)] text-[var(--accent-danger)] border-[var(--accent-danger-border)]',
    blue: 'bg-[var(--accent-info-subtle)] text-[var(--accent-info)] border-[var(--accent-info-subtle)]',
    neutral: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-muted)]',
  };

  if (geo) {
    return (
      <span className={twMerge(clsx('geo-badge', className))} {...props}>
        {children}
      </span>
    );
  }

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono uppercase tracking-wider',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
