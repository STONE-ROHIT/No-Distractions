import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Fails loudly, immediately, at startup if this is missing — the
// alternative is silent: axios treats an undefined baseURL as "no base
// URL", so every request quietly goes to a same-origin relative path
// (e.g. https://your-app.com/users/me instead of .../api/users/me)
// instead of the API, which looks like a confusing 404/HTML-response bug
// far from its actual cause. Mirrors server/src/config/env.ts's
// fail-fast validation.
if (!import.meta.env.VITE_API_URL) {
  throw new Error(
    'VITE_API_URL is not set. Copy client/.env.example to client/.env (see docs/00-getting-started).',
  );
}

/**
 * The one Axios instance every api/*.ts wrapper uses.
 *
 * `withCredentials: true` is what makes the browser send/accept the
 * httpOnly auth cookies at all — without it, a cross-origin request (the
 * Vite dev server and the Express API run on different ports, which
 * counts as cross-origin) silently drops them.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Requests that must NEVER trigger a refresh-and-retry themselves —
// otherwise a failed login attempt or a failed refresh could loop.
const AUTH_ENDPOINTS_EXEMPT_FROM_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh'];

let refreshPromise: Promise<unknown> | null = null;

/**
 * On any 401 from a request that isn't itself an auth endpoint, try
 * refreshing the session exactly once and replaying the original request
 * — this is what makes "persistent authentication" work: a page reload
 * with an expired access token (but a still-valid refresh token) recovers
 * silently instead of bouncing the user to the login page. If the refresh
 * itself fails, the original 401 is what callers see, and AuthContext
 * treats that as "not logged in".
 *
 * Concurrent 401s (e.g. several queries firing on page load) share a
 * single in-flight refresh call instead of each triggering their own.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthEndpoint = AUTH_ENDPOINTS_EXEMPT_FROM_REFRESH.some((path) =>
      originalRequest?.url?.includes(path),
    );

    if (
      error.response?.status !== 401 ||
      isAuthEndpoint ||
      !originalRequest ||
      originalRequest._retried
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    refreshPromise ??= apiClient.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });

    try {
      await refreshPromise;
      return apiClient.request(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
