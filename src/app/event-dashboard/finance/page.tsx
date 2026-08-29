'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Trash2, Edit3, DollarSign, TrendingUp, TrendingDown, Wallet, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/admin/StatCard';

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

export default function EventFinancePage() {
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [totals, setTotals] = useState<{
    totalExpenses: number;
    totalRevenue: number;
    netBalance: number;
  } | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'revenue'>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
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

  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [paginationInfo, setPaginationInfo] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({ total: 0, page: 1, limit: 25, totalPages: 1 });

  const fetchFinancialData = useCallback(async (targetPage = page) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/event-dashboard/expense-revenue?page=${targetPage}&limit=${pageSize}`);
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries || []);
        setTotals(data.totals || null);
        if (data.pagination) {
          setPaginationInfo(data.pagination);
          setPage(data.pagination.page);
        }
        setUserRole(data.userRole || '');
        setCurrentUserEmail(data.currentUserEmail || '');
      } else {
        setFetchError(data.error || 'Failed to fetch financial entries.');
      }
    } catch (err: any) {
      setFetchError(err.message || 'An error occurred while fetching financial data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchFinancialData(page);
  }, [fetchFinancialData, page]);

  const openAddModal = () => {
    setFormData({
      type: 'expense',
      subject: '',
      amount: '',
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (entry: EntryItem) => {
    setSelectedEntry(entry);
    setFormData({
      type: entry.type,
      subject: entry.subject,
      amount: entry.amount.toString(),
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (entry: EntryItem) => {
    setSelectedEntry(entry);
    setIsDeleteOpen(true);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.subject.trim()) {
      setFormError('Subject description is required.');
      return;
    }

    const numAmount = parseFloat(formData.amount);
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
          type: formData.type,
          subject: formData.subject.trim(),
          amount: numAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to add financial entry.');
        setActionLoading(false);
        return;
      }

      setIsAddOpen(false);
      fetchFinancialData();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setFormError(null);
    if (!formData.subject.trim()) {
      setFormError('Subject description is required.');
      return;
    }

    const numAmount = parseFloat(formData.amount);
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
          type: formData.type,
          subject: formData.subject.trim(),
          amount: numAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to update entry.');
        setActionLoading(false);
        return;
      }

      setIsEditOpen(false);
      fetchFinancialData();
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

      setIsDeleteOpen(false);
      fetchFinancialData();
    } catch (err: any) {
      alert('Failed to delete entry: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesQuery = entry.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.created_by_user_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || entry.type === typeFilter;
    return matchesQuery && matchesType;
  });

  const isSubUser = userRole === 'event_sub_user';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Expense &amp; Revenue</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isSubUser
              ? 'Record and manage your personal event expense and revenue entries.'
              : 'Complete financial overview, expense tracking, and revenue logs for this event.'}
          </p>
        </div>
        <Button onClick={openAddModal} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Entry</span>
        </Button>
      </div>

      {/* Error Alert */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load financial data</p>
            <p className="text-xs text-zinc-600 mt-0.5">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Summary Stat Cards — Shown ONLY to Admins */}
      {!isSubUser && totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : `₹${totals.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            description="Cumulative revenue collected"
          />
          <StatCard
            title="Total Expenses"
            value={loading ? '...' : `₹${totals.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingDown}
            description="Cumulative expenses incurred"
          />
          <StatCard
            title="Net Balance"
            value={loading ? '...' : `₹${totals.netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Wallet}
            description="Net revenue minus expenses"
          />
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={isSubUser ? "Search your entries..." : "Search entries or user names..."}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type:</span>
          <div className="inline-flex rounded-lg bg-zinc-100 p-1 border border-zinc-200">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                typeFilter === 'all' ? 'bg-black text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('revenue')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                typeFilter === 'revenue' ? 'bg-black text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                typeFilter === 'expense' ? 'bg-black text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Expense
            </button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 animate-pulse rounded-lg w-full" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <FileText className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="font-semibold text-zinc-700 text-base">No financial entries found</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery || typeFilter !== 'all'
                ? 'No entries match your search or filter criteria.'
                : 'Click "Add Entry" above to record your first expense or revenue item.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="py-3.5 px-6">Subject / Description</th>
                    <th className="py-3.5 px-6">Entry Type</th>
                    <th className="py-3.5 px-6">Amount</th>
                    {!isSubUser && <th className="py-3.5 px-6">Recorded By</th>}
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredEntries.map((entry) => (
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
                      {!isSubUser && (
                        <td className="py-4 px-6 text-xs text-zinc-700 font-semibold">
                          {entry.created_by_user_name}
                        </td>
                      )}
                      <td className="py-4 px-6 text-xs text-zinc-400">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(entry)}
                          title="Edit Entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => openDeleteModal(entry)}
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

            {/* Pagination Bar */}
            {paginationInfo.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-zinc-200 text-xs text-zinc-600 bg-zinc-50/50">
                <div>
                  Showing{' '}
                  <strong className="font-semibold text-zinc-900">
                    {Math.min((page - 1) * pageSize + 1, paginationInfo.total)}
                  </strong>{' '}
                  to{' '}
                  <strong className="font-semibold text-zinc-900">
                    {Math.min(page * pageSize, paginationInfo.total)}
                  </strong>{' '}
                  of <strong className="font-semibold text-zinc-900">{paginationInfo.total}</strong> entries
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-xs px-2.5 py-1"
                  >
                    Previous
                  </Button>
                  <span className="font-mono text-xs font-semibold px-2">
                    Page {page} of {paginationInfo.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= paginationInfo.totalPages || loading}
                    onClick={() => setPage((p) => Math.min(paginationInfo.totalPages, p + 1))}
                    className="text-xs px-2.5 py-1"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ADD ENTRY MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Financial Entry">
        <form onSubmit={handleAddEntry} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          {/* Step 1: Type Selection */}
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-2">
              Step 1: Select Entry Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'revenue' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  formData.type === 'revenue'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Revenue</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  formData.type === 'expense'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Expense</span>
              </button>
            </div>
          </div>

          {/* Step 2: Subject & Amount */}
          <div className="space-y-4 pt-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
              Step 2: Enter Details *
            </label>

            <Input
              label="Subject / Description *"
              placeholder={formData.type === 'revenue' ? "e.g. Ticket Sales, Sponsorship" : "e.g. Catering, AV Rental, Venue Fee"}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />

            <Input
              label="Amount (₹) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
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
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Financial Entry">
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
                onClick={() => setFormData({ ...formData, type: 'revenue' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  formData.type === 'revenue'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Revenue</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  formData.type === 'expense'
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
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />

          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
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

      {/* DELETE CONFIRMATION MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-300">
            <AlertTriangle className="w-6 h-6 text-black shrink-0" />
            <div>
              <p className="font-semibold text-sm">Delete this financial entry?</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                &quot;{selectedEntry?.subject}&quot; (₹{selectedEntry?.amount}) will be permanently removed.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
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
