import axios from 'axios';

// Centralized API configuration
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically inject our automated JWT token into every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jumia_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global error handler (e.g., handling expired sessions)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Global]: Token expired or invalid. Clearing session.');
      localStorage.removeItem('jumia_token');
      localStorage.removeItem('jumia_user');
      // In a full routing setup, you would redirect to /login here
    }
    return Promise.reject(error);
  }
);

export default API;
