import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
if (!configuredApiUrl && import.meta.env.PROD) {
  throw new Error('VITE_API_URL must be configured for production builds.');
}

const apiBaseUrl = configuredApiUrl || 'http://localhost:5000/api';
let parsedApiUrl: URL;

try {
  parsedApiUrl = new URL(apiBaseUrl);
} catch {
  throw new Error('VITE_API_URL must be a valid absolute URL.');
}

if (
  (parsedApiUrl.protocol !== 'http:' && parsedApiUrl.protocol !== 'https:') ||
  parsedApiUrl.username ||
  parsedApiUrl.password ||
  parsedApiUrl.search ||
  parsedApiUrl.hash
) {
  throw new Error('VITE_API_URL must be an http or https API URL without credentials or query parameters.');
}

const API = axios.create({
  baseURL: parsedApiUrl.toString().replace(/\/+$/, ''),
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
