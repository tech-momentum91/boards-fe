/**
 * DevX-owned frontend hosts — single source of truth.
 *
 * Internal hosts use VITE_API_URL (Amplify env) and skip white-label VMS tenant lookup.
 * All other `vms.{client-domain}` hosts resolve to `vms-api.{client-domain}`.
 *
 * momentum91.com is always internal for API routing. For VMS, `vms.momentum91.com` uses
 * tenant lookup when a Customer VMS domain is linked; otherwise it falls back to internal
 * (see tenant-service.js).
 */

const VMS_KIOSK_PREFIX = 'vms.';

/** Exact hostname match (apex). */
export const INTERNAL_HOST_APEX = Object.freeze(['devx.work', 'momentum91.com', 'amplifyapp.com']);

/** Subdomain suffix match (includes nested subdomains). */
export const INTERNAL_HOST_SUFFIXES = Object.freeze([
  '.devx.work',
  '.momentum91.com',
  '.amplifyapp.com',
]);

/** Base domain that may be linked as a white-label VMS client domain. */
export const MOMENTUM91_BASE_DOMAIN = 'momentum91.com';

const LOCAL_DEV_HOSTS = Object.freeze(['localhost', '127.0.0.1']);

export function normalizeHostname(hostname) {
  return String(hostname ?? '')
    .trim()
    .toLowerCase()
    .split(':')[0];
}

/**
 * White-label VMS kiosk on momentum91.com (e.g. vms.momentum91.com).
 * Only this host checks Customer VMS config; other momentum91 hosts stay internal.
 *
 * @param {string} [hostname]
 */
export function isMomentum91VmsKioskHost(hostname) {
  const host = normalizeHostname(hostname);
  if (!host.startsWith(VMS_KIOSK_PREFIX)) return false;
  const baseDomain = host.slice(VMS_KIOSK_PREFIX.length);
  return baseDomain === MOMENTUM91_BASE_DOMAIN;
}

/**
 * @param {string} [hostname]
 * @returns {boolean} True for DevX internal / local dev hosts (not white-label VMS clients).
 */
export function isInternalHost(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) return false;
  if (LOCAL_DEV_HOSTS.includes(host)) return true;
  if (INTERNAL_HOST_APEX.includes(host)) return true;
  return INTERNAL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
