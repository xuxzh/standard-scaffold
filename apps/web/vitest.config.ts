import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Expose DEV as a stubbable env var so tests can flip
    // `import.meta.env.DEV` per case to exercise the dev-vs-prod split
    // in `lib/api/*-client.ts` resolve functions.
    env: {
      DEV: "false"
    }
  }
});
