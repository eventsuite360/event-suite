import React from 'react';
import { EventStatus, UserRole } from '@/lib/types';

interface BadgeProps {
  variant?: EventStatus | UserRole | 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  const styles: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300',
    published: 'bg-black text-white ring-1 ring-black',
    archived: 'bg-zinc-200 text-zinc-600 ring-1 ring-zinc-300',
    admin: 'bg-black text-white ring-1 ring-black',
    default: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300',
    success: 'bg-black text-white ring-1 ring-black',
    warning: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300',
    danger: 'bg-zinc-900 text-white ring-1 ring-zinc-900',
    info: 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300',
  };

  const currentStyle = styles[variant] || styles.default;

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium capitalize ${currentStyle} ${className}`}>
      {children}
    </span>
  );
};
