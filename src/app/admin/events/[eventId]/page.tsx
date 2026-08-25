'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, DollarSign, Users, TrendingUp, TrendingDown, Wallet, 
  Shield, Check, Copy, Plus, Edit3, Trash2, AlertTriangle, FileText, Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/admin/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface EventDetail {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  event_admin_email: string;
  event_admin_password?: string;
  created_at: string;
  updated_at: string;
}

interface SubUserItem {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  can_access_registration: boolean;
  can_access_expense_revenue: boolean;
  created_at: string;
}

interface EntryItem {
  id: string;
  event_id: string;
  created_by_user_id: string;
  created_by_user_name: string;
  type: 'expense' | 'revenue';
  subject: string;
  amount: number;
  created_at: string;
}

export default function AdminEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [subUsers, setSubUsers] = useState<SubUserItem[]>([]);
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [totals, setTotals] = useState({
    totalExpenses: 0,
    totalRevenue: 0,
    netBalance: 0,
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal States
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isEditEntryOpen, setIsEditEntryOpen] = useState(false);
  const [isDeleteEntryOpen, setIsDeleteEntryOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryItem | null>(null);

  // Form State
  const [entryFormData, setEntryFormData] = useState<{
    type: 'expense' | 'revenue';
    subject: string;
    amount: string;
  }>({
    type: 'expense',
    subject: '',
    amount: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`);
      const data = await res.json();
      if (res.ok) {
        setEvent(data.event);
        setSubUsers(data.subUsers || []);
        setEntries(data.entries || []);
        setTotals(data.totals || { totalExpenses: 0, totalRevenue: 0, netBalance: 0 });
      } else {
        setFetchError(data.error || 'Failed to fetch event detail.');
      }
    } catch (err: any) {
      setFetchError(err.message || 'An error occurred while loading event detail.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const openAddEntryModal = () => {
    setEntryFormData({
      type: 'expense',
      subject: '',
      amount: '',
    });
    setFormError(null);
    setIsAddEntryOpen(true);
  };

  const openEditEntryModal = (entry: EntryItem) => {
    setSelectedEntry(entry);
    setEntryFormData({
      type: entry.type,
      subject: entry.subject,
      amount: entry.amount.toString(),
    });
    setFormError(null);
    setIsEditEntryOpen(true);
  };

  const openDeleteEntryModal = (entry: EntryItem) => {
    setSelectedEntry(entry);
    setIsDeleteEntryOpen(true);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!entryFormData.subject.trim()) {
      setFormError('Subject description is required.');
      return;
    }

    const numAmount = parseFloat(entryFormData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/event-dashboard/expense-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: entryFormData.type,
          subject: entryFormData.subject.trim(),
          amount: numAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to add entry.');
        setActionLoading(false);
        return;
      }

      setIsAddEntryOpen(false);
      fetchEventData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setFormError(null);
    if (!entryFormData.subject.trim()) {
      setFormError('Subject description is required.');
      return;
    }

    const numAmount = parseFloat(entryFormData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/event-dashboard/expense-revenue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          type: entryFormData.type,
          subject: entryFormData.subject.trim(),
          amount: numAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to update entry.');
        setActionLoading(false);
        return;
      }

      setIsEditEntryOpen(false);
      fetchEventData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/event-dashboard/expense-revenue?id=${selectedEntry.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete entry.');
        setActionLoading(false);
        return;
      }

      setIsDeleteEntryOpen(false);
      fetchEventData();
    } catch (err: any) {
      alert('Failed to delete entry: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-400 text-sm">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-3" />
        <p>Loading event overview...</p>
      </div>
    );
  }

  if (fetchError || !event) {
    return (
      <div className="space-y-4">
        <Link href="/admin/events" className="text-xs font-semibold text-zinc-600 hover:text-black flex items-center gap-1.5 w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>
        <Card className="p-8 text-center text-zinc-600">
          <AlertTriangle className="w-10 h-10 text-black mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-900">Failed to load event details</h2>
          <p className="text-xs text-zinc-500 mt-1">{fetchError || 'Event not found'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back & Breadcrumb */}
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-black transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events List</span>
        </Link>
        
        {/* Header Metadata Card */}
        <div className="bg-black text-white p-6 rounded-2xl border border-zinc-800 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
                <Badge variant={event.status}>{event.status}</Badge>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                Slug: /{event.slug} &bull; Created {new Date(event.created_at).toLocaleDateString()}
              </p>
            </div>

            <Button onClick={openAddEntryModal} className="bg-white text-black hover:bg-zinc-100 border-none shrink-0">
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </Button>
          </div>

          {/* Credentials Info Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-900 text-xs">
            <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Event Admin Email</span>
                <span className="font-mono text-sm font-semibold text-white">{event.event_admin_email}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="bg-black text-white border-zinc-700 hover:bg-zinc-800"
                onClick={() => copyToClipboard(event.event_admin_email, 'admin-email')}
              >
                {copiedField === 'admin-email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Event Admin Password</span>
                <span className="font-mono text-sm font-semibold text-white">{event.event_admin_password}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="bg-black text-white border-zinc-700 hover:bg-zinc-800"
                onClick={() => copyToClipboard(event.event_admin_password || '', 'admin-pass')}
              >
                {copiedField === 'admin-pass' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Stat Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Total Revenue"
            value={`₹${totals.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            description="Overall event revenue"
          />
          <StatCard
            title="Total Expenses"
            value={`₹${totals.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingDown}
            description="Overall event expenses"
          />
          <StatCard
            title="Net Balance"
            value={`₹${totals.netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Wallet}
            description="Net profit / margin"
          />
        </div>
      </div>

      {/* Expense & Revenue Entries Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Expense &amp; Revenue Entries</h2>
            <p className="text-xs text-zinc-500 mt-0.5">All entries logged across all sub-users and admins for this event</p>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
              <p className="font-semibold text-zinc-700">No financial entries logged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="py-3.5 px-6">Subject</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Recorded By</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-4 px-6 font-bold text-zinc-900">{entry.subject}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            entry.type === 'revenue'
                              ? 'bg-zinc-900 text-white border-zinc-800'
                              : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                          }`}
                        >
                          {entry.type === 'revenue' ? '+ Revenue' : '- Expense'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-sm font-bold text-zinc-900">
                        ₹{entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-700 font-semibold">
                        {entry.created_by_user_name}
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-400">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditEntryModal(entry)}
                          title="Edit Entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => openDeleteEntryModal(entry)}
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Event Sub-Users & Permissions Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Event Sub-Users ({subUsers.length})</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Assigned sub-users and their module access permissions for this event</p>
        </div>

        <Card className="p-0 overflow-hidden">
          {subUsers.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <Users className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
              <p className="font-semibold text-zinc-700">No sub-users created for this event yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="py-3.5 px-6">Full Name</th>
                    <th className="py-3.5 px-6">Email Address</th>
                    <th className="py-3.5 px-6">Password</th>
                    <th className="py-3.5 px-6">Module Permissions</th>
                    <th className="py-3.5 px-6">Added Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {subUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-4 px-6 font-bold text-zinc-900">{user.full_name}</td>
                      <td className="py-4 px-6 font-mono text-xs text-zinc-700">{user.email}</td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-900">
                        <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {user.password}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {user.can_access_registration && (
                            <Badge variant="published">Registration</Badge>
                          )}
                          {user.can_access_expense_revenue && (
                            <Badge variant="published">Expense &amp; Revenue</Badge>
                          )}
                          {!user.can_access_registration && !user.can_access_expense_revenue && (
                            <Badge variant="draft">No Access</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ADD ENTRY MODAL */}
      <Modal isOpen={isAddEntryOpen} onClose={() => setIsAddEntryOpen(false)} title="Add Financial Entry">
        <form onSubmit={handleAddEntry} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-2">
              Entry Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntryFormData({ ...entryFormData, type: 'revenue' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  entryFormData.type === 'revenue'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Revenue</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryFormData({ ...entryFormData, type: 'expense' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  entryFormData.type === 'expense'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Expense</span>
              </button>
            </div>
          </div>

          <Input
            label="Subject / Description *"
            placeholder="e.g. Venue Catering, Ticket Sales"
            value={entryFormData.subject}
            onChange={(e) => setEntryFormData({ ...entryFormData, subject: e.target.value })}
            required
          />

          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={entryFormData.amount}
            onChange={(e) => setEntryFormData({ ...entryFormData, amount: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEntryOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Save Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT ENTRY MODAL */}
      <Modal isOpen={isEditEntryOpen} onClose={() => setIsEditEntryOpen(false)} title="Edit Financial Entry">
        <form onSubmit={handleEditEntry} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-2">
              Entry Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntryFormData({ ...entryFormData, type: 'revenue' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  entryFormData.type === 'revenue'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Revenue</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryFormData({ ...entryFormData, type: 'expense' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  entryFormData.type === 'expense'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Expense</span>
              </button>
            </div>
          </div>

          <Input
            label="Subject / Description *"
            value={entryFormData.subject}
            onChange={(e) => setEntryFormData({ ...entryFormData, subject: e.target.value })}
            required
          />

          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            value={entryFormData.amount}
            onChange={(e) => setEntryFormData({ ...entryFormData, amount: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditEntryOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE ENTRY CONFIRMATION MODAL */}
      <Modal isOpen={isDeleteEntryOpen} onClose={() => setIsDeleteEntryOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-300">
            <AlertTriangle className="w-6 h-6 text-black shrink-0" />
            <div>
              <p className="font-semibold text-sm">Delete this entry?</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                &quot;{selectedEntry?.subject}&quot; (₹{selectedEntry?.amount}) will be permanently removed from this event.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteEntryOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteEntry} isLoading={actionLoading}>
              Delete Entry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
