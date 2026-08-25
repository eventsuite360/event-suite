export type UserRole = 'admin';

export type EventStatus = 'draft' | 'published' | 'archived';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface EventItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: EventStatus;
  event_admin_email?: string | null;
  event_admin_password?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile | null;
}

export interface AdminStats {
  totalEvents: number;
  draftEvents: number;
  publishedEvents: number;
  archivedEvents: number;
  totalUsers: number;
}

export interface EventUser {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  password?: string;
  can_access_registration: boolean;
  can_access_expense_revenue: boolean;
  created_at: string;
}

