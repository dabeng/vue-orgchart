import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './test/e2e', fullyParallel: true, forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, workers: process.env.CI ? 2 : 4,
  timeout: 45000, expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5180', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }, { name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } }],
  webServer: { command: 'npm run dev -- --port 5180 --strictPort', url: 'http://127.0.0.1:5180', reuseExistingServer: !process.env.CI },
})