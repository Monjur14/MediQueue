'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import {
  usePushPublicKey,
  useSavePushSubscription,
  useDeletePushSubscription,
  type PushSubscriptionBody,
} from '@/hooks/api/push';

/**
 * checking      — reading browser state
 * unsupported   — no Push API / no service worker
 * needs-install — iPhone/iPad in Safari: push only works from the installed app
 * denied        — user blocked notifications for this site
 * off / on      — this browser is (not) subscribed
 */
export type PushStatus = 'checking' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

type Support = 'checking' | 'supported' | 'unsupported' | 'needs-install';

function readSupport(): Support {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isIos && !standalone) return 'needs-install';
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return ok ? 'supported' : 'unsupported';
}

const noopSubscribe = () => () => {};

/** VAPID keys are base64url; PushManager wants the raw bytes. */
function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function toBody(sub: PushSubscription): PushSubscriptionBody | null {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh, auth } };
}

export function usePushNotifications() {
  // Use plain state (not useSyncExternalStore) so the re-render after mount is guaranteed.
  const [support, setSupport] = useState<Support>('checking');
  const [state, setState] = useState<'checking' | 'unsupported' | 'denied' | 'off' | 'on'>('checking');
  const [busy, setBusy] = useState(false);

  // Detect browser support on mount (client-only APIs).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport(readSupport());
  }, []);

  const publicKey = usePushPublicKey(support === 'supported');
  const save = useSavePushSubscription();
  const remove = useDeletePushSubscription();

  // Once support is confirmed, read the current push subscription state.
  useEffect(() => {
    if (support !== 'supported') return;

    // Dev mode: no SW — read Notification.permission synchronously so StrictMode's
    // double-invoke can't cancel the state update via the cancelled flag.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(
        Notification.permission === 'denied' ? 'denied' :
        Notification.permission === 'granted' ? 'on' : 'off'
      );
      return;
    }

    // Production: SW is active — async check.
    let cancelled = false;
    const check = async (): Promise<'unsupported' | 'denied' | 'off' | 'on'> => {
      const reg = await navigator.serviceWorker.ready;
      if (Notification.permission === 'denied') return 'denied';
      const sub = await reg.pushManager.getSubscription();
      return sub && Notification.permission === 'granted' ? 'on' : 'off';
    };
    check()
      .then((next) => { if (!cancelled) setState(next); })
      .catch(() => { if (!cancelled) setState('unsupported'); });
    return () => { cancelled = true; };
  }, [support]);

  const enable = async () => {
    setBusy(true);
    try {
      // Dev mode: no service worker — just trigger the browser permission dialog for UI preview.
      if (process.env.NODE_ENV === 'development') {
        const permission = await Notification.requestPermission();
        setState(permission === 'granted' ? 'on' : permission === 'denied' ? 'denied' : 'off');
        if (permission === 'granted') toast.success('Alerts on (preview — use production build to fully subscribe).');
        return;
      }

      if (!publicKey.data) {
        toast.error('Alerts are not available right now. Please try again later.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey.data) }));
      const body = toBody(sub);
      if (!body) throw new Error('Invalid subscription');
      await save.mutateAsync(body);
      setState('on');
      toast.success('Alerts turned on.');
    } catch {
      toast.error('Could not turn on alerts. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove.mutateAsync(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
      toast.success('Alerts turned off.');
    } catch {
      toast.error('Could not turn off alerts. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const status: PushStatus = support === 'supported' ? state : support;
  return { status, busy, enable, disable };
}
