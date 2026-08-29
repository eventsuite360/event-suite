'use client';

import React from 'react';
import { User, Shield, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface TopbarProps {
  title?: string;
  onMenuClick?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title = 'Dashboard', onMenuClick }) => {
  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <Badge variant="admin" className="gap-1.5 py-1 px-2.5 sm:px-3 text-[11px] sm:text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden xs:inline sm:inline">Administrator</span>
        </Badge>

        <div className="h-6 w-px bg-zinc-200 hidden xs:block" />

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-semibold text-sm shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold text-zinc-900 leading-tight">System Admin</div>
            <div className="text-xs text-zinc-500">event.admin@gmail.com</div>
          </div>
        </div>
      </div>
    </header>
  );
};
