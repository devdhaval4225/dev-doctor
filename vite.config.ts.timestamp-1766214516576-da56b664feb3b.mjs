// vite.config.ts
import { defineConfig, loadEnv } from "file:///D:/thredGITHUB/doctor1/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/thredGITHUB/doctor1/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    // Root directory - defaults to where vite.config.ts is located (frontend folder)
    // index.html should be in the frontend root, not in src
    server: {
      port: 5e3,
      host: "::"
      // host: '0.0.0.0',
    },
    plugins: [
      react()
    ],
    optimizeDeps: {
      include: ["react", "react-dom", "react-redux", "@reduxjs/toolkit", "recharts"],
      force: true
      // Force re-optimization
    },
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(env.VITE_API_BASE_URL || "")
    },
    resolve: {
      alias: {
        "@": "/src"
      }
    },
    build: {
      // Build output directory name - will be created in the frontend root
      // Change this name if you want a different build folder name (e.g., 'build', 'output')
      outDir: "dist",
      // Remove old files before building
      emptyOutDir: true,
      // Source map for production debugging (set to false for smaller builds)
      sourcemap: false,
      // Code splitting and chunk optimization
      chunkSizeWarningLimit: 1e3,
      // Set warning limit to 1000KB (1MB)
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching and loading performance
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if ((id.includes("/react/") || id.includes("\\react\\")) && !id.includes("react-router") && !id.includes("react-redux") && !id.includes("react-dom") && !id.includes("react-datepicker") && !id.includes("react-phone-number-input")) {
                return "react-vendor";
              }
              if (id.includes("react-dom") && !id.includes("react-dom/")) {
                return "react-vendor";
              }
              if (id.includes("react-redux") || id.includes("@reduxjs/toolkit") || id.includes("use-sync-external-store")) {
                return "react-vendor";
              }
              if (id.includes("react-router")) {
                return "router-vendor";
              }
              if (id.includes("recharts") || id.includes("react-smooth") || id.includes("react-transition-group")) {
                return "charts-vendor";
              }
              if (id.includes("jspdf") || id.includes("html2canvas")) {
                return "pdf-vendor";
              }
              if (id.includes("lucide-react")) {
                return "icons-vendor";
              }
              if (id.includes("socket.io")) {
                return "socket-vendor";
              }
              if (id.includes("formik") || id.includes("yup")) {
                return "form-vendor";
              }
              if (id.includes("crypto-js")) {
                return "crypto-vendor";
              }
              if (id.includes("react-datepicker")) {
                return "datepicker-vendor";
              }
              if (id.includes("react-phone-number-input")) {
                return "phone-vendor";
              }
              if (id.includes("axios")) {
                return "axios-vendor";
              }
              if (id.includes("lodash") || id.includes("moment") || id.includes("date-fns")) {
                return "utils-vendor";
              }
              const match = id.match(/node_modules\/(@?[^\/\\]+)/);
              if (match) {
                const packageName = match[1];
                if (packageName.startsWith("@")) {
                  const scopedMatch = id.match(/node_modules\/@([^\/\\]+)\/([^\/\\]+)/);
                  if (scopedMatch) {
                    const scope = scopedMatch[1];
                    const pkg = scopedMatch[2];
                    return `vendor-${scope}-${pkg}`;
                  }
                  return `vendor-${packageName.replace("@", "").split("/")[0]}`;
                }
                const largePackages = ["immer", "redux-persist", "reselect"];
                if (largePackages.some((pkg) => id.includes(pkg))) {
                  return `vendor-${packageName}`;
                }
                return "vendor-misc";
              }
              return "vendor-misc";
            }
          },
          // Optimize chunk file names
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
        },
        // Ensure proper external dependency handling
        external: []
      }
    },
    // Public directory for static assets
    publicDir: "public"
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFx0aHJlZEdJVEhVQlxcXFxkb2N0b3IxXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFx0aHJlZEdJVEhVQlxcXFxkb2N0b3IxXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi90aHJlZEdJVEhVQi9kb2N0b3IxL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsICcuJywgJycpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgLy8gUm9vdCBkaXJlY3RvcnkgLSBkZWZhdWx0cyB0byB3aGVyZSB2aXRlLmNvbmZpZy50cyBpcyBsb2NhdGVkIChmcm9udGVuZCBmb2xkZXIpXHJcbiAgICAgIC8vIGluZGV4Lmh0bWwgc2hvdWxkIGJlIGluIHRoZSBmcm9udGVuZCByb290LCBub3QgaW4gc3JjXHJcbiAgICAgIHNlcnZlcjoge1xyXG4gICAgICAgIHBvcnQ6IDUwMDAsXHJcbiAgICAgICAgaG9zdDogJzo6JyxcclxuICAgICAgICAvLyBob3N0OiAnMC4wLjAuMCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsdWdpbnM6IFtcclxuICAgICAgICByZWFjdCgpXHJcbiAgICAgIF0sXHJcbiAgICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJlZHV4JywgJ0ByZWR1eGpzL3Rvb2xraXQnLCAncmVjaGFydHMnXSxcclxuICAgICAgICBmb3JjZTogdHJ1ZSwgLy8gRm9yY2UgcmUtb3B0aW1pemF0aW9uXHJcbiAgICAgIH0sXHJcbiAgICAgIGRlZmluZToge1xyXG4gICAgICAgICdwcm9jZXNzLmVudi5BUElfS0VZJzogSlNPTi5zdHJpbmdpZnkoZW52LkdFTUlOSV9BUElfS0VZKSxcclxuICAgICAgICAncHJvY2Vzcy5lbnYuR0VNSU5JX0FQSV9LRVknOiBKU09OLnN0cmluZ2lmeShlbnYuR0VNSU5JX0FQSV9LRVkpLFxyXG4gICAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9BUElfQkFTRV9VUkwnOiBKU09OLnN0cmluZ2lmeShlbnYuVklURV9BUElfQkFTRV9VUkwgfHwgJycpXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc29sdmU6IHtcclxuICAgICAgICBhbGlhczoge1xyXG4gICAgICAgICAgJ0AnOiAnL3NyYycsXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBidWlsZDoge1xyXG4gICAgICAgIC8vIEJ1aWxkIG91dHB1dCBkaXJlY3RvcnkgbmFtZSAtIHdpbGwgYmUgY3JlYXRlZCBpbiB0aGUgZnJvbnRlbmQgcm9vdFxyXG4gICAgICAgIC8vIENoYW5nZSB0aGlzIG5hbWUgaWYgeW91IHdhbnQgYSBkaWZmZXJlbnQgYnVpbGQgZm9sZGVyIG5hbWUgKGUuZy4sICdidWlsZCcsICdvdXRwdXQnKVxyXG4gICAgICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgICAgIC8vIFJlbW92ZSBvbGQgZmlsZXMgYmVmb3JlIGJ1aWxkaW5nXHJcbiAgICAgICAgZW1wdHlPdXREaXI6IHRydWUsXHJcbiAgICAgICAgLy8gU291cmNlIG1hcCBmb3IgcHJvZHVjdGlvbiBkZWJ1Z2dpbmcgKHNldCB0byBmYWxzZSBmb3Igc21hbGxlciBidWlsZHMpXHJcbiAgICAgICAgc291cmNlbWFwOiBmYWxzZSxcclxuICAgICAgICAvLyBDb2RlIHNwbGl0dGluZyBhbmQgY2h1bmsgb3B0aW1pemF0aW9uXHJcbiAgICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLCAvLyBTZXQgd2FybmluZyBsaW1pdCB0byAxMDAwS0IgKDFNQilcclxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgLy8gTWFudWFsIGNodW5rIHNwbGl0dGluZyBmb3IgYmV0dGVyIGNhY2hpbmcgYW5kIGxvYWRpbmcgcGVyZm9ybWFuY2VcclxuICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiAoaWQpID0+IHtcclxuICAgICAgICAgICAgICAvLyBTcGxpdCBub2RlX21vZHVsZXMgaW50byBzZXBhcmF0ZSBjaHVua3NcclxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBDUklUSUNBTDogUmVhY3QgYW5kIFJlYWN0RE9NIG11c3QgYmUgaW4gdGhlIHNhbWUgY2h1bmsgYW5kIGxvYWRlZCBGSVJTVFxyXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBcIkNhbm5vdCByZWFkIHByb3BlcnRpZXMgb2YgdW5kZWZpbmVkIChyZWFkaW5nICd1c2VTeW5jRXh0ZXJuYWxTdG9yZScpXCIgZXJyb3JzXHJcbiAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgIChpZC5pbmNsdWRlcygnL3JlYWN0LycpIHx8IGlkLmluY2x1ZGVzKCdcXFxccmVhY3RcXFxcJykpICYmXHJcbiAgICAgICAgICAgICAgICAgICFpZC5pbmNsdWRlcygncmVhY3Qtcm91dGVyJykgJiZcclxuICAgICAgICAgICAgICAgICAgIWlkLmluY2x1ZGVzKCdyZWFjdC1yZWR1eCcpICYmXHJcbiAgICAgICAgICAgICAgICAgICFpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgJiZcclxuICAgICAgICAgICAgICAgICAgIWlkLmluY2x1ZGVzKCdyZWFjdC1kYXRlcGlja2VyJykgJiZcclxuICAgICAgICAgICAgICAgICAgIWlkLmluY2x1ZGVzKCdyZWFjdC1waG9uZS1udW1iZXItaW5wdXQnKVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiAncmVhY3QtdmVuZG9yJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIE1hdGNoIHJlYWN0LWRvbVxyXG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1kb20nKSAmJiAhaWQuaW5jbHVkZXMoJ3JlYWN0LWRvbS8nKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LXZlbmRvcic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBSZWFjdCBSZWR1eCBhbmQgUmVkdXggVG9vbGtpdCBtdXN0IGFsc28gYmUgd2l0aCBSZWFjdFxyXG4gICAgICAgICAgICAgICAgLy8gVGhleSBkZXBlbmQgb24gUmVhY3QncyB1c2VTeW5jRXh0ZXJuYWxTdG9yZSBob29rXHJcbiAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdyZWFjdC1yZWR1eCcpIHx8XHJcbiAgICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdAcmVkdXhqcy90b29sa2l0JykgfHxcclxuICAgICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3VzZS1zeW5jLWV4dGVybmFsLXN0b3JlJylcclxuICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LXZlbmRvcic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZXIgLSBzZXBhcmF0ZSBjaHVua1xyXG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1yb3V0ZXInKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ3JvdXRlci12ZW5kb3InO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gUmVjaGFydHMgLSBsYXJnZSBsaWJyYXJ5LCBzZXBhcmF0ZSBjaHVua1xyXG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWNoYXJ0cycpIHx8IGlkLmluY2x1ZGVzKCdyZWFjdC1zbW9vdGgnKSB8fCBpZC5pbmNsdWRlcygncmVhY3QtdHJhbnNpdGlvbi1ncm91cCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiAnY2hhcnRzLXZlbmRvcic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBQREYgZ2VuZXJhdGlvbiBsaWJyYXJpZXMgKHZlcnkgbGFyZ2UpIC0gc2VwYXJhdGUgY2h1bmtcclxuICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnanNwZGYnKSB8fCBpZC5pbmNsdWRlcygnaHRtbDJjYW52YXMnKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ3BkZi12ZW5kb3InO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gSWNvbnMgbGlicmFyeSAtIHNlcGFyYXRlIGNodW5rXHJcbiAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2x1Y2lkZS1yZWFjdCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiAnaWNvbnMtdmVuZG9yJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIFNvY2tldC5pbyAtIHNlcGFyYXRlIGNodW5rXHJcbiAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3NvY2tldC5pbycpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiAnc29ja2V0LXZlbmRvcic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBGb3JtIGxpYnJhcmllcyAtIHNlcGFyYXRlIGNodW5rXHJcbiAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2Zvcm1paycpIHx8IGlkLmluY2x1ZGVzKCd5dXAnKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ2Zvcm0tdmVuZG9yJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIENyeXB0byBsaWJyYXJpZXMgLSBzZXBhcmF0ZSBjaHVua1xyXG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdjcnlwdG8tanMnKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ2NyeXB0by12ZW5kb3InO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gRGF0ZSBwaWNrZXIgLSBzZXBhcmF0ZSBjaHVua1xyXG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1kYXRlcGlja2VyJykpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuICdkYXRlcGlja2VyLXZlbmRvcic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBQaG9uZSBudW1iZXIgaW5wdXQgLSBzZXBhcmF0ZSBjaHVua1xyXG4gICAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1waG9uZS1udW1iZXItaW5wdXQnKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ3Bob25lLXZlbmRvcic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBBeGlvcyAoSFRUUCBjbGllbnQpIC0gc2VwYXJhdGUgY2h1bmtcclxuICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnYXhpb3MnKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ2F4aW9zLXZlbmRvcic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBHcm91cCByZW1haW5pbmcgcGFja2FnZXMgYnkgc2l6ZSBhbmQgdHlwZVxyXG4gICAgICAgICAgICAgICAgLy8gTGFyZ2UgdXRpbGl0eSBsaWJyYXJpZXNcclxuICAgICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbG9kYXNoJykgfHwgaWQuaW5jbHVkZXMoJ21vbWVudCcpIHx8IGlkLmluY2x1ZGVzKCdkYXRlLWZucycpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiAndXRpbHMtdmVuZG9yJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIFNwbGl0IHJlbWFpbmluZyBwYWNrYWdlcyBtb3JlIGFnZ3Jlc3NpdmVseVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBpZC5tYXRjaCgvbm9kZV9tb2R1bGVzXFwvKEA/W15cXC9cXFxcXSspLyk7XHJcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgcGFja2FnZU5hbWUgPSBtYXRjaFsxXTtcclxuICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNjb3BlZCBwYWNrYWdlc1xyXG4gICAgICAgICAgICAgICAgICBpZiAocGFja2FnZU5hbWUuc3RhcnRzV2l0aCgnQCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NvcGVkTWF0Y2ggPSBpZC5tYXRjaCgvbm9kZV9tb2R1bGVzXFwvQChbXlxcL1xcXFxdKylcXC8oW15cXC9cXFxcXSspLyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlZE1hdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY29wZSA9IHNjb3BlZE1hdGNoWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGtnID0gc2NvcGVkTWF0Y2hbMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBLZWVwIHNtYWxsIHNjb3BlZCBwYWNrYWdlcyB0b2dldGhlciwgYnV0IGxpbWl0IGNodW5rIHNpemVcclxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgdmVuZG9yLSR7c2NvcGV9LSR7cGtnfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgdmVuZG9yLSR7cGFja2FnZU5hbWUucmVwbGFjZSgnQCcsICcnKS5zcGxpdCgnLycpWzBdfWA7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgLy8gRm9yIG5vbi1zY29wZWQgcGFja2FnZXMsIGdyb3VwIHNtYWxsZXIgb25lcyB0b2dldGhlclxyXG4gICAgICAgICAgICAgICAgICAvLyBPbmx5IGNyZWF0ZSBpbmRpdmlkdWFsIGNodW5rcyBmb3Iga25vd24gbGFyZ2UgcGFja2FnZXNcclxuICAgICAgICAgICAgICAgICAgY29uc3QgbGFyZ2VQYWNrYWdlcyA9IFsnaW1tZXInLCAncmVkdXgtcGVyc2lzdCcsICdyZXNlbGVjdCddO1xyXG4gICAgICAgICAgICAgICAgICBpZiAobGFyZ2VQYWNrYWdlcy5zb21lKHBrZyA9PiBpZC5pbmNsdWRlcyhwa2cpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgdmVuZG9yLSR7cGFja2FnZU5hbWV9YDtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAvLyBHcm91cCBzbWFsbGVyIHBhY2thZ2VzIHRvZ2V0aGVyIHRvIGF2b2lkIHRvbyBtYW55IGNodW5rc1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1taXNjJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBhbnkgb3RoZXIgbm9kZV9tb2R1bGVzXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1taXNjJztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIE9wdGltaXplIGNodW5rIGZpbGUgbmFtZXNcclxuICAgICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaF0uanMnLFxyXG4gICAgICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bZXh0XS9bbmFtZV0tW2hhc2hdLltleHRdJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIC8vIEVuc3VyZSBwcm9wZXIgZXh0ZXJuYWwgZGVwZW5kZW5jeSBoYW5kbGluZ1xyXG4gICAgICAgICAgZXh0ZXJuYWw6IFtdXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICAvLyBQdWJsaWMgZGlyZWN0b3J5IGZvciBzdGF0aWMgYXNzZXRzXHJcbiAgICAgIHB1YmxpY0RpcjogJ3B1YmxpYydcclxuICAgIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVSLFNBQVMsY0FBYyxlQUFlO0FBQzdULE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN0QyxRQUFNLE1BQU0sUUFBUSxNQUFNLEtBQUssRUFBRTtBQUNqQyxTQUFPO0FBQUE7QUFBQTtBQUFBLElBR0wsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBO0FBQUEsSUFFUjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLElBQ1I7QUFBQSxJQUNBLGNBQWM7QUFBQSxNQUNaLFNBQVMsQ0FBQyxTQUFTLGFBQWEsZUFBZSxvQkFBb0IsVUFBVTtBQUFBLE1BQzdFLE9BQU87QUFBQTtBQUFBLElBQ1Q7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLHVCQUF1QixLQUFLLFVBQVUsSUFBSSxjQUFjO0FBQUEsTUFDeEQsOEJBQThCLEtBQUssVUFB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
