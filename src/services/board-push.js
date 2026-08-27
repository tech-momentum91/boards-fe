/**
 * Register the boards push service worker and subscribe the current browser.
 * No-ops when VAPID is not configured or Notification permission is denied.
 */
import {
  getBoardPushPublicKey,
  subscribeBoardPush,
} from '@/services/inbox-service';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function getBoardPushPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function ensureBoardPushSubscription() {
  if (typeof window === 'undefined') return { skipped: true };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    return { skipped: true, reason: 'unsupported' };
  }

  // Ask immediately — Chrome/Safari ignore requestPermission() after an await
  // or when it is not tied to a user click.
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { skipped: true, reason: permission === 'denied' ? 'denied' : 'dismissed' };
  }

  const keyResult = await getBoardPushPublicKey();
  if (keyResult.error || !keyResult.publicKey) {
    return { skipped: true, reason: 'no_vapid' };
  }

  const registration = await navigator.serviceWorker.register('/board-sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyResult.publicKey),
    });
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return { error: 'Invalid push subscription keys' };
  }

  const save = await subscribeBoardPush({ endpoint, p256dh, auth });
  if (save.error) return { error: save.error };
  return { success: true };
}
