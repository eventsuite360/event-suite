'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Plus, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EventItem } from '@/lib/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    draftEvents: 0,
    archivedEvents: 0,
    totalUsers: 0,
  });
  const [recentEvents, setRecentEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // Fetch events via server API
        const eventsRes = await fetch('/api/admin/events');
        const eventsData = await eventsRes.json();
        const allEvents: EventItem[] = eventsData.events || [];

        const publishedCount = allEvents.filter((e) => e.status === 'published').length;
        const draftCount = allEvents.filter((e) => e.status === 'draft').length;
        const archivedCount = allEvents.filter((e) => e.status === 'archived').length;

        // Fetch users stats via API endpoint
        const usersRes = await fetch('/api/admin/users');
        const usersData = await usersRes.json();
        const usersCount = usersData.users ? usersData.users.length : 0;

        setStats({
          totalEvents: allEvents.length,
          publishedEvents: publishedCount,
          draftEvents: draftCount,
          archivedEvents: archivedCount,
          totalUsers: usersCount,
        });

        setRecentEvents(allEvents.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black p-6 rounded-2xl text-white shadow-md border border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Event Suite 360 Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage multi-tenant events, users, and administrative controls.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin/events">
            <Button variant="outline" className="bg-white text-black hover:bg-zinc-100 border-none font-semibold">
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
              <Users className="w-4 h-4" />
              <span>Manage Users</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Events"
          value={loading ? '...' : stats.totalEvents}
          icon={Calendar}
          description="All managed events"
        />
        <StatCard
          title="Published Events"
          value={loading ? '...' : stats.publishedEvents}
          icon={CheckCircle2}
          description="Live active events"
        />
        <StatCard
          title="Draft Events"
          value={loading ? '...' : stats.draftEvents}
          icon={Clock}
          description="In-progress events"
        />
        <StatCard
          title="Total Users"
          value={loading ? '...' : stats.totalUsers}
          icon={Users}
          description="Registered admin users"
        />
      </div>

      {/* Recent Activity / Events Section */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Recent Events</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Latest events created in the system</p>
          </div>
          <Link
            href="/admin/events"
            className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
          >
            <span>View All Events</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 text-sm">
            <div className="inline-block animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mb-2" />
            <p>Loading recent events...</p>
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <Calendar className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <p className="font-semibold text-zinc-700">No events found</p>
            <p className="text-xs text-slate-400 mt-1">Get started by creating your first event.</p>
            <div className="mt-4">
              <Link href="/admin/events">
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  <span>Create First Event</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="py-3.5 px-4">Event Name</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-zinc-900">{evt.name}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={evt.status}>{evt.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {evt.start_date ? new Date(evt.start_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-400">
                      {new Date(evt.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
