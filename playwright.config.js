import { defineConfig } from '@playwright/test';

const e2eBaseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4178/drivepoint/';
const useWebServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests',
  globalTeardown: './tests/global-teardown.js',
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: e2eBaseURL,
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  webServer: useWebServer ? {
      command: 'node tests/web-server.mjs',
      url: e2eBaseURL,
      timeout: 120_000,
      reuseExistingServer: false,
      gracefulShutdown: {
        signal: 'SIGTERM',
        timeout: 5_000,
      },
    } : undefined,
});
