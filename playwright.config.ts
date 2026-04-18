import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
