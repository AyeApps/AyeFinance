import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  lift?: boolean;
  bracket?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  lift = false,
  bracket = false,
  glow = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl border p-5 transition-all',
          'bg-[var(--bg-card)] border-[var(--border-muted)] text-[var(--text-primary)]',
          lift && 'card-lift hover:border-[var(--accent-amber-border)]',
          bracket && 'bracket-corners',
          glow && 'shadow-[0_0_20px_var(--accent-amber-subtle)] border-[var(--accent-amber-border)]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
