import { type NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === '/login';
  const isPlatformAdminRoute = pathname.startsWith('/admin');
  const isEventDashboardRoute = pathname.startsWith('/event-dashboard');
  const isRootPath = pathname === '/';

  const session = await getRequestSessionData(request);

  // 1. Unauthenticated Visitor
  if (!session) {
    if (isPlatformAdminRoute || isEventDashboardRoute || isRootPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2. Platform Admin Session (role === 'admin')
  if (session.role === 'admin') {
    if (isLoginPage || isRootPath || isEventDashboardRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 3. Event Admin Session (role === 'event_admin')
  if (session.role === 'event_admin') {
    if (isLoginPage || isRootPath || isPlatformAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/event-dashboard';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 4. Event Sub-User Session (role === 'event_sub_user')
  if (session.role === 'event_sub_user') {
    if (isLoginPage || isRootPath || isPlatformAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/event-dashboard';
      return NextResponse.redirect(url);
    }

    if (isEventDashboardRoute) {
      // Sub-users NEVER get access to User Management
      if (pathname === '/event-dashboard/users') {
        const url = request.nextUrl.clone();
        if (session.canAccessRegistration) {
          url.pathname = '/event-dashboard/registration';
        } else if (session.canAccessExpenseRevenue) {
          url.pathname = '/event-dashboard/finance';
        } else {
          url.pathname = '/event-dashboard/no-access';
        }
        return NextResponse.redirect(url);
      }

      // Check Registration route permission
      if (pathname === '/event-dashboard/registration' && !session.canAccessRegistration) {
        const url = request.nextUrl.clone();
        if (session.canAccessExpenseRevenue) {
          url.pathname = '/event-dashboard/finance';
        } else {
          url.pathname = '/event-dashboard/no-access';
        }
        return NextResponse.redirect(url);
      }

      // Check Expense & Revenue route permission
      if ((pathname === '/event-dashboard/finance' || pathname === '/event-dashboard/expense-revenue') && !session.canAccessExpenseRevenue) {
        const url = request.nextUrl.clone();
        if (session.canAccessRegistration) {
          url.pathname = '/event-dashboard/registration';
        } else {
          url.pathname = '/event-dashboard/no-access';
        }
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
