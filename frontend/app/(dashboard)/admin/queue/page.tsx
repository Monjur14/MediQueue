'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useTodaySessions } from '@/hooks/api/doctor';
import { ButtonLink } from '@/components/shared/primitives';
import { EmptyPanel, ListSkeleton } from '@/components/admin/TabHeader';
import { ReceptionSessionPanel } from '@/components/reception/ReceptionSessionPanel';

export default function ReceptionistDeskPage() {
  const { user, loading } = useRequireAuth(['tenant_admin']);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: sessions, isLoading } = useTodaySessions();
  const open = sessions?.filter((s) => s.status !== 'closed') ?? [];

  if (loading || !user) return null;

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">Receptionist desk</h1>
      <p className="mt-1 text-sm text-mq-muted">
        Give tokens to patients as they arrive. They must already have a MediQueue account with this phone number.
      </p>

      <div className="mt-8 space-y-6">
        {isLoading ? (
          <ListSkeleton />
        ) : open.length === 0 ? (
          <EmptyPanel
            title="No queues open"
            body="A queue has to be open before you can give tokens. Open one from the dashboard."
            action={<ButtonLink href="/admin" variant="secondary" size="sm">Go to dashboard</ButtonLink>}
          />
        ) : (
          open.map((s) => <ReceptionSessionPanel key={s.id} session={s} accessToken={accessToken} />)
        )}
      </div>
    </main>
  );
}
