'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { ProfileForm } from '@/components/patient/ProfileForm';

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile" className="border border-mq-line bg-white p-6 md:p-8">
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse bg-mq-line" />
        <div className="h-10 w-full animate-pulse bg-mq-line" />
        <div className="h-10 w-full animate-pulse bg-mq-line" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { loading, user } = useRequireAuth(['patient']);
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div>
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center bg-mq-ink text-base font-semibold text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">
            {user?.name ?? 'Profile'}
          </h1>
          <p className="truncate text-sm text-mq-muted">{user?.email}</p>
        </div>
      </div>

      <div className="mt-8">{loading || !user ? <ProfileSkeleton /> : <ProfileForm />}</div>
    </div>
  );
}
