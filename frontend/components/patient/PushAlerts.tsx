'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PushAlertsCard } from './PushAlertsCard';
import { PushPermissionDialog } from './PushPermissionDialog';

const DISMISS_KEY = 'mq:push-prompt-dismissed-at';
const ASK_AGAIN_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // "Not now" hides the popup for 3 days
const OPEN_DELAY_MS = 1200; // let the queue render before asking

/** True when "Not now" was tapped within the last 3 days (a boolean, so the snapshot is stable). */
function readRecentlyDismissed(): boolean {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    return at !== null && Date.now() - Number(at) < ASK_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

/**
 * Push opt-in for patients: an explanation popup when they open My queue, plus
 * a permanent card on the page. Both share one hook so they never disagree.
 */
export function PushAlerts() {
  const push = usePushNotifications();
  const recentlyDismissed = useSyncExternalStore(noopSubscribe, readRecentlyDismissed, () => true);
  const [delayPassed, setDelayPassed] = useState(false);
  const [dismissedNow, setDismissedNow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDelayPassed(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  // In dev, ignore the "not now" dismissal so the popup is always previewable.
  const isDev = process.env.NODE_ENV === 'development';
  const open = push.status === 'off' && delayPassed && (isDev || !recentlyDismissed) && !dismissedNow;

  // Debug helper — always logs so we can see it in both dev and prod builds.
  useEffect(() => {
    console.log('[PushAlerts]', { status: push.status, permission: typeof Notification !== 'undefined' ? Notification.permission : 'N/A', recentlyDismissed, delayPassed, open });
  });

  const dismiss = () => {
    setDismissedNow(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private mode: popup just returns next visit
    }
  };

  return (
    <>
      <PushAlertsCard {...push} />
      <PushPermissionDialog open={open} busy={push.busy} onAllow={() => void push.enable()} onDismiss={dismiss} />
    </>
  );
}
