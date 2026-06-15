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

  // Wujie sub-app dev origin: the MES host loads our bundle from a different
  // origin via iframe, so we must bind to 0.0.0.0, enable CORS, and tell Vite
  // what absolute URL to emit for assets / HMR. Defaults match the production
  // sub-app server (192.168.0.135:6024 family); override per-dev via env.
  const devHost = env.VITE_DEV_HOST ?? "192.168.0.135";
  const devPort = Number(env.VITE_DEV_PORT ?? 5173);
  const devOrigin = env.VITE_DEV_ORIGIN ?? `http://${devHost}:${devPort}`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // 0.0.0.0 so the MES host (potentially on another machine) can reach us.
      host: true,
      port: devPort,
      strictPort: true,
      // Wujie fetches the sub-app HTML/JS via cross-origin requests; CORS must
      // be permissive for both the dev HTML and any script/style assets.
      cors: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
      },
      // Force absolute asset URLs so the iframe-loaded HTML resolves them
      // against our origin rather than the host's.
      origin: devOrigin,
      // HMR runs from inside the wujie iframe; route the WS connection back
      // to this dev server's reachable address so reloads survive the sandbox.
      hmr: {
        host: devHost,
        clientPort: devPort,
      },
      proxy: devProxyEnabled
        ? {
            "/api/app": {
              target: devProxyTargets.app,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/app/, ""),
            },
            "/api/wms": {
              target: devProxyTargets.wms,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/wms/, ""),
            },
            "/api/mes": {
              target: devProxyTargets.mes,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/mes/, ""),
            },
            "/api/print": {
              target: devProxyTargets.print,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/print/, ""),
            },
          }
        : undefined,
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
