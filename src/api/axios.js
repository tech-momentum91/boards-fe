import axios from 'axios';
import { getApiBaseUrl, resolveApiOrigin } from './api-origin';
import {
  handleAuthError,
  isCsrfTokenError,
  isPublicRoutePath,
  isSessionExpired403Error,
  redirectToMaintenance,
} from '../utils/auth-utils';
import { serializeError } from '../utils/error-utils';
import { fetchCsrfToken, getCachedCsrfToken } from '../services/csrf-service';

const apiBaseUrl = getApiBaseUrl();
const UNSAFE_METHODS = new Set(['post', 'put', 'delete', 'patch']);

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (!resolveApiOrigin()) {
  console.warn('API origin could not be resolved. Set VITE_API_URL for devx.work / local dev.');
}

// Request interceptor - add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    // Don't set Content-Type for FormData - let axios/browser set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Attach the CSRF token on state-changing requests. Frappe only enforces
    // this once something (e.g. the desk UI, under a shared session) has
    // generated a csrf_token for the session - so a missing/stale token here
    // is harmless until that happens, at which point every unguarded POST
    // would otherwise fail with CSRFTokenError. See devx.api.core.get_csrf_token.
    if (UNSAFE_METHODS.has((config.method || '').toLowerCase())) {
      const token = getCachedCsrfToken();
      if (token) {
        config.headers['X-Frappe-CSRF-Token'] = token;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Serialize error for Redux compatibility
    // Attach serialized version to error object so thunks can use it
    const serialized = serializeError(error);
    error.serialized = serialized;

    // Handle authentication errors selectively
    const status = error.response?.status;
    const isLoginEndpoint = error.config?.url?.includes('/method/login');
    const isSessionCheck = error.config?.url?.includes('/method/frappe.auth.get_logged_user');
    const currentPath = window.location.pathname;
    const isPublicRoute = isPublicRoutePath(currentPath);

    // Handle 403 for session check endpoint - redirect to login
    if (status === 403 && isSessionCheck) {
      // Only redirect if not already on a public route to prevent infinite loops
      if (!isPublicRoute && handleAuthError(error)) {
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }

    // Handle 403 for other endpoints:
    // - redirect only for session-expired shaped 403 payloads
    // - keep normal permission-denied 403 as reject only
    if (status === 403 && !isSessionCheck) {
      if (!isPublicRoute && isSessionExpired403Error(error) && handleAuthError(error)) {
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }

    // Keep 401 handling for non-login endpoints
    if (status === 401 && !isLoginEndpoint && !isSessionCheck) {
      // Only redirect if not already on a public route to prevent infinite loops
      if (!isPublicRoute && handleAuthError(error)) {
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }

    if (status === 503) {
      redirectToMaintenance();
      return Promise.reject(error);
    }

    // CSRFTokenError: the session now expects a token we didn't have cached
    // yet (or it rotated). Refresh it once and retry the original request -
    // this is what prevents a single stale token from failing every
    // subsequent POST across the page.
    const failedRequestConfig = error.config;
    if (isCsrfTokenError(error) && failedRequestConfig && !failedRequestConfig._csrfRetried) {
      const token = await fetchCsrfToken();
      if (token) {
        failedRequestConfig._csrfRetried = true;
        failedRequestConfig.headers['X-Frappe-CSRF-Token'] = token;
        return apiClient.request(failedRequestConfig);
      }
    }

    // For other errors, just reject normally
    return Promise.reject(error);
  },
);

export default apiClient;
