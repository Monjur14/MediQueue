import { z } from 'zod';

/** Every event the public site may record. Anything else is rejected. */
export const TRACKED_EVENTS = [
  'home_visit',
  'login_click',
  'register_clinic_click',
  'register_patient_click',
] as const;

export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

export const PLACEMENTS = ['navbar', 'mobile_menu', 'hero', 'pricing', 'final_cta', 'page'] as const;

export const trackEventSchema = z.object({
  event:      z.enum(TRACKED_EVENTS),
  visitor_id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Invalid visitor id'),
  path:       z.string().max(255).optional(),
  placement:  z.enum(PLACEMENTS).optional(),
  referrer:   z.string().max(512).optional(),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
