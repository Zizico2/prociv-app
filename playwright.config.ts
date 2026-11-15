import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure' },
  reporter: 'list',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node --import tsx tests/fixtures/grpc-server.ts',
      port: 50111,
      reuseExistingServer: false,
    },
    {
      command: 'bun run dev --port 3101',
      url: 'http://127.0.0.1:3101',
      env: {
        PROCIV_GRPC_URL: 'http://127.0.0.1:50111',
        NEXT_DIST_DIR: 'build/e2e',
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
