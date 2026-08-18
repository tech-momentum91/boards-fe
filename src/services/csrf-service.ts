import axios from 'axios';
import { getApiBaseUrl } from '@/api/api-origin';

// Deliberately not importing `apiClient` from `./axios` - that module's
// interceptors depend on this file (to attach the token), which would create
// a circular import. Talks to the backend directly instead.
const client = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

let cachedToken: string | null = null;
let inFlightFetch: Promise<string | null> | null = null;

/** Fetch and cache the CSRF token for the current session. Concurrent callers share one request. */
export function fetchCsrfToken(): Promise<string | null> {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = client
    .get('/method/devx_tasks.devx_tasks.apis.auth_.get_csrf_token')
    .then((res) => {
      const token = res?.data?.message?.csrf_token;
      cachedToken = typeof token === 'string' ? token : null;
      return cachedToken;
    })
    .catch(() => {
      // Session may not be ready yet (e.g. called before login) - not fatal.
      return null;
    })
    .finally(() => {
      inFlightFetch = null;
    });

  return inFlightFetch;
}

export function getCachedCsrfToken(): string | null {
  return cachedToken;
}

export function clearCsrfToken(): void {
  cachedToken = null;
}
