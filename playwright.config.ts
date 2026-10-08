import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and accessibility checks against a production build on the fictional development database.
 * The global setup resets and reseeds that database, so never point this at shared data.
 *
 *   npm run test:e2e                         builds, starts on :3200, runs
 *   E2E_BASE_URL=http://localhost:3100 npm run test:e2e   reuse a running server
 */
const port = 3200;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npx next start -p ${port}`, url: `${baseURL}/api/health`, reuseExistingServer: true, timeout: 120_000 },
});
