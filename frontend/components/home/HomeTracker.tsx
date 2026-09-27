'use client';

import { useEffect } from 'react';
import { eventForHref, track, type TrackPlacement } from '@/lib/track';

const PLACEMENTS = new Set<TrackPlacement>(['navbar', 'mobile_menu', 'hero', 'pricing', 'final_cta']);

let visitSent = false; // one visit per page load, even under StrictMode double effects

/** Where on the page a link sits: nearest data-track-placement, the register dropdown, or its section id. */
function placementFor(el: Element): TrackPlacement {
  const tagged = el.closest<HTMLElement>('[data-track-placement]')?.dataset.trackPlacement;
  if (tagged && PLACEMENTS.has(tagged as TrackPlacement)) return tagged as TrackPlacement;
  if (el.closest('[role="menu"]')) return 'navbar'; // Radix dropdown renders in a portal
  const section = el.closest('section[id]')?.id;
  if (section && PLACEMENTS.has(section as TrackPlacement)) return section as TrackPlacement;
  return 'page';
}

/**
 * Records the homepage visit and every Log in / Register click, without touching each button:
 * one delegated listener maps the link destination to an event.
 */
export function HomeTracker() {
  useEffect(() => {
    if (!visitSent) {
      visitSent = true;
      track('home_visit', 'page');
    }

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (!link) return;
      const event = eventForHref(link.getAttribute('href') ?? '');
      if (event) track(event, placementFor(link));
    };

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
