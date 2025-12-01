/**
 * API Configuration
 * 
 * This file provides a centralized way to configure the API base URL
 * without requiring environment variables.
 * 
 * Priority:
 * 1. Environment variable (VITE_API_BASE_URL)
 * 2. Runtime configuration (window.__API_BASE_URL__)
 * 3. This config file
 * 4. Default values
 */

export const API_CONFIG = {
  // Set your production API URL here if you can't use .env file
  // Examples:
  // PRODUCTION: 'https://dev-doctor.vercel.app/api'
  // DEVELOPMENT: 'http://localhost:3000/api'
  // RELATIVE: '/api' (uses same domain as frontend)
  
  baseURL: 'https://dev-doctor.vercel.app/api', // Set your production API URL here
  
  // You can also set this at runtime by adding this to your index.html:
  // <script>window.__API_BASE_URL__ = 'https://your-api-url.com/api';</script>
};

