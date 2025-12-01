import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Root directory - defaults to where vite.config.ts is located (frontend folder)
      // index.html should be in the frontend root, not in src
      server: {
        port: 5000,
        // host: '::',
        host: '0.0.0.0',
      },
      plugins: [react()],
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', 'recharts'],
        force: true, // Force re-optimization
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://dev-doctor.vercel.app' || '')
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
        chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB (optional)
        rollupOptions: {
          output: {
            // Manual chunk splitting for better caching and loading performance
            manualChunks: (id) => {
              // Split node_modules into separate chunks
              if (id.includes('node_modules')) {
                // CRITICAL: React and ReactDOM must be in the same chunk and loaded FIRST
                // This prevents "Cannot read properties of undefined (reading 'useSyncExternalStore')" errors
                // Match React core more reliably (exclude react-router, react-redux, etc.)
                if (
                  (id.includes('/react/') || id.includes('\\react\\')) &&
                  !id.includes('react-router') &&
                  !id.includes('react-redux') &&
                  !id.includes('react-dom')
                ) {
                  return 'react-vendor';
                }
                // Match react-dom
                if (id.includes('react-dom')) {
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
                // Recharts must be with React to avoid initialization errors
                // It's a React component library and has dependencies on React
                if (id.includes('recharts') || id.includes('react-smooth') || id.includes('react-transition-group')) {
                  return 'react-vendor';
                }
                // Router
                if (id.includes('react-router')) {
                  return 'router-vendor';
                }
                // Icons library
                if (id.includes('lucide-react')) {
                  return 'icons-vendor';
                }
                // Socket.io
                if (id.includes('socket.io')) {
                  return 'socket-vendor';
                }
                // Form libraries
                if (id.includes('formik') || id.includes('yup')) {
                  return 'form-vendor';
                }
                // Other vendor libraries
                return 'vendor';
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
