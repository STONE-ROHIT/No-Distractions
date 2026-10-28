import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev server ports:
//   - The client runs on 3000 (the port the sandbox gateway exposes).
//   - /api requests are proxied to the Express server on 4000, so the
//     browser only ever talks to one origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
    // The sandbox preview reaches Vite through a reverse proxy, so allow
    // any host header during development. Remove this for other setups.
    allowedHosts: true,
  },
  // `vite preview` (production build) needs the same /api proxy so the
  // built app can talk to the Express server — also the configuration to
  // use when trying offline mode (the service worker only registers in
  // production builds).
  preview: {
    port: 4173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
})
