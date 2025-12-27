import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Root directory - defaults to where vite.config.ts is located (frontend folder)
      // index.html should be in the frontend root, not in src
      server: {
        port: 5000,
        host: '0.0.0.0',
      },
      plugins: [
        react()
      ],
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', 'recharts'],
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
      },
      // Public directory for static assets
      publicDir: 'public'
    };
});
