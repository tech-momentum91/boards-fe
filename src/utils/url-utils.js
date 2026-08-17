/**
 * Normalize user-entered website URLs (e.g., "blinkit.com" → "https://blinkit.com")
 * @param {string | null | undefined} input - Raw URL input
 * @returns {string} Normalized URL or empty string if invalid
 */
export function normalizeWebsiteUrl(input) {
  if (!input) return '';

  let url = String(input).trim().replace(/^\/+/, '');
  if (!url) return '';

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname || (parsed.hostname !== 'localhost' && !parsed.hostname.includes('.'))) {
      return '';
    }

    const normalized =
      parsed.pathname === '/' && !parsed.search && !parsed.hash ? parsed.origin : parsed.href;

    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
  } catch {
    return '';
  }
}

/**
 * Check if a URL string is valid
 * @param {string | null | undefined} input - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidWebsiteUrl(input) {
  return Boolean(normalizeWebsiteUrl(input));
}
