
import axios from 'axios';
import { store, logout } from '../redux/store';

// Get API base URL from environment variable or use default
const getApiBaseURL = () => {
  // Check for environment variable (set during build)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Check for runtime configuration (useful for production)
  if (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) {
    return (window as any).__API_BASE_URL__;
  }
  // Default to localhost for development
  return import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';
};

const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Enable cookies for authentication
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error("API Error:", errorMessage);
    
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        store.dispatch(logout());
        // Use relative path to handle base path correctly
        const basePath = import.meta.env.BASE_URL || '';
        window.location.href = `${basePath}/login`.replace(/\/+/g, '/');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
