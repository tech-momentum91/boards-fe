import {
  encodeLayoutAssetPath,
  extractFrappeFilePathFromUrl,
  toLayoutAssetUrl,
} from '@/utils/layout-asset-url';

/**
 * Backend may return a string path or a Frappe file object { file_url }.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function pickLayoutFilePath(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.file_url || value.fileUrl || value.url || '';
  }
  return '';
}

/**
 * Prefer Frappe-relative paths over direct object-storage URLs.
 *
 * @param {string} rawPath
 * @returns {string}
 */
export function normalizeLayoutImagePath(rawPath) {
  const trimmed = String(rawPath || '').trim();
  if (!trimmed) return '';

  const frappePath = extractFrappeFilePathFromUrl(trimmed);
  if (frappePath) return frappePath;

  // Keep Frappe API proxy URLs intact (query params required for proxy_layout_image).
  if (trimmed.startsWith('/api/')) return trimmed;
  if (/^https?:\/\//u.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/api/')) {
        return `${parsed.pathname}${parsed.search || ''}`;
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Canvas/export path: Frappe proxy first, then relative file path — never raw S3.
 *
 * @param {object | null | undefined} record
 * @returns {string}
 */
export function getLayoutExportImagePathFromRecord(record) {
  if (!record || typeof record !== 'object') return '';

  const proxyUrl = pickLayoutFilePath(record.layout_image_proxy_url);
  if (proxyUrl) {
    return normalizeLayoutImagePath(proxyUrl) || proxyUrl;
  }

  const rawCandidates = [
    pickLayoutFilePath(record.layout_image),
    pickLayoutFilePath(record.layout_image_url),
    pickLayoutFilePath(record.image),
    pickLayoutFilePath(record.thumbnail),
    pickLayoutFilePath(record.file),
  ].filter(Boolean);

  for (const candidate of rawCandidates) {
    const normalized = normalizeLayoutImagePath(candidate);
    if (normalized.startsWith('/files/') || normalized.startsWith('/private/')) {
      return normalized;
    }
  }

  return normalizeLayoutImagePath(rawCandidates[0] || '');
}

/**
 * Display path from floor detail / layout list row (S3 URL allowed for `<img>` tags).
 *
 * @param {object | null | undefined} record
 * @returns {string}
 */
export function getLayoutImagePathFromRecord(record) {
  if (!record || typeof record !== 'object') return '';

  const rawCandidates = [
    pickLayoutFilePath(record.layout_image),
    pickLayoutFilePath(record.layout_image_url),
    pickLayoutFilePath(record.image),
    pickLayoutFilePath(record.thumbnail),
    pickLayoutFilePath(record.file),
  ].filter(Boolean);

  for (const candidate of rawCandidates) {
    const normalized = normalizeLayoutImagePath(candidate);
    if (normalized.startsWith('/files/') || normalized.startsWith('/private/')) {
      return normalized;
    }
  }

  return normalizeLayoutImagePath(rawCandidates[0] || '');
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isDirectObjectStorageUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes('amazonaws.com') ||
      host.endsWith('.s3.amazonaws.com') ||
      host.startsWith('s3.') ||
      host.includes('cloudfront.net') ||
      host.includes('digitaloceanspaces.com')
    );
  } catch {
    return false;
  }
}

/**
 * Same-origin paths first (Vite proxies `/files`, `/private`, `/api`), then absolute URLs.
 * Direct object-storage URLs are tried last because they usually require signed access.
 *
 * @param {string} rawPath
 * @returns {string[]}
 */
export function collectLayoutImageSrcCandidates(rawPath) {
  const trimmed = normalizeLayoutImagePath(rawPath);
  if (!trimmed) return [];

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return [trimmed];
  }

  const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const built = toLayoutAssetUrl(trimmed);

  const proxied = [];
  const absolute = [];

  const pushCandidate = (candidate) => {
    const value = String(candidate || '').trim();
    if (!value) return;
    if (isDirectObjectStorageUrl(value)) {
      absolute.push(value);
      return;
    }
    if (value.startsWith('/') || (apiBase && value.startsWith(apiBase))) {
      proxied.push(value);
      return;
    }
    if (/^https?:\/\//u.test(value)) {
      absolute.push(value);
      return;
    }
    proxied.push(value);
  };

  if (apiBase && built.startsWith(apiBase)) {
    pushCandidate(built.slice(apiBase.length));
  }

  if (trimmed.startsWith('/')) {
    const queryIndex = trimmed.indexOf('?');
    const pathname = queryIndex >= 0 ? trimmed.slice(0, queryIndex) : trimmed;
    const search = queryIndex >= 0 ? trimmed.slice(queryIndex) : '';
    pushCandidate(`${encodeLayoutAssetPath(pathname)}${search}`);
  }

  if (/^https?:\/\//u.test(trimmed)) {
    pushCandidate(toLayoutAssetUrl(trimmed));
  }

  if (built) {
    pushCandidate(built);
  }

  if (!trimmed.startsWith('/') && !/^https?:\/\//u.test(trimmed)) {
    pushCandidate(encodeLayoutAssetPath(`/${trimmed}`));
  }

  return [...new Set([...proxied, ...absolute].filter(Boolean))];
}
