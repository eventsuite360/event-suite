'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Calendar } from 'lucide-react';

interface EventTopbarProps {
  eventName?: string;
  email?: string;
}

export function EventTopbar({ eventName, email }: EventTopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-zinc-100 border border-zinc-200">
          <Calendar className="w-4 h-4 text-black" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-zinc-900 leading-tight">
            {eventName || 'Loading event...'}
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium">Event Admin Portal</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="draft">Event Portal Active</Badge>
        <div className="flex items-center gap-2 pl-3 border-l border-zinc-200">
          <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
            {email ? email.charAt(0).toUpperCase() : 'E'}
          </div>
          <span className="text-xs font-mono text-zinc-700 font-medium">{email}</span>
        </div>
      </div>
    </header>
  );
}
