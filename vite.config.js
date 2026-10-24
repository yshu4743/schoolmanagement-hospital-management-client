import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the Hospital Management client.
// /api requests are proxied to the Express server during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
