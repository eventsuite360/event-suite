'use client';

import React from 'react';
import { User, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface TopbarProps {
  title?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title = 'Dashboard' }) => {
  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="admin" className="gap-1.5 py-1 px-3">
          <Shield className="w-3.5 h-3.5" />
          <span>Administrator</span>
        </Badge>

        <div className="h-6 w-px bg-zinc-200" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-semibold text-sm">
            <User className="w-5 h-5 text-zinc-600" />
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
