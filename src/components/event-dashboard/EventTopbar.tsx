'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Menu } from 'lucide-react';

interface EventTopbarProps {
  eventName?: string;
  email?: string;
  onMenuClick?: () => void;
}

export function EventTopbar({ eventName, email, onMenuClick }: EventTopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="p-1.5 sm:p-2 rounded-lg bg-zinc-100 border border-zinc-200 shrink-0">
          <Calendar className="w-4 h-4 text-black" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-bold text-zinc-900 leading-tight truncate">
            {eventName || 'Loading event...'}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium truncate">Event Portal</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Badge variant="draft" className="hidden xs:inline-flex text-[10px] sm:text-xs">Active</Badge>
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-zinc-200">
          <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
            {email ? email.charAt(0).toUpperCase() : 'E'}
          </div>
          <span className="text-xs font-mono text-zinc-700 font-medium hidden sm:inline">{email}</span>
        </div>
      </div>
    </header>
  );
}
