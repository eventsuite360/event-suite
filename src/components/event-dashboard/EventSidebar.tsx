'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Ticket, DollarSign, LogOut, Sparkles } from 'lucide-react';

interface EventSidebarProps {
  eventName?: string;
  role?: 'admin' | 'event_admin' | 'event_sub_user';
  canAccessRegistration?: boolean;
  canAccessExpenseRevenue?: boolean;
}

export function EventSidebar({
  eventName,
  role,
  canAccessRegistration,
  canAccessExpenseRevenue,
}: EventSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const allNavItems = [
    {
      name: 'User Management',
      href: '/event-dashboard/users',
      icon: Users,
      show: role !== 'event_sub_user',
    },
    {
      name: 'Registration',
      href: '/event-dashboard/registration',
      icon: Ticket,
      show: role !== 'event_sub_user' || Boolean(canAccessRegistration),
    },
    {
      name: 'Expense & Revenue',
      href: '/event-dashboard/finance',
      icon: DollarSign,
      show: role !== 'event_sub_user' || Boolean(canAccessExpenseRevenue),
    },
  ];

  const navItems = allNavItems.filter((item) => item.show);

  return (
    <aside className="w-64 bg-black text-white flex flex-col justify-between min-h-screen border-r border-zinc-800 shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white">Event Suite 360</div>
              <div className="text-[11px] font-semibold text-zinc-400 truncate max-w-[150px]">
                {eventName || 'Event Portal'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-6">
          <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Event Management
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/event-dashboard/users' && pathname === '/event-dashboard');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-zinc-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
