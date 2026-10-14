import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.PLAYWRIGHT_PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PLAYWRIGHT_PORT must be a valid port number.');
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'visualizers.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 60000 },
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
