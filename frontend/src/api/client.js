import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the httpOnly refresh-token cookie
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Endpoints that must NEVER trigger the retry-refresh flow themselves —
// otherwise a 401 from /auth/refresh (e.g. anonymous visitor, no session yet)
// re-triggers another refresh attempt, which also 401s, forever.
const AUTH_ENDPOINTS = ['/auth/refresh', '/auth/login'];

function isAuthEndpoint(url = '') {
  return AUTH_ENDPOINTS.some((p) => url.includes(p));
}

// On a 401, try refreshing the access token exactly once, then retry the original request.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Never intercept the auth endpoints' own 401s — let the caller (e.g. AuthContext)
    // handle "not logged in" as a normal, expected state instead of looping.
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post('/api/auth/refresh', {}, { withCredentials: true });
        }
        const { data } = await refreshPromise;
        refreshPromise = null;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshPromise = null;
        setAccessToken(null);
        // Only force-navigate if we're not already on a public/login page —
        // avoids a reload loop when the visitor was never logged in to begin with.
        if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
