'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Calendar, Edit3, Trash2, AlertTriangle, Filter, Copy, Check } from 'lucide-react';
import { EventItem } from '@/lib/types';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Copy Feedback State
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form States (Name & Slug only)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
      } else {
        const errorMsg = data.error || `HTTP ${res.status} error fetching events`;
        console.error('[AdminEventsPage] Error fetching events:', errorMsg);
        setFetchError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to connect to API server';
      console.error('[AdminEventsPage] Error fetching events:', errorMsg);
      setFetchError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      slug: '',
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (evt: EventItem) => {
    setSelectedEvent(evt);
    setFormData({
      name: evt.name,
      slug: evt.slug,
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (evt: EventItem) => {
    setSelectedEvent(evt);
    setIsDeleteOpen(true);
  };

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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Event name is required.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim() || generateSlug(formData.name),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create event.');
        setActionLoading(false);
        return;
      }

      setIsCreateOpen(false);
      fetchEvents();

      const createdEmail = data.event_admin_email || '';
      const createdPassword = data.event_admin_password || data.plain_password || '';

      // Show generated credentials popup immediately
      setCreatedCredentials({
        email: createdEmail,
        password: createdPassword,
      });
      setIsCredentialsOpen(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create event.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setFormError(null);
    if (!formData.name.trim()) {
      setFormError('Event name is required.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEvent.id,
          name: formData.name.trim(),
          slug: formData.slug.trim() || generateSlug(formData.name),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to update event.');
        setActionLoading(false);
        return;
      }

      setIsEditOpen(false);
      fetchEvents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update event.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/events?id=${selectedEvent.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete event.');
        setActionLoading(false);
        return;
      }

      setIsDeleteOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert('Failed to delete event: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch = evt.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || evt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Event Management</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Create, edit, and organize all events across the platform.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span>New Event</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search events by name..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-500 uppercase">Status:</span>
            <div className="flex bg-zinc-100 p-1 rounded-lg gap-1 border border-zinc-200">
              {['all', 'draft', 'published', 'archived'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-black text-white shadow-xs'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Table & List State */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-3" />
            <p>Loading events...</p>
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center text-zinc-500 px-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-zinc-400 mb-3" />
            <p className="font-semibold text-zinc-900 text-base">Error Loading Events</p>
            <p className="text-xs text-zinc-800 font-mono mt-2 max-w-md mx-auto bg-zinc-100 p-2.5 rounded-lg border border-zinc-300">
              {fetchError}
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              If unauthorized, please log in again. If a database error occurred, check server logs.
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Calendar className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="font-semibold text-zinc-700 text-base">No events found</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or status filter parameters.'
                : 'There are no events in the database yet. Click "New Event" above to create one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="py-3.5 px-6">Event Name & Slug</th>
                  <th className="py-3.5 px-6">Event Admin Credentials</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <Link href={`/admin/events/${evt.id}`} className="group block">
                        <div className="font-bold text-zinc-900 group-hover:underline flex items-center gap-1.5">
                          <span>{evt.name}</span>
                        </div>
                        <div className="text-xs font-mono text-zinc-400 mt-0.5">/{evt.slug}</div>
                      </Link>
                    </td>
                    <td className="py-4 px-6 space-y-1.5">
                      {/* Email */}
                      {evt.event_admin_email ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase w-12 shrink-0">Email:</span>
                          <span className="font-mono text-sm text-zinc-900 font-medium">
                            {evt.event_admin_email}
                          </span>
                          <button
                            onClick={() => copyToClipboard(evt.event_admin_email!, `row-email-${evt.id}`)}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors shrink-0 cursor-pointer"
                            title="Copy Email"
                          >
                            {copiedField === `row-email-${evt.id}` ? (
                              <Check className="w-3.5 h-3.5 text-black" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : null}

                      {/* Password */}
                      {evt.event_admin_password ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase w-12 shrink-0">Pass:</span>
                          <span className="font-mono text-sm text-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 shrink-0">
                            {evt.event_admin_password}
                          </span>
                          <button
                            onClick={() => copyToClipboard(evt.event_admin_password!, `row-pass-${evt.id}`)}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors shrink-0 cursor-pointer"
                            title="Copy Password"
                          >
                            {copiedField === `row-pass-${evt.id}` ? (
                              <Check className="w-3.5 h-3.5 text-black" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={evt.status}>{evt.status}</Badge>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-400">
                      {new Date(evt.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Link href={`/admin/events/${evt.id}`}>
                        <Button size="sm" variant="outline" title="View Event Overview">
                          <span>View</span>
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(evt)}
                        title="Edit Event"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openDeleteModal(evt)}
                        title="Delete Event"
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

      {/* CREATE EVENT MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Event">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <Input
            label="Event Name *"
            placeholder="e.g. Global Tech Summit 2026"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />

          <Input
            label="URL Slug"
            placeholder="global-tech-summit-2026"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            helperText="Unique URL identifier for the event site"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Create Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT EVENT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Event">
        <form onSubmit={handleUpdateEvent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <Input
            label="Event Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="URL Slug *"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
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

      {/* CREDENTIALS DISPLAY POPUP MODAL */}
      <Modal
        isOpen={isCredentialsOpen}
        onClose={() => setIsCredentialsOpen(false)}
        title="Event Created — Save Credentials"
      >
        <div className="space-y-5">
          <p className="text-xs text-zinc-600">
            Below are the generated administrator credentials for this event. You can view these credentials at any time on the Event Management page.
          </p>

          {/* Email Field */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Event Admin Email
            </label>
            <div className="flex items-center justify-between font-mono text-sm text-zinc-900 font-semibold gap-2">
              <span className="select-all">{createdCredentials?.email}</span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => copyToClipboard(createdCredentials?.email || '', 'popup-email')}
              >
                {copiedField === 'popup-email' ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'popup-email' ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* Password Field */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Password
            </label>
            <div className="flex items-center justify-between font-mono text-sm text-zinc-900 font-bold bg-white px-3 py-1.5 rounded border border-zinc-200">
              <span className="select-all tracking-wider">{createdCredentials?.password}</span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => copyToClipboard(createdCredentials?.password || '', 'popup-pass')}
              >
                {copiedField === 'popup-pass' ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'popup-pass' ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <Button
              variant="outline"
              type="button"
              onClick={() =>
                copyToClipboard(
                  `Email: ${createdCredentials?.email} / Password: ${createdCredentials?.password}`,
                  'popup-both'
                )
              }
            >
              {copiedField === 'popup-both' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'popup-both' ? 'Copied Both!' : 'Copy Both'}</span>
            </Button>

            <Button type="button" onClick={() => setIsCredentialsOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-300">
            <AlertTriangle className="w-6 h-6 text-black shrink-0" />
            <div>
              <p className="font-semibold text-sm">Are you sure you want to delete this event?</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                This action cannot be undone. &quot;{selectedEvent?.name}&quot; will be permanently removed.
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
            <Button variant="danger" onClick={handleDeleteEvent} isLoading={actionLoading}>
              Delete Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
