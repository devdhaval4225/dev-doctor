
import axios from 'axios';
import { store, logout } from '../redux/store';
import { API_CONFIG } from '../config/api.config';
import { encrypt } from '../utils/encryption';

// Get API base URL from environment variable or use default
const getApiBaseURL = (): string => {
  // Priority 1: Environment variable (set during build via .env file)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Priority 2: Runtime configuration (set in index.html or window object)
  if (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) {
    return (window as any).__API_BASE_URL__;
  }
  
  // Priority 3: Config file
  if (API_CONFIG.baseURL) {
    return API_CONFIG.baseURL;
  }
  
  // Priority 4: Default values
  // Development: use localhost
  // Production: use relative URL (same domain as frontend)
  return import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';
};

const api = axios.create({
  baseURL: `http://localhost:3000/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Enable cookies for authentication
});

// Request interceptor to add token and encrypt body
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Encrypt request body for POST, PUT, PATCH requests
    if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
      try {
        // Convert data to JSON string, encrypt it, and send as encrypted string
        const jsonString = JSON.stringify(config.data);
        const encrypted = encrypt(jsonString);
        config.data = { encrypted }; // Send as { encrypted: "..." }
        config.headers['Content-Type'] = 'application/json';
      } catch (error) {
        console.error('Encryption error:', error);
        return Promise.reject(error);
      }
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
