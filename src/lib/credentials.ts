import crypto from 'crypto';

// Generate a clean, 12-character random alphanumeric password
export function generateRandomPassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate a short, clean, unique event admin email (e.g., calicutk9f@eventsuite360.com)
export function generateEventAdminEmail(slug: string): string {
  const cleanPrefix = slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase() || 'evt';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${cleanPrefix}${suffix}@eventsuite360.com`;
}

// Generate a short, clean, unique event sub-user email (e.g., sarahj4x@eventsuite360.com) based on full name
export function generateSubUserEmail(fullName: string): string {
  const cleanPrefix = fullName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase() || 'user';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${cleanPrefix}${suffix}@eventsuite360.com`;
}

