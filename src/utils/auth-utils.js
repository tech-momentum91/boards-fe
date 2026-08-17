/**
 * Utility functions for handling authentication errors and session management
 */

export const SESSION_EXPIRED_TOAST_KEY = 'session_expired_toast';
export const POST_LOGIN_REDIRECT_KEY = 'post_login_redirect';

// Public routes that should be accessible without authentication
export const MAINTENANCE_ROUTE = '/maintenance';

const PUBLIC_ROUTES = [
  '/login',
  '/splash',
  '/reset-password',
  '/update-password',
  '/password-success',
  '/email-sent',
  '/public/csi',
  '/public/task',
  '/public/project-snags',
  '/public/proposal',
  MAINTENANCE_ROUTE,
];

const VMS_SLUG_PREFIX_RE = /^\/t\/([\da-z]{6,40})(?=\/|$)/i;

/** Strip trailing slashes except for root. */
function normalizePathname(path) {
  const raw = String(path || '');
  if (!raw || raw === '/') return '/';
  return raw.replace(/\/+$/, '') || '/';
}

/**
 * Path relative to an optional `/t/{slug}` basename (VMS path-based tenants).
 * `/t/abc123/login` → `/login`, `/login` → `/login`
 */
export function stripVmsSlugPrefix(path) {
  const normalized = normalizePathname(path);
  const match = normalized.match(VMS_SLUG_PREFIX_RE);
  if (!match) return normalized;
  const rest = normalized.slice(match[0].length);
  return rest ? normalizePathname(rest) : '/';
}

export const isPublicRoutePath = (path) => {
  const normalized = normalizePathname(path);
  const routePath = stripVmsSlugPrefix(normalized);
  // Bare /t/{slug} entry (before client redirect to /splash) must stay public.
  if (routePath === '/' && VMS_SLUG_PREFIX_RE.test(normalized)) {
    return true;
  }
  return PUBLIC_ROUTES.some((route) => routePath === route || routePath.startsWith(`${route}/`));
};

/** Login URL, preserving `/t/{slug}` when the current URL is on a path-based tenant. */
export function getLoginPath(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
) {
  const match = String(pathname || '').match(VMS_SLUG_PREFIX_RE);
  if (match) return `/t/${match[1].toLowerCase()}/login`;
  // PWA start_url may be `/?slug=` before redirect completes — keep login tenant-scoped.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const querySlug = String(params.get('slug') || params.get('pwa') || '')
      .trim()
      .toLowerCase();
    if (/^[\da-z]{6,40}$/.test(querySlug)) {
      return `/t/${querySlug}/login`;
    }
  }
  // Do not read localStorage — PWA / Home Screen storage is isolated from Safari.
  return '/login';
}

const isValidInternalRedirectPath = (path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  return !isPublicRoutePath(path);
};

/**
 * Clears all authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('email');
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  // Tenant identity lives in the URL (/t/{slug}/…), not storage.
  sessionStorage.clear();
};

/**
 * Redirects user to login page
 * Prevents redirect if already on a public route to avoid infinite loops
 */
export const redirectToLogin = () => {
  const currentPath = window.location.pathname;
  // Don't redirect if already on a public route to prevent infinite loops
  if (isPublicRoutePath(currentPath)) {
    return;
  }
  const fullCurrentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (isValidInternalRedirectPath(fullCurrentPath)) {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, fullCurrentPath);
  }
  sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, '1');
  // Full reload to reset state. Path must already include /t/{slug} when tenant-scoped.
  window.location.href = getLoginPath(currentPath);
};

/**
 * Redirects to the maintenance page when the API returns 503 (service unavailable).
 * @returns {boolean} True if a redirect was triggered
 */
export const redirectToMaintenance = () => {
  const currentPath = window.location.pathname;
  if (currentPath === MAINTENANCE_ROUTE || currentPath.startsWith(`${MAINTENANCE_ROUTE}/`)) {
    return false;
  }
  window.location.href = MAINTENANCE_ROUTE;
  return true;
};

/**
 * Returns and clears post-login redirect path if valid.
 * @returns {string|null}
 */
export const popPostLoginRedirectPath = () => {
  const redirectPath = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  if (!isValidInternalRedirectPath(redirectPath)) return null;
  return redirectPath;
};

/**
 * Handles authentication errors (401, 403) by clearing data and redirecting
 * @param {Object} error - The error object from axios
 */
export const handleAuthError = (error) => {
  const status = error.response?.status;

  if (status === 401 || status === 403) {
    // console.log('Authentication failed. Session may have expired.');
    clearAuthData();
    redirectToLogin();
    return true; // Indicates that the error was handled
  }

  return false; // Error was not handled
};

/**
 * Detects whether a 403 response is actually an expired/unauthenticated session
 * from Frappe, not a regular permission-denied scenario.
 * @param {Object} error - The error object from axios
 * @returns {boolean}
 */
export const isSessionExpired403Error = (error) => {
  if (error.response?.status !== 403) return false;

  const data = error.response?.data || {};
  const messageSources = [
    data.exception,
    data.exc_type,
    data._server_messages,
    data.message,
    error.message,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  const hasLoginToAccess = messageSources.some((text) => text.includes('login to access'));
  const hasNotWhitelisted = messageSources.some((text) => text.includes('not whitelisted'));
  const isPermissionErrorType = messageSources.some((text) => text.includes('permissionerror'));

  // Session timeout shape from backend:
  // "PermissionError ... Login to access ... is not whitelisted"
  return hasLoginToAccess && (hasNotWhitelisted || isPermissionErrorType);
};

/**
 * Checks if an error is an authentication error
 * @param {Object} error - The error object from axios
 * @returns {boolean} - True if it's an auth error
 */
export const isAuthError = (error) => {
  const status = error.response?.status;
  return status === 401 || isSessionExpired403Error(error);
};

/**
 * Detects Frappe's CSRFTokenError (400 "Invalid Request").
 * Fires whenever the current session has a csrf_token set (e.g. because the
 * Frappe desk UI was opened under the same shared session) but the request
 * didn't send a matching `X-Frappe-CSRF-Token` header.
 * @param {Object} error - The error object from axios
 * @returns {boolean}
 */
export const isCsrfTokenError = (error) => {
  if (error.response?.status !== 400) return false;

  const data = error.response?.data || {};
  const messageSources = [data.exc_type, data.exception, data._server_messages, data.message]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return messageSources.some((text) => text.includes('csrftokenerror'));
};
