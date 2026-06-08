import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ProxyOptions } from "vite";
import {
  DEBUG_IP_REWRITE_PROXY_CONFIG_PATH,
  defaultDebugIpRewriteProxyConfig,
  getDebugIpRewriteProxyPreview,
  normalizeDebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyConfig,
} from "../src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";

type ApiProxyOptions = {
  target: string;
  prefix: string;
};

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function readJsonBody(request: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let rawBody = "";

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      rawBody += chunk;
    });
    request.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        reject(new Error("请求体必须是合法 JSON"));
      }
    });
    request.on("error", reject);
  });
}

function createOriginalUrl(target: string, rewrittenPath: string) {
  const base = `${target.replace(/\/$/, "")}/`;
  const safePath = rewrittenPath.startsWith("/")
    ? rewrittenPath.slice(1)
    : rewrittenPath;
  return new URL(safePath, base).toString();
}

export function createDebugIpRewriteProxyState(
  initialConfig: DebugIpRewriteProxyConfig = defaultDebugIpRewriteProxyConfig,
) {
  let config = initialConfig;

  return {
    getConfig() {
      return config;
    },
    setConfig(nextConfig: DebugIpRewriteProxyConfig) {
      config = nextConfig;
    },
  };
}

export const debugIpRewriteProxyState = createDebugIpRewriteProxyState();

export function createDebuggableApiProxy({
  target,
  prefix,
}: ApiProxyOptions): ProxyOptions {
  const prefixPattern = new RegExp(`^${prefix}`);

  return {
    target,
    changeOrigin: true,
    router: (request: IncomingMessage) => {
      const originalRequestPath = request.url ?? "";
      const rewrittenPath = originalRequestPath.replace(prefixPattern, "");
      const originalUrl = createOriginalUrl(target, rewrittenPath);
      const preview = getDebugIpRewriteProxyPreview(
        debugIpRewriteProxyState.getConfig(),
        originalUrl,
      );

      if (!preview.ok || !preview.matched) {
        return target;
      }

      return new URL(preview.rewrittenUrl).origin;
    },
    rewrite: (path) => path.replace(prefixPattern, ""),
  };
}

export function debugIpRewriteProxyPlugin(): Plugin {
  return {
    name: "debug-ip-rewrite-proxy",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== DEBUG_IP_REWRITE_PROXY_CONFIG_PATH) {
          next();
          return;
        }

        if (request.method === "GET") {
          sendJson(response, 200, debugIpRewriteProxyState.getConfig());
          return;
        }

        if (request.method === "PUT") {
          try {
            const body = await readJsonBody(request);
            const nextConfig = normalizeDebugIpRewriteProxyConfig(
              (body ?? {}) as Partial<DebugIpRewriteProxyConfig>,
            );
            debugIpRewriteProxyState.setConfig(nextConfig);
            sendJson(response, 200, nextConfig);
          } catch (error) {
            sendJson(response, 400, {
              message:
                error instanceof Error ? error.message : "调试代理配置无效",
            });
          }
          return;
        }

        sendJson(response, 405, {
          message: "Method Not Allowed",
        });
      });
    },
  };
}
