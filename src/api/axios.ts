import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
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

export type ApiAxiosRequestConfig = InternalAxiosRequestConfig & {
  _csrfRetried?: boolean;
};

export type ApiAxiosError = AxiosError & {
  serialized?: ReturnType<typeof serializeError>;
};

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

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      // AxiosHeaders: plain `delete` on the proxy can leave application/json set,
      // which breaks multipart uploads (browser never adds the boundary).
      const headers = config.headers as {
        delete?: (name: string) => void;
        set?: (name: string, value: string | false) => void;
      };
      if (typeof headers?.delete === 'function') {
        headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
      if (typeof headers?.set === 'function') {
        headers.set('Content-Type', false);
      }
    }

    if (UNSAFE_METHODS.has((config.method ?? '').toLowerCase())) {
      let token = getCachedCsrfToken();
      if (!token) {
        token = await fetchCsrfToken();
      }
      if (token) {
        config.headers['X-Frappe-CSRF-Token'] = token;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: ApiAxiosError) => {
    const serialized = serializeError(error);
    error.serialized = serialized;

    const status = error.response?.status;
    const isLoginEndpoint = error.config?.url?.includes('/method/login');
    const isSessionCheck = error.config?.url?.includes('/method/frappe.auth.get_logged_user');
    const currentPath = window.location.pathname;
    const isPublicRoute = isPublicRoutePath(currentPath);

    if (status === 403 && isSessionCheck) {
      if (!isPublicRoute && handleAuthError(error)) {
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }

    if (status === 403 && !isSessionCheck) {
      if (!isPublicRoute && isSessionExpired403Error(error) && handleAuthError(error)) {
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }

    if (status === 401 && !isLoginEndpoint && !isSessionCheck) {
      if (!isPublicRoute && handleAuthError(error)) {
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }

    if (status === 503) {
      redirectToMaintenance();
      return Promise.reject(error);
    }

    const failedRequestConfig = error.config as ApiAxiosRequestConfig | undefined;
    if (isCsrfTokenError(error) && failedRequestConfig && !failedRequestConfig._csrfRetried) {
      const token = await fetchCsrfToken();
      if (token) {
        failedRequestConfig._csrfRetried = true;
        failedRequestConfig.headers['X-Frappe-CSRF-Token'] = token;
        return apiClient.request(failedRequestConfig as AxiosRequestConfig);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
