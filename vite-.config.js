import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // ensures correct asset paths for Cloudflare
  build: {
    outDir: 'dist'
  },
  server: {
    host: true,
    port: 5173
  }
});