import axios from 'axios';
import { getApiBaseUrl } from '../api/api-origin';

// Deliberately not importing `apiClient` from `./axios.js` - that module's
// interceptors depend on this file (to attach the token), which would create
// a circular import. Talks to the backend directly instead.
const client = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

let cachedToken = null;
let inFlightFetch = null;

/**
 * Fetch and cache the CSRF token for the current session.
 * Concurrent callers share a single in-flight request.
 */
export function fetchCsrfToken() {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = client
    .get('/method/devx.api.core.get_csrf_token')
    .then((res) => {
      cachedToken = res?.data?.message?.csrf_token || null;
      return cachedToken;
    })
    .catch(() => {
      // Session may not be ready yet (e.g. called before login) - not fatal,
      // callers just won't have a token to attach until the next fetch.
      return null;
    })
    .finally(() => {
      inFlightFetch = null;
    });

  return inFlightFetch;
}

export function getCachedCsrfToken() {
  return cachedToken;
}

export function clearCsrfToken() {
  cachedToken = null;
}
