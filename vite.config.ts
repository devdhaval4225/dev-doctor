import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Root directory - defaults to where vite.config.ts is located (frontend folder)
      // index.html should be in the frontend root, not in src
      server: {
        port: 5000,
        host: '::',
        // host: '0.0.0.0',
      },
      plugins: [
        react() // , cloudflare()
      ],
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', 'recharts'],
        force: true, // Force re-optimization
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || '')
      },
      resolve: {
        alias: {
          '@': '/src',
        }
      },
      build: {
        // Build output directory name - will be created in the frontend root
        // Change this name if you want a different build folder name (e.g., 'build', 'output')
        outDir: 'dist',
        // Remove old files before building
        emptyOutDir: true,
        // Source map for production debugging (set to false for smaller builds)
        sourcemap: false,
        // Code splitting and chunk optimization
        chunkSizeWarningLimit: 1000, // Set warning limit to 1000KB (1MB)
        rollupOptions: {
          output: {
            // Manual chunk splitting for better caching and loading performance
            manualChunks: (id) => {
              // Split node_modules into separate chunks
              if (id.includes('node_modules')) {
                // CRITICAL: React and ReactDOM must be in the same chunk and loaded FIRST
                // This prevents "Cannot read properties of undefined (reading 'useSyncExternalStore')" errors
                if (
                  (id.includes('/react/') || id.includes('\\react\\')) &&
                  !id.includes('react-router') &&
                  !id.includes('react-redux') &&
                  !id.includes('react-dom') &&
                  !id.includes('react-datepicker') &&
                  !id.includes('react-phone-number-input')
                ) {
                  return 'react-vendor';
                }
                // Match react-dom
                if (id.includes('react-dom') && !id.includes('react-dom/')) {
                  return 'react-vendor';
                }
                // React Redux and Redux Toolkit must also be with React
                // They depend on React's useSyncExternalStore hook
                if (
                  id.includes('react-redux') ||
                  id.includes('@reduxjs/toolkit') ||
                  id.includes('use-sync-external-store')
                ) {
                  return 'react-vendor';
                }
                // Router - separate chunk
                if (id.includes('react-router')) {
                  return 'router-vendor';
                }
                // Recharts - large library, separate chunk
                if (id.includes('recharts') || id.includes('react-smooth') || id.includes('react-transition-group')) {
                  return 'charts-vendor';
                }
                // PDF generation libraries (very large) - separate chunk
                if (id.includes('jspdf') || id.includes('html2canvas')) {
                  return 'pdf-vendor';
                }
                // Icons library - separate chunk
                if (id.includes('lucide-react')) {
                  return 'icons-vendor';
                }
                // Socket.io - separate chunk
                if (id.includes('socket.io')) {
                  return 'socket-vendor';
                }
                // Form libraries - separate chunk
                if (id.includes('formik') || id.includes('yup')) {
                  return 'form-vendor';
                }
                // Crypto libraries - separate chunk
                if (id.includes('crypto-js')) {
                  return 'crypto-vendor';
                }
                // Date picker - separate chunk
                if (id.includes('react-datepicker')) {
                  return 'datepicker-vendor';
                }
                // Phone number input - separate chunk
                if (id.includes('react-phone-number-input')) {
                  return 'phone-vendor';
                }
                // Axios (HTTP client) - separate chunk
                if (id.includes('axios')) {
                  return 'axios-vendor';
                }
                // Group remaining packages by size and type
                // Large utility libraries
                if (id.includes('lodash') || id.includes('moment') || id.includes('date-fns')) {
                  return 'utils-vendor';
                }
                // Split remaining packages more aggressively
                const match = id.match(/node_modules\/(@?[^\/\\]+)/);
                if (match) {
                  const packageName = match[1];
                  // Handle scoped packages
                  if (packageName.startsWith('@')) {
                    const scopedMatch = id.match(/node_modules\/@([^\/\\]+)\/([^\/\\]+)/);
                    if (scopedMatch) {
                      const scope = scopedMatch[1];
                      const pkg = scopedMatch[2];
                      // Keep small scoped packages together, but limit chunk size
                      return `vendor-${scope}-${pkg}`;
                    }
                    return `vendor-${packageName.replace('@', '').split('/')[0]}`;
                  }
                  // For non-scoped packages, group smaller ones together
                  // Only create individual chunks for known large packages
                  const largePackages = ['immer', 'redux-persist', 'reselect'];
                  if (largePackages.some(pkg => id.includes(pkg))) {
                    return `vendor-${packageName}`;
                  }
                  // Group smaller packages together to avoid too many chunks
                  return 'vendor-misc';
                }
                // Fallback for any other node_modules
                return 'vendor-misc';
              }
            },
            // Optimize chunk file names
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
          },
          // Ensure proper external dependency handling
          external: []
        }
      },
      // Public directory for static assets
      publicDir: 'public'
    };
});
