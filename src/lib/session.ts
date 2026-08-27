import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'admin_session';
const SECRET = process.env.SESSION_SECRET || 'event_suite_360_admin_session_secret_key_2026';

export interface SessionData {
  email: string;
  role: 'admin' | 'event_admin' | 'event_sub_user';
  eventId?: string | null;
  canAccessRegistration?: boolean;
  canAccessExpenseRevenue?: boolean;
}

function getWebCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  // Fallback for Node.js environments
  return (require('node:crypto') as any).webcrypto;
}

// Generate HMAC token for session
async function createToken(payload: string): Promise<string> {
  const webCrypto = getWebCrypto();
  const encoder = new TextEncoder();
  const key = await webCrypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await webCrypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${payload}.${hashHex}`;
}

// Verify HMAC token from session
async function verifyToken(token: string): Promise<boolean> {
  try {
    const lastDotIndex = token.lastIndexOf('.');
    if (lastDotIndex === -1) return false;

    const payload = token.substring(0, lastDotIndex);
    const expectedToken = await createToken(payload);
    return token === expectedToken;
  } catch {
    return false;
  }
}

// Set httpOnly session cookie
export async function setAdminSessionCookie(
  email: string,
  role: 'admin' | 'event_admin' | 'event_sub_user' = 'admin',
  eventId: string | null = null,
  permissions?: { canAccessRegistration?: boolean; canAccessExpenseRevenue?: boolean }
) {
  const cookieStore = await cookies();
  const timestamp = Date.now();
  const regFlag = permissions?.canAccessRegistration !== false ? '1' : '0';
  const expFlag = permissions?.canAccessExpenseRevenue !== false ? '1' : '0';
  const payload = `${email}:${role}:${eventId || 'all'}:${regFlag}:${expFlag}:${timestamp}`;
  const token = await createToken(payload);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// Clear session cookie
export async function removeAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get session data from request in Middleware / API
export async function getRequestSessionData(req: NextRequest): Promise<SessionData | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const isValid = await verifyToken(token);
  if (!isValid) return null;

  const payload = token.substring(0, token.lastIndexOf('.'));
  const parts = payload.split(':');

  if (parts.length < 2) return null;

  const email = parts[0];
  const role = parts[1] as 'admin' | 'event_admin' | 'event_sub_user';
  const eventId = parts[2] === 'all' ? null : parts[2];

  if (!email || !role) return null;

  let canAccessRegistration = true;
  let canAccessExpenseRevenue = true;

  if (role === 'event_sub_user' && parts.length >= 6) {
    canAccessRegistration = parts[3] === '1';
    canAccessExpenseRevenue = parts[4] === '1';
  }

  return {
    email,
    role,
    eventId,
    canAccessRegistration,
    canAccessExpenseRevenue,
  };
}

// Get session data in Server Components
export async function getServerSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const isValid = await verifyToken(token);
  if (!isValid) return null;

  const payload = token.substring(0, token.lastIndexOf('.'));
  const parts = payload.split(':');

  if (parts.length < 2) return null;

  const email = parts[0];
  const role = parts[1] as 'admin' | 'event_admin' | 'event_sub_user';
  const eventId = parts[2] === 'all' ? null : parts[2];

  if (!email || !role) return null;

  let canAccessRegistration = true;
  let canAccessExpenseRevenue = true;

  if (role === 'event_sub_user' && parts.length >= 6) {
    canAccessRegistration = parts[3] === '1';
    canAccessExpenseRevenue = parts[4] === '1';
  }

  return {
    email,
    role,
    eventId,
    canAccessRegistration,
    canAccessExpenseRevenue,
  };
}


// Check if user is Platform Admin (role === 'admin')
export async function isServerPlatformAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const isValid = await verifyToken(token);
  if (!isValid) return false;

  const payload = token.substring(0, token.lastIndexOf('.'));
  const [email, role] = payload.split(':');

  return !!email && role === 'admin';
}

// Check if user is Event Admin (role === 'event_admin')
export async function isServerEventAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const isValid = await verifyToken(token);
  if (!isValid) return false;

  const payload = token.substring(0, token.lastIndexOf('.'));
  const [email, role] = payload.split(':');

  return !!email && role === 'event_admin';
}

// Check if user has any valid session (admin, event_admin, or event_sub_user)
export async function isServerAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const isValid = await verifyToken(token);
  if (!isValid) return false;

  const payload = token.substring(0, token.lastIndexOf('.'));
  const [email, role] = payload.split(':');

  return !!email && (role === 'admin' || role === 'event_admin' || role === 'event_sub_user');
}
