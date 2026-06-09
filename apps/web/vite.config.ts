import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";

const DEFAULT_DEV_PROXY_TARGETS = {
  app: "http://192.168.0.135:8288",
  wms: "http://192.168.0.135:8283",
  mes: "http://192.168.0.135:8282",
  print: "http://192.168.0.135:3002",
} as const;

export default defineConfig(({ mode }) => {
  // loadEnv 读取 .env、.env.local、.env.[mode] 等文件；再叠加 process.env，
  // 让 shell 注入或测试里 process.env 都能覆盖文件中的值。
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const env = { ...fileEnv, ...process.env };
  const devProxyEnabled = env.DEV_API_PROXY_ENABLED !== "false";
  const devProxyTargets = {
    app: env.DEV_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.app,
    wms: env.DEV_WMS_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.wms,
    mes: env.DEV_MES_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.mes,
    print: env.DEV_PRINT_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.print,
  };

  return {
    plugins: [react(), tailwindcss()],
    server: devProxyEnabled
      ? {
          proxy: {
            "/api/app": { target: devProxyTargets.app, changeOrigin: true },
            "/api/wms": { target: devProxyTargets.wms, changeOrigin: true },
            "/api/mes": { target: devProxyTargets.mes, changeOrigin: true },
            "/api/print": { target: devProxyTargets.print, changeOrigin: true },
          },
        }
      : undefined,
    build: {
      outDir: "dist/ruihui-next",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "vendor-react";
            }

            if (id.includes("/@tanstack/")) {
              return "vendor-tanstack";
            }

            if (id.includes("/radix-ui/") || id.includes("/@radix-ui/")) {
              return "vendor-radix";
            }

            if (id.includes("/lucide-react/")) {
              return "vendor-icons";
            }

            return undefined;
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    }
  };
});
