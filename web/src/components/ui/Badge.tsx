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
    amber: 'bg-[#FE9D01]/15 text-[#FE9D01] border-[#FE9D01]/30',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    neutral: 'bg-white/5 text-[#8a8a8a] border-white/10',
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
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
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
