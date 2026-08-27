/**
 * Register the boards push service worker and subscribe the current browser.
 * No-ops when VAPID is not configured or Notification permission is denied.
 */
import {
  getBoardPushPublicKey,
  subscribeBoardPush,
  unsubscribeBoardPush,
} from '@/services/inbox-service';
import { registerBoardServiceWorker } from '@/services/board-pwa';

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

  const registration = await registerBoardServiceWorker();
  if (!registration) {
    return { skipped: true, reason: 'unsupported' };
  }

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

/**
 * Drop the browser PushManager subscription and remove it from the server.
 * Call this while the session is still valid (before /method/logout) so the
 * server row can be deleted; browser unsubscribe still runs if the API fails.
 */
export async function clearBoardPushSubscription() {
  if (typeof window === 'undefined') return { skipped: true };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { skipped: true, reason: 'unsupported' };
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration('/')) ||
      (await navigator.serviceWorker.getRegistration());
    if (!registration) {
      return { skipped: true, reason: 'no_registration' };
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { skipped: true, reason: 'no_subscription' };
    }

    const endpoint = subscription.endpoint;
    let serverError = null;
    if (endpoint) {
      const result = await unsubscribeBoardPush(endpoint);
      if (result?.error) {
        serverError = result.error;
      }
    }

    await subscription.unsubscribe();
    return serverError ? { success: true, serverError } : { success: true };
  } catch (err) {
    console.error('Failed to clear board push subscription:', err);
    return { error: err?.message || 'Failed to clear push subscription' };
  }
}
