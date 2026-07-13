import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { config } from "dotenv";

config({ path: process.env.E2E_API_ENV_FILE ?? resolve("apps/api/.env") });

const child = spawn(
  "pnpm",
  ["--filter", "@repo/api", "exec", "tsx", "src/main.ts"],
  { cwd: process.cwd(), env: process.env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code) => process.exit(code ?? 1));
