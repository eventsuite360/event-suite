import React from 'react';
import { redirect } from 'next/navigation';
import { isServerPlatformAdminAuthenticated, isServerEventAdminAuthenticated } from '@/lib/session';
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isPlatformAdmin = await isServerPlatformAdminAuthenticated();

  if (!isPlatformAdmin) {
    const isEventAdmin = await isServerEventAdminAuthenticated();
    if (isEventAdmin) {
      redirect('/event-dashboard');
    }
    redirect('/login');
  }

  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
