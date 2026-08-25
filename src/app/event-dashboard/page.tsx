import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';

export default async function EventDashboardIndexPage() {
  const session = await getServerSession();

  if (session?.role === 'event_sub_user') {
    if (session.canAccessRegistration) {
      redirect('/event-dashboard/registration');
    } else if (session.canAccessExpenseRevenue) {
      redirect('/event-dashboard/finance');
    } else {
      redirect('/event-dashboard/no-access');
    }
  }

  redirect('/event-dashboard/users');
}
