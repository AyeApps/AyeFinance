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
        <label htmlFor={inputId} className="text-xs font-medium text-[#8a8a8a]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefixSymbol && (
          <span className="absolute left-3 text-sm font-semibold text-[#8a8a8a] pointer-events-none">
            {prefixSymbol}
          </span>
        )}
        <input
          id={inputId}
          className={twMerge(
            clsx(
              'w-full bg-[#121212] border border-[rgba(255,255,255,0.12)] rounded-lg px-3.5 py-2.5 text-sm text-[#f5f5f5]',
              'placeholder:text-[#555] focus:outline-none focus:border-[#FE9D01] focus:ring-1 focus:ring-[#FE9D01]',
              'transition-colors duration-150',
              prefixSymbol && 'pl-8',
              error && 'border-red-500/70 focus:border-red-500 focus:ring-red-500',
              className
            )
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
};
