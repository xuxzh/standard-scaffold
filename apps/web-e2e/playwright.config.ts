import { defineConfig, devices } from "@playwright/test";
import { getBaseURL, isLocalMode } from "./helpers/env";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: getBaseURL(),
    locale: "zh-CN",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: isLocalMode()
    ? {
        command: "pnpm --filter @repo/web exec vite --host 127.0.0.1 --port 4173",
        url: getBaseURL(),
        reuseExistingServer: !process.env.CI,
        cwd: "../../"
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
