// Playwright configuration for E2E testing
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1,
  timeout: 60_000,

  reporter: process.env.CI ? [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github']
  ] : [['html']],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npx tsx server/index.ts',
    url: 'http://localhost:5000',
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    timeout: 120 * 1000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      LOCAL_AUTH_BYPASS: '1',
    },
  },
});