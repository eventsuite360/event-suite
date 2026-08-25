'use client';

import React from 'react';
import { Ticket, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function EventRegistrationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Event Registration</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage attendee registrations, ticketing, and check-in workflows.
        </p>
      </div>

      <Card className="py-20 px-6 text-center border-dashed">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-4 text-black">
          <Ticket className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900">Registration — Coming Soon</h2>
        <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
          Attendee registration workflows, custom forms, badge generation, and ticket tier management will be available in Phase 2.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-[11px] font-semibold mt-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase 2 Feature</span>
        </div>
      </Card>
    </div>
  );
}
