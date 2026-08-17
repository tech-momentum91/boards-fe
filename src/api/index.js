import apiClient from './axios';

// Example API service functions
export const apiService = {
  // User/Auth endpoints
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/auth/me'),

  // Example CRUD operations
  getItems: (params) => apiClient.get('/items', { params }),
  getItemById: (id) => apiClient.get(`/items/${id}`),
  createItem: (data) => apiClient.post('/items', data),
  updateItem: (id, data) => apiClient.put(`/items/${id}`, data),
  deleteItem: (id) => apiClient.delete(`/items/${id}`),
};

export default apiClient;
