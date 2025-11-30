import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
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
                // Keep React, React DOM, and React Redux together to avoid useSyncExternalStore issues
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-redux')) {
                  return 'react-vendor';
                }
                // Redux Toolkit (can be separate from react-redux)
                if (id.includes('@reduxjs/toolkit')) {
                  return 'redux-vendor';
                }
                // Router
                if (id.includes('react-router')) {
                  return 'router-vendor';
                }
                // Charts library (can be large)
                if (id.includes('recharts')) {
                  return 'charts-vendor';
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
          }
        }
      },
      // Public directory for static assets
      publicDir: 'public'
    };
});
