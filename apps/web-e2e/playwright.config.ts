import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { getBaseURL, isLocalMode, shouldUseApiMocks } from "./helpers/env";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

function getLocalWebServerCommand() {
  const envPrefix = shouldUseApiMocks() ? "VITE_ENABLE_API_MOCKING=true " : "";

  return `${envPrefix}pnpm --filter @repo/web exec vite --host 127.0.0.1 --port 4173`;
}

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
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
    video: "retain-on-failure",
  },
  webServer: isLocalMode()
    ? {
        command: getLocalWebServerCommand(),
        url: getBaseURL(),
        reuseExistingServer: false,
        cwd: workspaceRoot,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
