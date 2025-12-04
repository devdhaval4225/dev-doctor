import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['doctor-svgrepo-com.svg'],
          manifest: {
            name: 'MediNexus - Doctor Management System',
            short_name: 'MediNexus',
            description: 'Comprehensive doctor management system for managing patients, appointments, and medical records',
            theme_color: '#3B82F6',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait-primary',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: '/doctor-svgrepo-com.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ],
            shortcuts: [
              {
                name: 'Dashboard',
                short_name: 'Dashboard',
                description: 'View dashboard',
                url: '/',
                icons: [{ src: '/doctor-svgrepo-com.svg', sizes: '192x192' }]
              },
              {
                name: 'Patients',
                short_name: 'Patients',
                description: 'Manage patients',
                url: '/patients',
                icons: [{ src: '/doctor-svgrepo-com.svg', sizes: '192x192' }]
              },
              {
                name: 'Appointments',
                short_name: 'Appointments',
                description: 'View appointments',
                url: '/appointments',
                icons: [{ src: '/doctor-svgrepo-com.svg', sizes: '192x192' }]
              }
            ]
          },
          workbox: {
            // Only precache in production builds
            globPatterns: mode === 'production' 
              ? ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}']
              : [],
            globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js', '**/sw.js', '**/workbox-*.js'],
            cleanupOutdatedCaches: true,
            skipWaiting: true,
            clientsClaim: true,
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^http:\/\/localhost:3000\/api\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 5 // 5 minutes
                  },
                  networkTimeoutSeconds: 10,
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  }
                }
              }
            ],
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/api/]
          },
          devOptions: {
            enabled: true,
            type: 'module',
            navigateFallback: 'index.html'
          }
        })
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
