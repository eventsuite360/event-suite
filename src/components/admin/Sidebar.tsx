'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, Users, LogOut, Sparkles, X } from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    onCloseMobile?.();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      name: 'Events',
      href: '/admin/events',
      icon: Calendar,
      active: pathname.startsWith('/admin/events'),
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      active: pathname.startsWith('/admin/users'),
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-black text-zinc-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-black shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">Event Suite 360</h1>
            <p className="text-xs text-zinc-400 font-medium">Core Admin Panel</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onCloseMobile?.()}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-white text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? 'text-black' : 'text-zinc-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User & Logout */}
      <div className="p-4 border-t border-zinc-800 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar (md:flex) */}
      <aside className="hidden md:flex w-64 bg-black shrink-0 min-h-screen border-r border-zinc-800 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay (< md) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Sliding Drawer */}
          <aside className="relative z-10 w-64 max-w-[80vw] h-full bg-black border-r border-zinc-800 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
