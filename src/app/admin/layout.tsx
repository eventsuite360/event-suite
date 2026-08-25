import React from 'react';
import { redirect } from 'next/navigation';
import { isServerPlatformAdminAuthenticated, isServerEventAdminAuthenticated } from '@/lib/session';
import { Sidebar } from '@/components/admin/Sidebar';
import { Topbar } from '@/components/admin/Topbar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isPlatformAdmin = await isServerPlatformAdminAuthenticated();

  if (!isPlatformAdmin) {
    const isEventAdmin = await isServerEventAdminAuthenticated();
    if (isEventAdmin) {
      redirect('/event-dashboard');
    }
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
