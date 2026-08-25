import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-zinc-800 mb-1">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <input
            id={inputId}
            ref={ref}
            className={`w-full px-3.5 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg shadow-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black disabled:bg-zinc-50 disabled:text-zinc-500 ${
              rightElement ? 'pr-10' : ''
            } ${error ? 'border-zinc-900 focus:ring-black focus:border-black' : ''} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-zinc-900 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-zinc-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
