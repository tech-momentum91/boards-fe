const VMS_KIOSK_PREFIX = 'vms.';
const VMS_API_PREFIX = 'vms-api.';

/**
 * Shared multi-tenant VMS origin for default /t/{slug} links.
 * Set per environment via `VITE_VMS_APP_URL`:
 * - local: http://localhost:5174
 * - UAT: https://staging-vms.devx.work
 * - prod: https://vms.devx.work
 */
export function getVmsAppBaseUrl() {
  const raw = String(import.meta.env.VITE_VMS_APP_URL ?? '')
    .trim()
    .replace(/\/$/, '');
  if (!raw) {
    return import.meta.env.DEV ? 'http://localhost:5174' : '';
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

/** Default path-based tenant URL: {VITE_VMS_APP_URL}/t/{slug} */
export function buildDefaultVmsTenantLink(slug) {
  const base = getVmsAppBaseUrl();
  const s = String(slug ?? '')
    .trim()
    .toLowerCase();
  if (!base || !s) return '';
  return `${base}/t/${s}`;
}

/**
 * Store only the client base domain (e.g. msglobal.com).
 * Strips protocol, paths, and vms. / vms-api. prefixes if pasted by mistake.
 */
export function normalizeVmsBaseDomain(raw) {
  let value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!value) return '';

  value = value
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];

  if (value.startsWith(VMS_API_PREFIX)) {
    value = value.slice(VMS_API_PREFIX.length);
  } else if (value.startsWith(VMS_KIOSK_PREFIX)) {
    value = value.slice(VMS_KIOSK_PREFIX.length);
  }

  return value.trim();
}

export function vmsKioskHost(baseDomain) {
  const base = normalizeVmsBaseDomain(baseDomain);
  return base ? `${VMS_KIOSK_PREFIX}${base}` : '';
}

export function vmsApiHost(baseDomain) {
  const base = normalizeVmsBaseDomain(baseDomain);
  return base ? `${VMS_API_PREFIX}${base}` : '';
}

export function isValidVmsBaseDomain(baseDomain) {
  const base = normalizeVmsBaseDomain(baseDomain);
  if (!base) return false;
  if (base.includes(' ')) return false;
  return base.includes('.');
}
