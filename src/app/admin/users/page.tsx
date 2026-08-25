'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, Users, Search, Edit3, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { Profile } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'admin',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        console.error('Error fetching users:', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'admin',
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email || '',
      password: '',
      role: user.role || 'admin',
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (user: Profile) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.full_name || !formData.email || !formData.password) {
      setFormError('Name, email, and password are required.');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create user.');
        setActionLoading(false);
        return;
      }

      setIsCreateOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while creating user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormError(null);
    if (!formData.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          full_name: formData.full_name,
          role: formData.role,
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
      setFormError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete user.');
        setActionLoading(false);
        return;
      }

      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      u.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">User Management</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage administrator accounts, security credentials, and access roles.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0">
          <UserPlus className="w-4 h-4" />
          <span>Invite / Create User</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-3" />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Users className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="font-semibold text-zinc-700 text-base">No users found</p>
            <p className="text-xs text-zinc-400 mt-1">
              {searchQuery ? 'No users matching your search query.' : 'No users exist in the system.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="py-3.5 px-6">User / Full Name</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-zinc-900">{user.full_name}</div>
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-medium">
                      {user.email || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="admin" className="gap-1">
                        <Shield className="w-3 h-3" />
                        <span>{user.role}</span>
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(user)}
                        title="Edit User"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openDeleteModal(user)}
                        title="Delete User"
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

      {/* CREATE USER MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Admin User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <Input
            label="Full Name *"
            placeholder="e.g. Sarah Jenkins"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />

          <Input
            label="Email Address *"
            type="email"
            placeholder="sarah.admin@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Initial Password *"
            type="password"
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            helperText="User can log in immediately using this password"
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">User Role</label>
            <select
              className="w-full px-3.5 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-black"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="admin">Administrator (admin)</option>
            </select>
          </div>

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
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit User Account">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-medium border border-zinc-300">
              {formError}
            </div>
          )}

          <Input
            label="Full Name *"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            disabled
            helperText="Email address cannot be modified once registered"
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
            <select
              className="w-full px-3.5 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-black"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="admin">Administrator (admin)</option>
            </select>
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

      {/* DELETE USER CONFIRMATION MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete User Account">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-300">
            <AlertTriangle className="w-6 h-6 text-black shrink-0" />
            <div>
              <p className="font-semibold text-sm">Are you sure you want to delete this user account?</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}) will be permanently removed from authentication and profiles.
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
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
