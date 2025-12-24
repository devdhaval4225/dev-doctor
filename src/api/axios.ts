
import axios from 'axios';
import { store, logout } from '../redux/store';
import { API_CONFIG } from '../config/api.config';
import { encrypt } from '../utils/encryption';

// Get API base URL from environment variable or use default
const getApiBaseURL = (): string => {
  // Priority 1: Environment variable (set during build via .env file)
  // if (import.meta.env.VITE_API_BASE_URL) {
  //   return import.meta.env.VITE_API_BASE_URL;
  // }

  // Priority 2: Runtime configuration (set in index.html or window object)
  // if (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) {
  //   return (window as any).__API_BASE_URL__;
  // }

  // Priority 3: Config file
  // if (API_CONFIG.baseURL) {
  //   return API_CONFIG.baseURL;
  // }

  // Priority 4: Default values
  // Development: use localhost
  // Production: use relative URL (same domain as frontend)
  // return import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';

  return `https://doctor-b-dc9j.onrender.com/api`;
};

const api = axios.create({
  baseURL: getApiBaseURL(),
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

    // Preserve custom headers (like X-Timezone) that might be set in the request
    // These should not be overwritten

    // Skip encryption for FormData (file uploads) - FormData should be sent as multipart/form-data
    const isFormData = config.data instanceof FormData;
    const isMultipartFormData = config.headers['Content-Type'] === 'multipart/form-data';

    // Only encrypt for 3 specific endpoints: login, register, and password change
    const url = config.url || '';
    const shouldEncrypt =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      (url.includes('/user/profile') && config.method?.toLowerCase() === 'put' && config.data && typeof config.data === 'object' && 'password' in config.data);

    // Encrypt request body only for specific endpoints
    if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '') && !isFormData && !isMultipartFormData && shouldEncrypt) {
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

    // For FormData, let axios set the Content-Type header automatically (it will include boundary)
    if (isFormData) {
      // Remove Content-Type header to let axios set it automatically with boundary
      delete config.headers['Content-Type'];
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
