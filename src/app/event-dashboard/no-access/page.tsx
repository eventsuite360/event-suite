'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function NoAccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto mb-4 border border-zinc-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">No Modules Assigned</h1>
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
          Your account does not currently have permissions to access any modules for this event portal. Please contact your event administrator to request module access.
        </p>
      </Card>
    </div>
  );
}
