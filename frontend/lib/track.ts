/**
 * Anonymous product analytics for the public site.
 *
 * Each browser gets a random visitor id (kept in localStorage) so the super admin
 * can see unique visitors. No personal data is sent. Failures are silent: tracking
 * must never break the page.
 */
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001'}/api`;
const VISITOR_KEY = 'mq_vid';

export type TrackEvent = 'home_visit' | 'login_click' | 'register_clinic_click' | 'register_patient_click';
export type TrackPlacement = 'navbar' | 'mobile_menu' | 'hero' | 'pricing' | 'final_cta' | 'page';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Private mode or storage blocked: fall back to a per-page id
    return randomId();
  }
}

export function track(event: TrackEvent, placement?: TrackPlacement) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    event,
    visitor_id: getVisitorId(),
    path: window.location.pathname,
    ...(placement ? { placement } : {}),
    ...(document.referrer ? { referrer: document.referrer.slice(0, 512) } : {}),
  });
  try {
    void fetch(`${API_BASE}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true, // survives the navigation that follows a CTA click
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/** Which event a link represents, based on where it goes. */
export function eventForHref(href: string): TrackEvent | null {
  const path = href.split(/[?#]/)[0];
  if (path === '/login') return 'login_click';
  if (path === '/register') return 'register_patient_click';
  if (path === '/register/tenant') return 'register_clinic_click';
  return null;
}
