import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

import { getBaseURL } from "./helpers/env";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
const contextDirectory = fileURLToPath(
  new URL("./fixtures/ai-chat-context", import.meta.url),
);

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: getBaseURL(),
    locale: "zh-CN",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "node --experimental-strip-types apps/web-e2e/helpers/fake-hermes-server.ts",
      url: "http://127.0.0.1:8660/health",
      reuseExistingServer: false,
      cwd: workspaceRoot,
    },
    {
      command: "node --experimental-strip-types apps/web-e2e/helpers/start-ai-chat-api.ts",
      url: "http://127.0.0.1:3000/api/ai/health",
      reuseExistingServer: false,
      cwd: workspaceRoot,
      env: {
        HERMES_API_BASE_URL: "http://127.0.0.1:8660",
        HERMES_API_KEY: "e2e-hermes-key",
        HERMES_REQUEST_TIMEOUT_MS: "10000",
        MES_CONTEXT_DIRECTORY: contextDirectory,
      },
    },
    {
      command: "DEV_API_PROXY_ENABLED=true DEV_AI_API_PROXY_TARGET=http://127.0.0.1:3000 VITE_ENABLE_API_MOCKING=true pnpm --filter @repo/web exec vite --host 127.0.0.1 --port 4173",
      url: getBaseURL(),
      reuseExistingServer: false,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
