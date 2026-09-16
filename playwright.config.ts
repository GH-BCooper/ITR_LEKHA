import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '3000';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: `http://127.0.0.1:${port}`, ...devices['Desktop Chrome'] },
  webServer: { command: `npm run dev -- -H 127.0.0.1 -p ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: true }
});
