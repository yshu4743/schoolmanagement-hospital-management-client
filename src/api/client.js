import axios from 'axios';

/**
 * Axios instance for the HMS API.
 * In development, Vite proxies /api -> http://localhost:5001.
 * Set VITE_API_URL to point elsewhere (e.g. deployed API).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
});

// Attach JWT from storage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the session and bounce to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('hms_token');
      localStorage.removeItem('hms_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
