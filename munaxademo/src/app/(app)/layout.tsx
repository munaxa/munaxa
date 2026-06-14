import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { AppProviders } from '@/components/app-providers';

/**
 * Server guard for every authenticated page. The middleware already blocks unsigned
 * requests; this re-checks server-side and feeds the verified org/admin claims into
 * the client provider stack. No data is fetched from any backend — there isn't one.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return (
    <AppProviders org={session.org} isAdmin={session.admin}>
      {children}
    </AppProviders>
  );
}
