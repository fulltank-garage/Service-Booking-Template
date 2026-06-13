import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*production-smoke\.spec\.ts/,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.ADMIN_BASE_URL ?? 'https://service-booking-template-admin-production.up.railway.app',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
  ],
})
