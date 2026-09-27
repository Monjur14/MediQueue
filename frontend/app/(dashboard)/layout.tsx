'use client';

import { useAuthStore } from '@/store/auth.store';
import { AppHeader, type AppNavLink } from '@/components/dashboard/AppHeader';
import { Footer } from '@/components/shared/Footer';

const navByRole: Record<string, AppNavLink[]> = {
  patient: [{ href: '/queue', label: 'My queue' }],
  doctor: [
    { href: '/doctor', label: 'My queue' },
    { href: '/doctor/settings', label: 'Settings' },
  ],
  tenant_admin: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/doctor', label: 'My queue' },
    { href: '/admin/queue', label: 'Receptionist' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/billing', label: 'Billing' },
  ],
  super_admin: [
    { href: '/super', label: 'Overview' },
    { href: '/super/tenants', label: 'Tenants' },
    { href: '/super/subscriptions', label: 'Subscriptions' },
    { href: '/super/doctors', label: 'Doctors' },
    { href: '/super/patients', label: 'Patients' },
    { href: '/super/revenue', label: 'Revenue' },
    { href: '/super/logs', label: 'Logs' },
    { href: '/super/messages', label: 'Messages' },
  ],
};

const STAFF_HEADER = new Set(['tenant_admin', 'doctor', 'super_admin']);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const links = user ? (navByRole[user.role] ?? []) : [];
  // Platform console tables need more room than clinic screens
  const wide = user?.role === 'super_admin';

  return (
    <div className="flex min-h-screen flex-col">
      {/* Staff roles get the shared header (tabs only when there are several sections); patients render their own */}
      {user && STAFF_HEADER.has(user.role) && <AppHeader links={links} wide={wide} />}
      <div className="flex flex-1 flex-col">
        {children}
      </div>
      {user && STAFF_HEADER.has(user.role) && <Footer wide={wide} />}
    </div>
  );
}
