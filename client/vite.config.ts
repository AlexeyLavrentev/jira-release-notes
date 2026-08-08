import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config (CONTEXT.md D-02): dev server proxies /api and /health to Fastify on :3000.
 * Build output goes to client/dist (served by @fastify/static in production).
 */
export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
