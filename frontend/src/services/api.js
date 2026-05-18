import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const groupService = {
  getAll: () => api.get('/groups'),
  getOne: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  delete: (id) => api.delete(`/groups/${id}`),
};

export const expenseService = {
  getAll: (groupId) => api.get(`/groups/${groupId}/expenses`),
  create: (groupId, data) => api.post(`/groups/${groupId}/expenses`, data),
  delete: (groupId, id) => api.delete(`/groups/${groupId}/expenses/${id}`),
  getBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
};

export const settlementService = {
  getAll: (groupId) => api.get(`/groups/${groupId}/settlements`),
  create: (groupId, data) => api.post(`/groups/${groupId}/settlements`, data),
};

export default api;
