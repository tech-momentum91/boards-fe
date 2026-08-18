/**
 * Resolves the Frappe API origin (scheme + host, no path).
 *
 * - Internal hosts (see internal-hosts.ts) → VITE_API_URL
 * - vms.{client-domain} → vms-api.{client-domain} (white-label kiosk)
 * - localhost / other → VITE_API_URL (local dev)
 */

import { isInternalHost } from '@/utils/internal-hosts';

const VITE_API_ORIGIN = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const VMS_FRONTEND_PREFIX = 'vms.';
const VMS_API_PREFIX = 'vms-api.';

/** @deprecated Use {@link isInternalHost} from `@/utils/internal-hosts`. */
export { isInternalHost as isDevxWorkHost } from '@/utils/internal-hosts';

/** API origin, e.g. https://erp-api.devx.work or https://vms-api.acme.com */
export function resolveApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { hostname, protocol } = window.location;

    if (isInternalHost(hostname)) {
      return VITE_API_ORIGIN;
    }

    if (hostname.startsWith(VMS_FRONTEND_PREFIX)) {
      const clientDomain = hostname.slice(VMS_FRONTEND_PREFIX.length);
      if (clientDomain) {
        return `${protocol}//${VMS_API_PREFIX}${clientDomain}`.replace(/\/$/, '');
      }
    }
  }

  return VITE_API_ORIGIN;
}

/** Axios baseURL, e.g. https://erp-api.devx.work/api */
export function getApiBaseUrl(): string {
  const origin = resolveApiOrigin();
  return origin ? `${origin}/api` : '/api';
}
