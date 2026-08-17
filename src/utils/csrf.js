/**
 * Frappe sets a `csrf_token` cookie for authenticated browser sessions.
 * Used by axios (unsafe methods) and keepalive fetch beacons.
 */
export function getCachedCsrfToken() {
  try {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}
