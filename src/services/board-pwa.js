/**
 * Boards PWA helpers: early service-worker registration (installability) and
 * install / Home Screen detection for Chrome + iOS Safari.
 */

const DISMISS_KEY = 'boards.pwaInstall.dismissed';
const SW_URL = '/board-sw.js';

let deferredInstallPrompt = null;
const deferredPromptListeners = new Set();

function notifyDeferredPrompt(event) {
  deferredInstallPrompt = event;
  deferredPromptListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('PWA deferred-prompt listener threw:', err);
    }
  });
}

/**
 * Register the push/PWA service worker as soon as the app loads.
 * Chrome requires a controlling SW before the install prompt can appear.
 */
export async function registerBoardServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Failed to register board service worker:', err);
    return null;
  }
}

/**
 * Capture beforeinstallprompt so the UI can trigger install later.
 * Call once at app startup.
 */
export function listenForBoardPwaInstall() {
  if (typeof window === 'undefined') return () => {};

  const onBeforeInstall = (event) => {
    event.preventDefault();
    notifyDeferredPrompt(event);
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  };
}

export function onBoardPwaDeferredPrompt(listener) {
  if (typeof listener !== 'function') return () => {};
  deferredPromptListeners.add(listener);
  if (deferredInstallPrompt) {
    listener(deferredInstallPrompt);
  }
  return () => {
    deferredPromptListeners.delete(listener);
  };
}

export function getBoardPwaDeferredPrompt() {
  return deferredInstallPrompt;
}

export async function promptBoardPwaInstall() {
  const event = deferredInstallPrompt;
  if (!event) return { outcome: 'unavailable' };

  deferredInstallPrompt = null;
  await event.prompt();
  const choice = await event.userChoice;
  return { outcome: choice?.outcome || 'dismissed' };
}

export function isBoardPwaStandalone() {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches;
  // iOS Safari legacy flag when launched from Home Screen
  const iosStandalone = window.navigator.standalone === true;
  return Boolean(mq || iosStandalone);
}

export function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeIos = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chromeIos;
}

export function wasBoardPwaInstallDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissBoardPwaInstall() {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore quota */
  }
}

export function clearBoardPwaInstallDismiss() {
  try {
    window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
