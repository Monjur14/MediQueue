'use client';

import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';
import { InstallButton } from '@/components/pwa/InstallButton';

const SEGMENT = cn(
  'px-3 text-sm text-mq-muted transition-colors duration-500 hover:bg-mq-ground hover:text-mq-ink',
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mq-accent',
  EASE,
);

/** Header account section for every signed-in role: install app | log out, in one hairline bar. */
export function AccountBar() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-10 items-stretch divide-x divide-mq-line border border-mq-line bg-white">
      <InstallButton className={SEGMENT} labelClassName="hidden sm:inline" />
      <button type="button" onClick={() => void logout()} className={cn(SEGMENT, 'flex items-center gap-2')}>
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        <span>Log out</span>
      </button>
    </div>
  );
}
