import { API_CACHE, AVAILABILITY_CACHE } from './src/utils/cache-names';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,glb,json,wasm}'],
        globIgnores: ['_worker.js', 'libs/draco/draco_decoder.js'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/spaces\/[^/]+\/availability/,
            handler: 'NetworkFirst',
            options: {
              cacheName: AVAILABILITY_CACHE,
              networkTimeoutSeconds: 3,
              expiration: { maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /\/api\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: API_CACHE,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        id: '/',
        name: 'UFCIM — Reserva de Espaços UFC',
        short_name: 'UFCIM',
        theme_color: '#00697D',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        lang: 'pt-BR',
        categories: ['productivity', 'education'],
        icons: [
          { src: '/icons/icon-192.png',     sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png',     sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Agent worktrees live under .claude/ and Playwright writes HTML reports
    // under tests/e2e; an .html change there forces a full page reload mid-test.
    watch: {
      ignored: ['**/.claude/**', '**/tests/e2e/report/**', '**/tests/e2e/results/**'],
    },
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    env: { TZ: 'UTC' },
    include: ['tests/unit/**/*.{test,spec}.ts'],
  },
});
