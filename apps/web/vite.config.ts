import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import { fileURLToPath, URL } from "node:url";
import {
  createDebuggableApiProxy,
  debugIpRewriteProxyPlugin,
} from "./vite/debug-ip-rewrite-proxy-plugin";

const DEFAULT_DEV_PROXY_TARGETS = {
  app: "http://192.168.0.135:8288",
  wms: "http://192.168.0.135:8283",
  mes: "http://192.168.0.135:8282",
  print: "http://192.168.0.135:3002",
} as const;

function createApiProxy(prefix: string, target: string): ProxyOptions {
  return createDebuggableApiProxy({ prefix, target });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devProxyTargets = {
    app: env.DEV_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.app,
    wms: env.DEV_WMS_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.wms,
    mes: env.DEV_MES_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.mes,
    print: env.DEV_PRINT_API_PROXY_TARGET ?? DEFAULT_DEV_PROXY_TARGETS.print,
  };

  return {
  plugins: [react(), tailwindcss(), debugIpRewriteProxyPlugin()],
  server: {
    proxy: {
      "/api/app": createApiProxy("/api/app", devProxyTargets.app),
      "/api/wms": createApiProxy("/api/wms", devProxyTargets.wms),
      "/api/mes": createApiProxy("/api/mes", devProxyTargets.mes),
      "/api/print": createApiProxy("/api/print", devProxyTargets.print),
    },
  },
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
