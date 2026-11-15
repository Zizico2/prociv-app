import { defineConfig, devices } from '@playwright/test';

if (!process.env.DEPLOYED_TEST_URL) throw new Error('Set DEPLOYED_TEST_URL');
export default defineConfig({
  testDir: './tests/deployed',
  use: {
    baseURL: process.env.DEPLOYED_TEST_URL,
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          'x-vercel-protection-bypass':
            process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        }
      : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
