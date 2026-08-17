import axios from 'axios';

import apiClient from '@/api/axios';
import { resolveApiOrigin } from '@/api/api-origin';
import { extractFrappeFilePathFromUrl } from '@/utils/layout-asset-url';

/**
 * @param {string | undefined | null} apiOrigin
 * @returns {Set<string>}
 */
function getTrustedFileOrigins(apiOrigin) {
  const origins = new Set();
  if (typeof window !== 'undefined' && window.location?.origin) {
    origins.add(window.location.origin);
  }
  if (apiOrigin) {
    try {
      origins.add(new URL(apiOrigin).origin);
    } catch {
      // Ignore invalid API origin.
    }
  }
  return origins;
}

/**
 * @param {string} url
 * @returns {{ pathname: string, origin: string } | null}
 */
function parseTrustedAppUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    if (typeof window === 'undefined') return null;
    return {
      pathname: trimmed.split('?')[0],
      origin: window.location.origin,
    };
  }

  if (!/^https?:\/\//u.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    return { pathname: parsed.pathname, origin: parsed.origin };
  } catch {
    return null;
  }
}

/**
 * @param {{ pathname: string, origin: string }} parsed
 * @returns {boolean}
 */
function isTrustedAppOrigin(parsed) {
  const trustedOrigins = getTrustedFileOrigins(resolveApiOrigin());
  return trustedOrigins.has(parsed.origin);
}

/**
 * Frappe file routes that must be fetched with session cookies (S3 redirects deny anonymous access).
 *
 * @param {string} url
 * @returns {boolean}
 */
function isAppFileUrl(url) {
  const parsed = parseTrustedAppUrl(url);
  if (!parsed || !isTrustedAppOrigin(parsed)) return false;
  return parsed.pathname.startsWith('/files/') || parsed.pathname.startsWith('/private/');
}

/**
 * Frappe API proxy routes (e.g. layout_image_proxy_url) — require session cookies, not raw S3.
 *
 * @param {string} url
 * @returns {boolean}
 */
function isAppApiProxyUrl(url) {
  const parsed = parseTrustedAppUrl(url);
  if (!parsed || !isTrustedAppOrigin(parsed)) return false;
  return parsed.pathname.startsWith('/api/');
}

/**
 * URLs that must be fetched with credentials for canvas export (never anonymous S3).
 *
 * @param {string} url
 * @returns {boolean}
 */
function isAuthenticatedAppUrl(url) {
  return isAppFileUrl(url) || isAppApiProxyUrl(url);
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isCrossOriginUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false;
  if (trimmed.startsWith('/')) return false;
  if (typeof window === 'undefined') return true;

  try {
    return new URL(trimmed, window.location.href).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/**
 * @param {Blob | null | undefined} blob
 * @returns {boolean}
 */
function isImageBlob(blob) {
  if (!blob || blob.size <= 0) return false;
  const type = String(blob.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  if (type.includes('xml') || type.includes('html') || type.includes('json')) return false;
  // Some backends stream images as octet-stream.
  return type === 'application/octet-stream';
}

/**
 * Whether a failed fetch may succeed with session cookies (cross-origin API host).
 *
 * @param {string} url
 * @param {Response} response
 * @returns {boolean}
 */
function shouldRetryWithCredentials(url, response) {
  if (response.ok || typeof window === 'undefined') return false;
  if (response.status !== 401 && response.status !== 403) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 * @returns {string[]}
 */
function buildImageFetchCandidates(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return [];

  const candidates = [trimmed];
  const frappePath = extractFrappeFilePathFromUrl(trimmed);
  const apiOrigin = resolveApiOrigin();

  if (frappePath && frappePath !== trimmed) {
    candidates.push(frappePath);
    if (apiOrigin) {
      candidates.push(`${apiOrigin}${frappePath}`);
    }
  }

  if (trimmed.startsWith('/') && apiOrigin) {
    candidates.push(`${apiOrigin}${trimmed}`);
  }

  return [...new Set(candidates.filter(Boolean))];
}

/**
 * @param {string} url
 * @param {RequestCredentials} credentials
 * @returns {Promise<Blob | null>}
 */
async function tryFetchImageBlob(url, credentials) {
  const response = await fetch(url, { credentials, redirect: 'follow' });
  if (!response.ok) return null;
  const blob = await response.blob();
  return isImageBlob(blob) ? blob : null;
}

async function tryFetchImageBlobWithAxios(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'blob',
      withCredentials: true,
    });
    return isImageBlob(response.data) ? response.data : null;
  } catch {
    return null;
  }
}

/**
 * Resolve Frappe `/api/method/...` proxy URLs to apiClient-relative paths.
 *
 * @param {string} url
 * @returns {string}
 */
function toApiClientMethodPath(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/api/')) {
    return trimmed.slice(4);
  }

  if (!/^https?:\/\//u.test(trimmed)) return '';

  try {
    const parsed = new URL(trimmed);
    const apiOrigin = resolveApiOrigin();
    if (!apiOrigin || parsed.origin !== new URL(apiOrigin).origin) return '';
    if (!parsed.pathname.startsWith('/api/')) return '';
    return `${parsed.pathname.slice(4)}${parsed.search || ''}`;
  } catch {
    return '';
  }
}

/**
 * Fetch authenticated layout proxy bytes via apiClient (same session as export API).
 *
 * @param {string} url
 * @returns {Promise<Blob | null>}
 */
async function tryFetchImageBlobWithApiClient(url) {
  const apiPath = toApiClientMethodPath(url);
  if (!apiPath.startsWith('/method/')) return null;

  try {
    const response = await apiClient.get(apiPath, { responseType: 'blob' });
    return isImageBlob(response.data) ? response.data : null;
  } catch {
    return null;
  }
}

/**
 * Fetch Frappe file routes through the API origin so session cookies apply in dev.
 *
 * @param {string} url
 * @returns {Promise<Blob | null>}
 */
async function tryFetchAuthenticatedFileBlob(url) {
  const trimmed = String(url || '').trim();
  const apiOrigin = resolveApiOrigin();
  if (!apiOrigin) return null;

  let filePath = '';
  if (trimmed.startsWith('/files/') || trimmed.startsWith('/private/')) {
    filePath = trimmed;
  } else if (/^https?:\/\//u.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.origin !== new URL(apiOrigin).origin) return null;
      if (!parsed.pathname.startsWith('/files/') && !parsed.pathname.startsWith('/private/')) {
        return null;
      }
      filePath = `${parsed.pathname}${parsed.search || ''}`;
    } catch {
      return null;
    }
  }

  if (!filePath) return null;
  return tryFetchImageBlobWithAxios(`${apiOrigin}${filePath}`);
}

/**
 * Fetch image bytes as a blob.
 * Frappe `/files` and `/private` routes are fetched with cookies first so S3 redirects stay authorized.
 *
 * @param {string} url
 * @returns {Promise<Blob | null>}
 */
async function fetchImageBlob(url) {
  const candidates = buildImageFetchCandidates(url);

  for (const candidate of candidates) {
    const trimmed = String(candidate || '').trim();
    if (!trimmed) continue;

    try {
      if (isAuthenticatedAppUrl(trimmed)) {
        const authedBlob =
          (await tryFetchImageBlobWithApiClient(trimmed)) ||
          (await tryFetchAuthenticatedFileBlob(trimmed)) ||
          (await tryFetchImageBlob(trimmed, 'include')) ||
          (await tryFetchImageBlobWithAxios(trimmed));
        if (authedBlob) return authedBlob;

        if (isAppFileUrl(trimmed)) {
          const publicBlob =
            (await tryFetchImageBlob(trimmed, 'omit')) ||
            (await tryFetchImageBlobWithAxios(trimmed));
          if (publicBlob) return publicBlob;
        }

        continue;
      }

      const anonymousResponse = await fetch(trimmed, { credentials: 'omit', redirect: 'follow' });
      if (anonymousResponse.ok) {
        const blob = await anonymousResponse.blob();
        if (isImageBlob(blob)) return blob;
      }

      const axiosBlob = await tryFetchImageBlobWithAxios(trimmed);
      if (axiosBlob) return axiosBlob;

      if (shouldRetryWithCredentials(trimmed, anonymousResponse)) {
        const authedBlob =
          (await tryFetchImageBlob(trimmed, 'include')) ||
          (await tryFetchImageBlobWithAxios(trimmed));
        if (authedBlob) return authedBlob;
      }
    } catch {
      const axiosBlob = await tryFetchImageBlobWithAxios(trimmed);
      if (axiosBlob) return axiosBlob;
    }
  }

  return null;
}

/**
 * Resolve an image URL to a same-origin blob URL so canvas export (toDataURL) stays untainted.
 * Data and blob URLs pass through unchanged.
 *
 * @param {string} src
 * @returns {Promise<{ url: string, revoke?: () => void, fetchedAsBlob?: boolean }>}
 */
export async function resolveCanvasSafeImageUrl(src) {
  const url = String(src || '').trim();
  if (!url) return { url: '' };
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return { url };
  }

  const blob = await fetchImageBlob(url);
  if (!blob) {
    // Never fall back to cross-origin <img> loads — they fail CORS or taint the canvas.
    if (isAuthenticatedAppUrl(url) || isCrossOriginUrl(url)) return { url: '' };
    return { url };
  }

  const blobUrl = URL.createObjectURL(blob);
  return {
    url: blobUrl,
    fetchedAsBlob: true,
    revoke: () => URL.revokeObjectURL(blobUrl),
  };
}

/**
 * Whether a loaded image can be drawn to canvas without tainting it.
 *
 * @param {HTMLImageElement | null | undefined} image
 * @param {string} [src]
 * @returns {boolean}
 */
export function canUsePreloadedImageForCanvas(image) {
  if (!image?.complete || !image.naturalWidth) return false;

  const value = String(image.currentSrc || image.src || '').trim();
  if (!value) return false;
  if (value.startsWith('data:') || value.startsWith('blob:')) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;

  if (typeof window === 'undefined') return false;

  try {
    return new URL(value, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Load an image for canvas compositing without tainting the canvas on export.
 *
 * @param {string} src
 * @param {{ preloadedImage?: HTMLImageElement | null, preloadedSrc?: string }} [options]
 * @returns {Promise<HTMLImageElement | null>}
 */
export async function loadCanvasSafeImage(src, options = {}) {
  const { preloadedImage = null } = options;

  if (canUsePreloadedImageForCanvas(preloadedImage)) {
    return preloadedImage;
  }

  const trimmed = String(src || '').trim();
  if (!trimmed) return null;

  const candidates = buildImageFetchCandidates(trimmed);

  for (const candidate of candidates) {
    const { url, revoke, fetchedAsBlob } = await resolveCanvasSafeImageUrl(candidate);
    if (!url) continue;

    const image = await new Promise((resolve) => {
      const img = new window.Image();
      const finish = (result) => {
        revoke?.();
        resolve(result);
      };

      if (!fetchedAsBlob && !url.startsWith('data:') && !url.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }

      img.addEventListener(
        'load',
        () => {
          if (img.complete && img.naturalWidth > 0) finish(img);
          else finish(null);
        },
        { once: true },
      );
      img.addEventListener('error', () => finish(null), { once: true });
      img.src = url;
    });

    if (image?.naturalWidth) return image;
  }

  return null;
}
