'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Trash2, Edit3, AlertTriangle, Users, Copy, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface EventUser {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  password?: string;
  can_access_registration: boolean;
  can_access_expense_revenue: boolean;
  created_at: string;
}

export default function EventUsersPage() {
  const [users, setUsers] = useState<EventUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<EventUser | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  // Copy Feedback State
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form States
  const [addFormData, setAddFormData] = useState({
    full_name: '',
    can_access_registration: true,
    can_access_expense_revenue: true,
  });

  const [editFormData, setEditFormData] = useState({
    full_name: '',
    can_access_registration: true,
    can_access_expense_revenue: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/event-dashboard/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        console.error('Error fetching event users:', data.error);
      }
    } catch (err: any) {
      console.error('Error fetching event users:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const openAddModal = () => {
    setAddFormData({
      full_name: '',
      can_access_registration: true,
      can_access_expense_revenue: true,
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (u: EventUser) => {
    setSelectedUser(u);
    setEditFormData({
      full_name: u.full_name,
      can_access_registration: u.can_access_registration,
      can_access_expense_revenue: u.can_access_expense_revenue,
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (u: EventUser) => {
    setSelectedUser(u);
    setIsDeleteOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!addFormData.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/event-dashboard/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addFormData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to add user.');
        setActionLoading(false);
        return;
      }

      setIsAddOpen(false);
      fetchUsers();

      // Show credentials popup
      setCreatedCredentials({
        name: data.full_name,
        email: data.email,
        password: data.password,
      });
      setIsCredentialsOpen(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormError(null);
    if (!editFormData.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/event-dashboard/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          ...editFormData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to update user.');
        setActionLoading(false);
        return;
      }

      setIsEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/event-dashboard/users?id=${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to remove user.');
        setActionLoading(false);
        return;
      }

      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert('Failed to remove user: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Event User Management</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Create sub-users and configure module access permissions for this event.
          </p>
        </div>
        <Button onClick={openAddModal} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Event User</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search event users by name or email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-3" />
            <p>Loading event users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Users className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="font-semibold text-zinc-700 text-base">No event users found</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No users match your search query.'
                : 'No sub-users have been added to this event yet. Click "Add Event User" above to create one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="py-3.5 px-6">Full Name</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">Password</th>
                  <th className="py-3.5 px-6">Module Access</th>
                  <th className="py-3.5 px-6">Added Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-4 px-6 font-bold text-zinc-900">{u.full_name}</td>
                    <td className="py-4 px-6 font-mono text-xs text-zinc-700">{u.email}</td>
                    <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-900">
                      <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        {u.password}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {u.can_access_registration && (
                          <Badge variant="published">Registration</Badge>
                        )}
                        {u.can_access_expense_revenue && (
                          <Badge variant="published">Expense & Revenue</Badge>
                        )}
                        {!u.can_access_registration && !u.can_access_expense_revenue && (
                          <Badge variant="draft">No Access</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(u)}
                        title="Edit Permissions"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openDeleteModal(u)}
                        title="Remove User"
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

      {/* ADD EVENT USER MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Event User">
        <form onSubmit={handleAddUser} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <Input
            label="Full Name *"
            placeholder="e.g. Sarah Jenkins"
            value={addFormData.full_name}
            onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
            required
          />

          {/* Module Access Controls */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
              Module Access
            </label>
            
            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              {/* Registration Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-zinc-100/70 transition-colors">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 block">Registration</span>
                  <span className="text-xs text-zinc-500 block">Grant access to manage event registration and tickets.</span>
                </div>
                <input
                  type="checkbox"
                  checked={addFormData.can_access_registration}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, can_access_registration: e.target.checked })
                  }
                  className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black accent-black cursor-pointer"
                />
              </label>

              {/* Expense & Revenue Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-zinc-100/70 transition-colors border-t border-zinc-200/60 pt-3">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 block">Expense & Revenue</span>
                  <span className="text-xs text-zinc-500 block">Grant access to view and manage event financial records.</span>
                </div>
                <input
                  type="checkbox"
                  checked={addFormData.can_access_expense_revenue}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, can_access_expense_revenue: e.target.checked })
                  }
                  className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black accent-black cursor-pointer"
                />
              </label>

              {/* User Management Note */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-200/50 text-zinc-600 text-xs border-t border-zinc-200/60 mt-1">
                <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <span>
                  <strong>User Management:</strong> Sub-users never receive access to manage other users. Only Event Admins hold user management authority.
                </span>
              </div>
            </div>
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
              Add User
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit User Permissions">
        <form onSubmit={handleEditUser} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <Input
            label="Full Name *"
            value={editFormData.full_name}
            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
            required
          />

          {/* Module Access Controls */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
              Module Access
            </label>
            
            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              {/* Registration Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-zinc-100/70 transition-colors">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 block">Registration</span>
                  <span className="text-xs text-zinc-500 block">Grant access to manage event registration and tickets.</span>
                </div>
                <input
                  type="checkbox"
                  checked={editFormData.can_access_registration}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, can_access_registration: e.target.checked })
                  }
                  className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black accent-black cursor-pointer"
                />
              </label>

              {/* Expense & Revenue Toggle */}
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-zinc-100/70 transition-colors border-t border-zinc-200/60 pt-3">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 block">Expense & Revenue</span>
                  <span className="text-xs text-zinc-500 block">Grant access to view and manage event financial records.</span>
                </div>
                <input
                  type="checkbox"
                  checked={editFormData.can_access_expense_revenue}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, can_access_expense_revenue: e.target.checked })
                  }
                  className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black accent-black cursor-pointer"
                />
              </label>

              {/* User Management Note */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-200/50 text-zinc-600 text-xs border-t border-zinc-200/60 mt-1">
                <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <span>
                  <strong>User Management:</strong> Sub-users never receive access to manage other users. Only Event Admins hold user management authority.
                </span>
              </div>
            </div>
          </div>

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

      {/* CREDENTIALS POPUP MODAL */}
      <Modal
        isOpen={isCredentialsOpen}
        onClose={() => setIsCredentialsOpen(false)}
        title="User Created — Credentials"
      >
        <div className="space-y-5">
          <p className="text-xs text-zinc-600">
            Below are the generated sub-user credentials. Note: This password will remain viewable in the user list at any time.
          </p>

          {/* Name Field */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Full Name
            </label>
            <div className="font-semibold text-sm text-zinc-900">
              {createdCredentials?.name}
            </div>
          </div>

          {/* Email Field */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Generated Email
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
              Generated Password
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
                  `Name: ${createdCredentials?.name} / Email: ${createdCredentials?.email} / Password: ${createdCredentials?.password}`,
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
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Removal">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-300">
            <AlertTriangle className="w-6 h-6 text-black shrink-0" />
            <div>
              <p className="font-semibold text-sm">Remove this user from the event?</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                &quot;{selectedUser?.full_name}&quot; will lose access to this event portal.
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
            <Button variant="danger" onClick={handleDeleteUser} isLoading={actionLoading}>
              Remove User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
