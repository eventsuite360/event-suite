'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  PieChart as PieChartIcon,
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/admin/StatCard';
import { PieChart } from '@/components/ui/PieChart';
import {
  RegistrationItem,
  exportRegistrationsToCSV,
  exportRegistrationsToPDF,
  parseCSVRegistrations,
  ParsedRegistrationRow,
} from '@/lib/registration-export';

export default function EventRegistrationPage() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [analytics, setAnalytics] = useState<{
    total: number;
    gender: { Male: number; Female: number; Other: number };
    age: { '0-18': number; '19-30': number; '31-45': number; '46+': number };
  } | null>(null);

  const [userRole, setUserRole] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<RegistrationItem | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    full_name: string;
    phone_number: string;
    gender: string;
    age: string;
    email: string;
  }>({
    full_name: '',
    phone_number: '',
    gender: 'Male',
    age: '',
    email: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<ParsedRegistrationRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [paginationInfo, setPaginationInfo] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({ total: 0, page: 1, limit: 25, totalPages: 1 });

  // Export Loading State
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch registrations fresh from Supabase via API with pagination
  const fetchRegistrationData = useCallback(async (targetPage = page) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/event-dashboard/registration?page=${targetPage}&limit=${pageSize}`);
      const data = await res.json();
      if (res.ok) {
        setRegistrations(data.registrations || []);
        setAnalytics(data.analytics || null);
        if (data.pagination) {
          setPaginationInfo(data.pagination);
          setPage(data.pagination.page);
        }
        setUserRole(data.userRole || '');
        setCurrentUserEmail(data.currentUserEmail || '');
      } else {
        setFetchError(data.error || 'Failed to fetch registration entries.');
      }
    } catch (err: any) {
      setFetchError(err.message || 'An error occurred while fetching registration data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchRegistrationData(page);
  }, [fetchRegistrationData, page]);

  // Full Export CSV Handler (fetches all pages)
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/event-dashboard/registration?limit=all');
      const data = await res.json();
      if (res.ok && data.registrations) {
        exportRegistrationsToCSV(data.registrations);
      } else {
        exportRegistrationsToCSV(registrations);
      }
    } catch {
      exportRegistrationsToCSV(registrations);
    } finally {
      setExportLoading(false);
    }
  };

  // Full Export PDF Handler (fetches all pages)
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/event-dashboard/registration?limit=all');
      const data = await res.json();
      if (res.ok && data.registrations) {
        exportRegistrationsToPDF(data.registrations);
      } else {
        exportRegistrationsToPDF(registrations);
      }
    } catch {
      exportRegistrationsToPDF(registrations);
    } finally {
      setExportLoading(false);
    }
  };

  // Open Modals
  const openAddModal = () => {
    setFormData({
      full_name: '',
      phone_number: '',
      gender: 'Male',
      age: '',
      email: '',
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (entry: RegistrationItem) => {
    setSelectedEntry(entry);
    setFormData({
      full_name: entry.full_name,
      phone_number: entry.phone_number,
      gender: entry.gender || 'Male',
      age: entry.age ? entry.age.toString() : '',
      email: entry.email,
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (entry: RegistrationItem) => {
    setSelectedEntry(entry);
    setIsDeleteOpen(true);
  };

  const openImportModal = () => {
    setCsvFile(null);
    setCsvPreviewRows([]);
    setCsvErrors([]);
    setImportSuccessMessage(null);
    setFormError(null);
    setIsImportOpen(true);
  };

  const openDeleteAllModal = () => {
    setDeleteAllConfirmInput('');
    setFormError(null);
    setIsDeleteAllOpen(true);
  };

  // Submit Add
  const handleAddRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.full_name.trim()) {
      setFormError('Full Name is required.');
      return;
    }
    if (!formData.phone_number.trim()) {
      setFormError('Phone Number is required.');
      return;
    }
    if (!formData.gender) {
      setFormError('Gender is required.');
      return;
    }
    const numAge = parseInt(formData.age, 10);
    if (isNaN(numAge) || numAge < 0) {
      setFormError('Please enter a valid age.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/event-dashboard/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
          gender: formData.gender,
          age: numAge,
          email: formData.email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to add registration.');
        setActionLoading(false);
        return;
      }

      setIsAddOpen(false);
      fetchRegistrationData();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit
  const handleEditRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setFormError(null);

    if (!formData.full_name.trim()) {
      setFormError('Full Name is required.');
      return;
    }
    if (!formData.phone_number.trim()) {
      setFormError('Phone Number is required.');
      return;
    }
    if (!formData.gender) {
      setFormError('Gender is required.');
      return;
    }
    const numAge = parseInt(formData.age, 10);
    if (isNaN(numAge) || numAge < 0) {
      setFormError('Please enter a valid age.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/event-dashboard/registration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
          gender: formData.gender,
          age: numAge,
          email: formData.email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to update registration.');
        setActionLoading(false);
        return;
      }

      setIsEditOpen(false);
      setSelectedEntry(null);
      fetchRegistrationData();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Delete
  const handleDeleteRegistration = async () => {
    if (!selectedEntry) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/event-dashboard/registration?id=${selectedEntry.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete registration.');
        setActionLoading(false);
        return;
      }

      setIsDeleteOpen(false);
      setSelectedEntry(null);
      fetchRegistrationData();
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting entry.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Delete All
  const handleDeleteAllRegistrations = async () => {
    if (deleteAllConfirmInput.trim().toUpperCase() !== 'DELETE') {
      setFormError('Please type "DELETE" to confirm mass deletion.');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      const res = await fetch('/api/event-dashboard/registration?all=true', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to delete registrations.');
        setActionLoading(false);
        return;
      }

      setIsDeleteAllOpen(false);
      fetchRegistrationData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while deleting all registrations.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle CSV File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvErrors([]);
    setCsvPreviewRows([]);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      const { validRows, errors } = parseCSVRegistrations(text);
      setCsvPreviewRows(validRows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  // Submit CSV Import
  const handleImportCSV = async () => {
    if (csvPreviewRows.length === 0) {
      setFormError('No valid registration rows found to import.');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      const res = await fetch('/api/event-dashboard/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrations: csvPreviewRows,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to import CSV registrations.');
        setActionLoading(false);
        return;
      }

      setImportSuccessMessage(data.message || `Successfully imported ${csvPreviewRows.length} entries.`);
      setTimeout(() => {
        setIsImportOpen(false);
        fetchRegistrationData();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred during CSV import.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter registrations locally by search & gender filter
  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone_number.includes(searchQuery) ||
      (r.created_by_user_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGender =
      genderFilter === 'all' || r.gender.toLowerCase() === genderFilter.toLowerCase();

    return matchesSearch && matchesGender;
  });

  const isSubUser = userRole === 'event_sub_user';
  const isAdmin = userRole === 'event_admin' || userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Event Registrations</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isSubUser
              ? 'View and manage attendee registrations created by your account.'
              : 'Comprehensive attendee registration management, monochrome analytics, and bulk operations.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Admin Export & Import Buttons */}
          {isAdmin && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5"
                disabled={exportLoading || (paginationInfo.total === 0 && registrations.length === 0)}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exportLoading ? 'Exporting...' : 'Export CSV'}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5"
                disabled={exportLoading || (paginationInfo.total === 0 && registrations.length === 0)}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{exportLoading ? 'Exporting...' : 'Export PDF'}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={openImportModal}
                className="inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={openDeleteAllModal}
                className="inline-flex items-center gap-1.5 border-zinc-200 hover:bg-zinc-100 text-zinc-900"
                disabled={registrations.length === 0}
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-700" />
                <span>Delete All</span>
              </Button>
            </>
          )}

          {/* Add Registration Button (Visible to Sub-users with access AND Admins) */}
          <Button onClick={openAddModal} size="sm" className="inline-flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800">
            <Plus className="w-4 h-4" />
            <span>Add Registration</span>
          </Button>
        </div>
      </div>

      {fetchError && (
        <Card className="p-4 bg-red-50 border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{fetchError}</span>
        </Card>
      )}

      {/* Admin Analytics Overview Section (Rendered ONLY for Event Admin & Core Admin) */}
      {isAdmin && analytics && (
        <div className="space-y-4">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Registrations"
              value={analytics.total.toString()}
              icon={Users}
              description="Fresh sync"
            />
            <StatCard
              title="Gender Diversity"
              value={`${analytics.gender.Male} Male / ${analytics.gender.Female} Female`}
              icon={PieChartIcon}
              description={`${analytics.gender.Other} Other`}
            />
            <StatCard
              title="Primary Age Group"
              value={
                Object.entries(analytics.age).reduce((a, b) => (b[1] > a[1] ? b : a))[0] + ' yrs'
              }
              icon={UserCheck}
              description="Largest cohort"
            />
          </div>

          {/* Monochrome Interactive Pie Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender Breakdown Pie Chart */}
            <Card className="p-5 border-zinc-200 bg-white flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-zinc-700" />
                  Gender Distribution
                </h3>
                <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-700">
                  {analytics.total} Total
                </Badge>
              </div>

              <PieChart
                data={[
                  { name: 'Male', value: analytics.gender.Male, color: '#18181b' },
                  { name: 'Female', value: analytics.gender.Female, color: '#52525b' },
                  { name: 'Other', value: analytics.gender.Other, color: '#a1a1aa' },
                ]}
                size={170}
              />
            </Card>

            {/* Age Range Breakdown Pie Chart */}
            <Card className="p-5 border-zinc-200 bg-white flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-700" />
                  Age Range Breakdown
                </h3>
                <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-700">
                  4 Cohorts
                </Badge>
              </div>

              <PieChart
                data={[
                  { name: '0–18 yrs', value: analytics.age['0-18'], color: '#09090b' },
                  { name: '19–30 yrs', value: analytics.age['19-30'], color: '#3f3f46' },
                  { name: '31–45 yrs', value: analytics.age['31-45'], color: '#71717a' },
                  { name: '46+ yrs', value: analytics.age['46+'], color: '#d4d4d8' },
                ]}
                size={170}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="p-4 sm:p-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder={isAdmin ? 'Search name, email, phone, creator...' : 'Search name, email, phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-zinc-500 font-medium">Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="h-9 px-3 py-1 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900 font-medium focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 animate-pulse rounded-lg w-full" />
            ))}
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
            <Users className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-900">No registrations found</p>
            <p className="text-xs text-zinc-500 mt-1">
              {searchQuery || genderFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : isSubUser
                ? 'You have not added any registrations yet. Click "Add Registration" to create your first entry.'
                : 'Click "Add Registration" or "Import CSV" to start adding attendee records.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border border-zinc-200 rounded-xl min-w-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Age</th>
                    <th className="py-3 px-4">Email</th>
                    {isAdmin && <th className="py-3 px-4">Added By</th>}
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {filteredRegistrations.map((r) => {
                    const isOwnEntry =
                      r.created_by_user_id.toLowerCase() === currentUserEmail.toLowerCase();
                    const canEdit = isAdmin || isOwnEntry;

                    return (
                      <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-zinc-900">{r.full_name}</td>
                        <td className="py-3.5 px-4 font-mono text-zinc-700">{r.phone_number}</td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize bg-zinc-50 text-zinc-800 border-zinc-200"
                          >
                            {r.gender}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-700">{r.age} yrs</td>
                        <td className="py-3.5 px-4 text-zinc-700">{r.email}</td>

                        {/* Added By column rendered ONLY for Admins */}
                        {isAdmin && (
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-medium text-[11px]">
                              {r.created_by_user_name || r.created_by_user_id}
                            </span>
                          </td>
                        )}

                        <td className="py-3.5 px-4 text-zinc-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(r)}
                                className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors"
                                title="Edit Registration"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete button rendered ONLY for Event Admin / Platform Admin */}
                            {isAdmin && (
                              <button
                                onClick={() => openDeleteModal(r)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                                title="Delete Registration"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {paginationInfo.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-zinc-200 text-xs text-zinc-600">
                <div>
                  Showing{' '}
                  <strong className="font-semibold text-zinc-900">
                    {Math.min((page - 1) * pageSize + 1, paginationInfo.total)}
                  </strong>{' '}
                  to{' '}
                  <strong className="font-semibold text-zinc-900">
                    {Math.min(page * pageSize, paginationInfo.total)}
                  </strong>{' '}
                  of <strong className="font-semibold text-zinc-900">{paginationInfo.total}</strong> registrations
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
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
                    variant="secondary"
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

      {/* 1. Add Registration Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Registration">
        <form onSubmit={handleAddRegistration} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. +1 555-0199"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-9 px-3 py-1 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900 font-medium focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Age <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                required
                min="0"
                placeholder="e.g. 28"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                required
                placeholder="e.g. john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading}
              className="bg-black text-white hover:bg-zinc-800"
            >
              {actionLoading ? 'Saving to Database...' : 'Save Registration'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Registration Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Registration">
        <form onSubmit={handleEditRegistration} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">Full Name</label>
            <Input
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">Phone Number</label>
              <Input
                required
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-9 px-3 py-1 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900 font-medium focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">Age</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">Email</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading}
              className="bg-black text-white hover:bg-zinc-800"
            >
              {actionLoading ? 'Updating Database...' : 'Update Registration'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Delete Confirmation Modal (Admins only) */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Registration">
        <div className="space-y-4">
          <p className="text-xs text-zinc-600">
            Are you sure you want to delete the registration for{' '}
            <strong className="text-zinc-900">{selectedEntry?.full_name}</strong>? This action cannot
            be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoading}
              onClick={handleDeleteRegistration}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {actionLoading ? 'Deleting...' : 'Delete Registration'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Import CSV Modal (Admins only) */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Registrations from CSV">
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            Select a CSV file containing attendee details. Required headers: <code>Full Name</code>,{' '}
            <code>Phone Number</code>, <code>Gender</code>, <code>Age</code>, <code>Email</code>.
          </p>

          {importSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMessage}</span>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center bg-zinc-50 hover:bg-zinc-100/50 transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mb-2"
            >
              Choose CSV File
            </Button>
            <p className="text-[11px] text-zinc-500">
              {csvFile ? csvFile.name : 'No file selected (.csv only)'}
            </p>
          </div>

          {/* Validation Errors / Warnings */}
          {csvErrors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1 max-h-32 overflow-y-auto">
              <div className="font-semibold flex items-center gap-1 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" /> CSV Parsing Warnings ({csvErrors.length}):
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                {csvErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Valid Rows Preview */}
          {csvPreviewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-800">
                <span>Preview ({csvPreviewRows.length} valid rows ready for import)</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  Ready
                </Badge>
              </div>

              <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-lg text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-zinc-100 sticky top-0 font-semibold text-zinc-700">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Gender</th>
                      <th className="p-2">Age</th>
                      <th className="p-2">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {csvPreviewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="p-2 font-medium">{row.full_name}</td>
                        <td className="p-2">{row.phone_number}</td>
                        <td className="p-2">{row.gender}</td>
                        <td className="p-2">{row.age}</td>
                        <td className="p-2">{row.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoading || csvPreviewRows.length === 0}
              onClick={handleImportCSV}
              className="bg-black text-white hover:bg-zinc-800"
            >
              {actionLoading ? 'Bulk Inserting to Database...' : `Import ${csvPreviewRows.length} Registrations`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Delete All Confirmation Modal (Event Admin & Core Admin only) */}
      <Modal isOpen={isDeleteAllOpen} onClose={() => setIsDeleteAllOpen(false)} title="Delete All Registrations">
        <div className="space-y-4">
          <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-xl text-zinc-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-zinc-900">WARNING: Permanent Deletion</p>
              <p className="text-zinc-600">
                This will permanently delete ALL <strong className="text-zinc-900 font-bold">{registrations.length} registration entries</strong> for this event from the database.
              </p>
              <p className="text-zinc-500 font-medium">
                &bull; This action cannot be undone.<br />
                &bull; This will NOT affect financial entries, event sub-users, or any other event data.
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
              To confirm, please type <code className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 font-mono text-black font-bold">DELETE</code> below:
            </label>
            <Input
              placeholder="Type DELETE to confirm"
              value={deleteAllConfirmInput}
              onChange={(e) => setDeleteAllConfirmInput(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsDeleteAllOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoading || deleteAllConfirmInput.trim().toUpperCase() !== 'DELETE'}
              onClick={handleDeleteAllRegistrations}
              className="bg-black text-white hover:bg-zinc-800 font-semibold"
            >
              {actionLoading ? 'Deleting All Registrations...' : 'Yes, Delete All Registrations'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
