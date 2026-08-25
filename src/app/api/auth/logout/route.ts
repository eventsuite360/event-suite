import { NextResponse } from 'next/server';
import { removeAdminSessionCookie } from '@/lib/session';

export async function POST() {
  await removeAdminSessionCookie();
  return NextResponse.json({ success: true, redirect: '/login' });
}
