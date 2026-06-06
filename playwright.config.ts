import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/results',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // run serially — shared local backend DB
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/report', open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  globalSetup: './tests/e2e/global-setup.ts',

  webServer: [
    {
      command: 'node_modules\\.bin\\vite.cmd --port 5173 --host 0.0.0.0',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      // Start the local wrangler backend so API calls resolve without mocking.
      // Uses the D1 database seeded by globalSetup.
      command: 'powershell -Command "Set-Location ..\\ufcim-backend-proto; npx wrangler dev --env dev --port 8787"',
      url: 'http://localhost:8787/dev/jwks',
      reuseExistingServer: true,
      timeout: 90_000,
    },
  ],
});
