'use client';

import React, { useEffect, useState } from 'react';
import { EventSidebar } from '@/components/event-dashboard/EventSidebar';
import { EventTopbar } from '@/components/event-dashboard/EventTopbar';

export default function EventDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessionData, setSessionData] = useState<{
    name: string;
    email: string;
    role?: 'admin' | 'event_admin' | 'event_sub_user';
    canAccessRegistration?: boolean;
    canAccessExpenseRevenue?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchSessionData() {
      try {
        const res = await fetch('/api/event-dashboard/session');
        if (res.ok) {
          const data = await res.json();
          setSessionData({
            name: data.event?.name || 'Event Dashboard',
            email: data.session?.email || '',
            role: data.session?.role,
            canAccessRegistration: data.session?.canAccessRegistration,
            canAccessExpenseRevenue: data.session?.canAccessExpenseRevenue,
          });
        }
      } catch (err) {
        console.error('Failed to fetch event session:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSessionData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center text-zinc-500 text-sm">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-3" />
          <p>Loading event portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex overflow-x-hidden font-sans text-zinc-900 antialiased">
      <EventSidebar
        eventName={sessionData?.name}
        role={sessionData?.role}
        canAccessRegistration={sessionData?.canAccessRegistration}
        canAccessExpenseRevenue={sessionData?.canAccessExpenseRevenue}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <EventTopbar
          eventName={sessionData?.name}
          email={sessionData?.email}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
