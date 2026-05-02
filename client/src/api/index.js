import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('qb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally — clear stale tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qb_token');
      localStorage.removeItem('qb_user');
      // Let components handle the redirect
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── Organizations ─────────────────────────────────────────────────────────────
export const orgsAPI = {
  getAll: () => api.get('/organizations'),
  getBySlug: (slug) => api.get(`/organizations/${slug}`),
};

// ─── Queues ────────────────────────────────────────────────────────────────────
export const queuesAPI = {
  getAll: () => api.get('/queues'),
  create: (data) => api.post('/queues', data),
  next: (id) => api.patch(`/queues/${id}/next`),
  toggle: (id) => api.patch(`/queues/${id}/toggle`),
  delete: (id) => api.delete(`/queues/${id}`),
};

// ─── Tokens ────────────────────────────────────────────────────────────────────
export const tokensAPI = {
  generate: (data) => api.post('/tokens', data),
  getByQueue: (queueId, params) => api.get(`/tokens/queue/${queueId}`, { params }),
  updateStatus: (id, status) => api.patch(`/tokens/${id}/status`, { status }),
};

export default api;
