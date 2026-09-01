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
          'bg-[#0d0d0d] border-[rgba(255,255,255,0.09)] text-[#f5f5f5]',
          lift && 'card-lift',
          bracket && 'bracket-corners',
          glow && 'shadow-[0_0_20px_rgba(254,157,1,0.08)] border-[#FE9D01]/30',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
