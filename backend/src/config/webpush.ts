import webpush from 'web-push';

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? 'mailto:support@mediqueue.app';

/** False when VAPID keys are missing: subscribe endpoints return 503 and alerts are skipped. */
export const pushEnabled = Boolean(publicKey && privateKey);

if (pushEnabled) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
} else {
  console.warn('⚠️  VAPID keys missing: web push disabled. Run `npx web-push generate-vapid-keys`.');
}

export const vapidPublicKey = publicKey ?? null;
export { webpush };
