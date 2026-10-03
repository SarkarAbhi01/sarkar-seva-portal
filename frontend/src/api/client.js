import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Refresh ke liye separate client.
// Iske andar auth interceptor nahi hai.
const refreshClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
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
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

const AUTH_ENDPOINTS = [
  '/auth/refresh',
  '/auth/login',
  '/api/auth/refresh',
  '/api/auth/login',
];

function isAuthEndpoint(url = '') {
  return AUTH_ENDPOINTS.some((p) => url.includes(p));
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient
            .post('/auth/refresh', {})
            .finally(() => {
              refreshPromise = null;
            });
        }

        const { data } = await refreshPromise;

        if (!data?.accessToken) {
          throw new Error('Refresh response did not contain accessToken');
        }

        setAccessToken(data.accessToken);

        original.headers = original.headers || {};
        original.headers.Authorization =
          `Bearer ${data.accessToken}`;

        return api(original);

      } catch (refreshErr) {
        setAccessToken(null);

        if (
          window.location.pathname !== '/admin/login' &&
          window.location.pathname !== '/login'
        ) {
          window.location.href =
            window.location.pathname.startsWith('/admin')
              ? '/admin/login'
              : '/login';
        }

        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
