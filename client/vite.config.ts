/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    env: {
      // Not currently hit by any test (everything mocks api/auth), but
      // keeps a future test that exercises the real api/client.ts from
      // failing on its fail-fast VITE_API_URL check.
      VITE_API_URL: 'http://localhost:5000/api',
    },
  },
});
