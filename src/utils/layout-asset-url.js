/**
 * Normalize direct object-storage URLs back to Frappe `/files` or `/private` paths when possible.
 *
 * @param {string} value
 * @returns {string}
 */
export function extractFrappeFilePathFromUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/files/') || trimmed.startsWith('/private/')) {
    return trimmed.split('?')[0];
  }
  if (!/^https?:\/\//u.test(trimmed)) return '';

  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname;
    const filesIdx = path.indexOf('/files/');
    if (filesIdx >= 0) return path.slice(filesIdx);
    const privateIdx = path.indexOf('/private/');
    if (privateIdx >= 0) return path.slice(privateIdx);
  } catch {
    return '';
  }

  return '';
}

/**
 * Encode each path segment so reserved chars (e.g. `&`, spaces) load correctly.
 * decodeURIComponent first avoids double-encoding already-encoded segments.
 *
 * @param {string} path
 * @returns {string}
 */
export function encodeLayoutAssetPath(path) {
  if (!path) return '';
  return path
    .split('/')
    .map((segment, index) => {
      if (index === 0 && segment === '') return '';
      if (!segment) return segment;
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

/**
 * Resolve layout image paths to browser-loadable URLs.
 * In dev, returns a root-relative path so Vite proxies `/files` to the backend.
 * In production, prefixes with VITE_API_URL.
 *
 * @param {string} path
 * @returns {string}
 */
export function toLayoutAssetUrl(path) {
  if (!path) return '';
  // Guest share payloads may inline private floor plans as data URLs.
  if (path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  const frappePath = extractFrappeFilePathFromUrl(path);
  if (frappePath) {
    path = frappePath;
  }

  const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  let pathname = path;
  let search = '';
  if (path.includes('?')) {
    const queryIndex = path.indexOf('?');
    search = path.slice(queryIndex);
    pathname = path.slice(0, queryIndex);
  }

  if (/^https?:\/\//u.test(pathname)) {
    if (apiBase && pathname.startsWith(apiBase)) {
      pathname = pathname.slice(apiBase.length);
    } else {
      try {
        const url = new URL(path);
        const apiOrigin = apiBase ? new URL(apiBase).origin : '';
        // Same host as API (e.g. http://localhost:8000/files/...) → use pathname so
        // Vite dev proxy serves /files same-origin and canvas export avoids CORS.
        if (apiOrigin && url.origin === apiOrigin) {
          pathname = url.pathname;
          search = url.search || '';
        } else {
          url.pathname = encodeLayoutAssetPath(url.pathname);
          return url.toString();
        }
      } catch {
        return path;
      }
    }
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const encoded = `${encodeLayoutAssetPath(normalized)}${search}`;

  if (import.meta.env.DEV) {
    return encoded;
  }

  return `${apiBase}${encoded}`;
}
