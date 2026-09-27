/**
 * Custom service worker code. next-pwa bundles this file and imports it into the
 * generated sw.js (production builds only; the service worker is off in dev).
 *
 * Handles web push: shows the "3 patients ahead" alert and opens the queue on tap.
 */
export {};

type AlertPayload = { title: string; body: string; url: string; tag: string };

type ExtendableEventLike = Event & { waitUntil: (promise: Promise<unknown>) => void };
type PushEventLike = ExtendableEventLike & { data: { json: () => unknown } | null };
type NotificationEventLike = ExtendableEventLike & { notification: Notification };
type WindowClientLike = { url: string; focus: () => Promise<unknown>; navigate: (url: string) => Promise<unknown> };

type ServiceWorkerScope = {
  registration: ServiceWorkerRegistration;
  location: Location;
  clients: {
    matchAll: (options: { type: 'window'; includeUncontrolled: boolean }) => Promise<WindowClientLike[]>;
    openWindow: (url: string) => Promise<unknown>;
  };
  addEventListener: {
    (type: 'push', listener: (event: PushEventLike) => void): void;
    (type: 'notificationclick', listener: (event: NotificationEventLike) => void): void;
  };
};

const sw = self as unknown as ServiceWorkerScope;

const FALLBACK: AlertPayload = {
  title: 'MediQueue',
  body: 'Your queue has an update.',
  url: '/queue',
  tag: 'mediqueue',
};

function readPayload(event: PushEventLike): AlertPayload {
  try {
    const data = event.data?.json();
    if (typeof data !== 'object' || data === null) return FALLBACK;
    const d = data as Record<string, unknown>;
    const str = (key: keyof AlertPayload) => (typeof d[key] === 'string' ? (d[key] as string) : FALLBACK[key]);
    return { title: str('title'), body: str('body'), url: str('url'), tag: str('tag') };
  } catch {
    return FALLBACK;
  }
}

sw.addEventListener('push', (event) => {
  const alert = readPayload(event);
  event.waitUntil(
    sw.registration.showNotification(alert.title, {
      body: alert.body,
      tag: alert.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: alert.url },
    }),
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: unknown } | null;
  const path = typeof data?.url === 'string' ? data.url : '/queue';
  const target = new URL(path, sw.location.origin).href;

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      // Reuse an open MediQueue window instead of stacking new ones
      const open = windows.find((w) => new URL(w.url).origin === sw.location.origin);
      if (open) {
        await open.navigate(target);
        return open.focus();
      }
      return sw.clients.openWindow(target);
    }),
  );
});
