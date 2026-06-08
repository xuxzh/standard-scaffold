import {
  DEBUG_IP_REWRITE_PROXY_CONFIG_PATH,
  normalizeDebugIpRewriteProxyConfig,
  type DebugIpRewriteProxyConfig,
} from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";

type ServerErrorBody = { message?: unknown };

async function parseJsonResponse(response: Response) {
  const data = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const message = (data as ServerErrorBody)?.message;
    throw new Error(
      typeof message === "string" ? message : "调试代理配置请求失败",
    );
  }

  return data;
}

export async function getDebugIpRewriteProxyConfig() {
  const response = await fetch(DEBUG_IP_REWRITE_PROXY_CONFIG_PATH);
  const data = await parseJsonResponse(response);

  return normalizeDebugIpRewriteProxyConfig(
    data as Partial<DebugIpRewriteProxyConfig>,
  );
}

export async function saveDebugIpRewriteProxyConfig(
  config: DebugIpRewriteProxyConfig,
) {
  const normalizedConfig = normalizeDebugIpRewriteProxyConfig(config);
  const response = await fetch(DEBUG_IP_REWRITE_PROXY_CONFIG_PATH, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedConfig),
  });
  const data = await parseJsonResponse(response);

  return normalizeDebugIpRewriteProxyConfig(
    data as Partial<DebugIpRewriteProxyConfig>,
  );
}
