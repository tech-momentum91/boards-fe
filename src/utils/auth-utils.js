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

/** Build pathname+search+hash from a React Router location (or similar). */
export function pathFromLocationLike(locationLike) {
  if (!locationLike) return null;
  if (typeof locationLike === 'string') return locationLike;
  const pathname = locationLike.pathname;
  if (typeof pathname !== 'string' || !pathname) return null;
  return `${pathname}${locationLike.search || ''}${locationLike.hash || ''}`;
}

/**
 * Remember where to send the user after a successful login.
 * Ignores public routes and non-internal paths.
 */
export function setPostLoginRedirectPath(path) {
  if (!isValidInternalRedirectPath(path)) return false;
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
    return true;
  } catch {
    return false;
  }
}

/** Read remembered path without clearing it. */
export function peekPostLoginRedirectPath() {
  try {
    const redirectPath = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    if (isValidInternalRedirectPath(redirectPath)) return redirectPath;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolve the post-login destination from (in order):
 * 1. `?next=` query on the login URL
 * 2. sessionStorage
 * 3. React Router `location.state.from`
 */
export function resolvePostLoginRedirectPath({
  search = typeof window !== 'undefined' ? window.location.search : '',
  stateFrom = null,
} = {}) {
  try {
    const params = new URLSearchParams(
      typeof search === 'string' ? search : search?.toString?.() || '',
    );
    const nextParam = params.get('next');
    if (nextParam) {
      let decoded = nextParam;
      try {
        decoded = decodeURIComponent(nextParam);
      } catch {
        decoded = nextParam;
      }
      if (isValidInternalRedirectPath(decoded)) return decoded;
    }
  } catch {
    // ignore
  }

  const stored = peekPostLoginRedirectPath();
  if (stored) return stored;

  const fromState = pathFromLocationLike(stateFrom);
  if (isValidInternalRedirectPath(fromState)) return fromState;

  return null;
}

/** Login path that embeds the return URL as `?next=`. */
export function getLoginPathWithNext(
  returnPath,
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
) {
  const loginPath = getLoginPath(pathname);
  if (!isValidInternalRedirectPath(returnPath)) return loginPath;
  const separator = loginPath.includes('?') ? '&' : '?';
  return `${loginPath}${separator}next=${encodeURIComponent(returnPath)}`;
}

/**
 * Clears all authentication data from localStorage
 * Preserves post-login redirect + session-expired toast flags in sessionStorage
 * so a mid-redirect clearAuthData() does not wipe the return URL.
 */
export const clearAuthData = () => {
  localStorage.removeItem('email');
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  // Tenant identity lives in the URL (/t/{slug}/…), not storage.

  let redirectPath = null;
  let sessionExpired = null;
  try {
    redirectPath = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    sessionExpired = sessionStorage.getItem(SESSION_EXPIRED_TOAST_KEY);
    sessionStorage.clear();
    if (redirectPath) sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, redirectPath);
    if (sessionExpired) sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, sessionExpired);
  } catch {
    // sessionStorage may be unavailable (private mode / blocked)
  }
};

/** Drop any remembered return URL (e.g. intentional logout). */
export function clearPostLoginRedirectPath() {
  try {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  } catch {
    // ignore
  }
}

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
  setPostLoginRedirectPath(fullCurrentPath);
  sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, '1');
  // Full reload to reset state. Path must already include /t/{slug} when tenant-scoped.
  window.location.href = getLoginPathWithNext(fullCurrentPath, currentPath);
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
 * Prefer {@link resolvePostLoginRedirectPath} + {@link clearPostLoginRedirectPath}
 * when navigating after login so remounts cannot wipe the destination.
 * @param {object|string|null} [fallbackLocation] React Router `location.state.from` or path string
 * @returns {string|null}
 */
export const popPostLoginRedirectPath = (fallbackLocation = null) => {
  const resolved = resolvePostLoginRedirectPath({ stateFrom: fallbackLocation });
  clearPostLoginRedirectPath();
  return resolved;
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
