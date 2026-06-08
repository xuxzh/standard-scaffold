export const DEBUG_IP_REWRITE_PROXY_CONFIG_PATH =
  "/__debug/ip-rewrite-proxy/config";

export type DebugIpRewriteProxyMode = "all" | "ports" | "regex";

export type DebugIpRewriteProxyConfig = {
  enabled: boolean;
  targetHost: string;
  mode: DebugIpRewriteProxyMode;
  ports: number[];
  pattern: string;
};

export type DebugIpRewriteProxyPreview =
  | {
      ok: true;
      matched: boolean;
      originalUrl: string;
      rewrittenUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

export const defaultDebugIpRewriteProxyConfig: DebugIpRewriteProxyConfig = {
  enabled: false,
  targetHost: "127.0.0.1",
  mode: "ports",
  ports: [],
  pattern: "",
};

function isDebugIpRewriteProxyMode(
  value: unknown,
): value is DebugIpRewriteProxyMode {
  return value === "all" || value === "ports" || value === "regex";
}

function assertValidTargetHost(targetHost: string) {
  if (!targetHost.trim()) {
    throw new Error("替换目标 IP/Host 不能为空");
  }

  if (/[:/?#]/.test(targetHost) || targetHost.includes("://")) {
    throw new Error(
      "替换目标 IP/Host 不允许包含协议、端口、路径、query 或 hash",
    );
  }
}

function assertValidPort(port: number) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("端口必须是 1-65535 的整数");
  }
}

function getUrlPort(url: URL) {
  if (url.port) {
    return Number(url.port);
  }

  if (url.protocol === "http:") {
    return 80;
  }

  if (url.protocol === "https:") {
    return 443;
  }

  return Number.NaN;
}

function rewriteUrlHost(originalUrl: string, targetHost: string) {
  const url = new URL(originalUrl);
  url.hostname = targetHost;
  return url.toString();
}

export function parseDebugIpRewriteProxyPorts(value: string) {
  const ports = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item));

  ports.forEach(assertValidPort);

  return ports;
}

export function formatDebugIpRewriteProxyPorts(ports: number[]) {
  return ports.join(",");
}

export function normalizeDebugIpRewriteProxyConfig(
  input: Partial<DebugIpRewriteProxyConfig>,
): DebugIpRewriteProxyConfig {
  const config: DebugIpRewriteProxyConfig = {
    enabled:
      typeof input.enabled === "boolean"
        ? input.enabled
        : defaultDebugIpRewriteProxyConfig.enabled,
    targetHost:
      typeof input.targetHost === "string"
        ? input.targetHost.trim()
        : defaultDebugIpRewriteProxyConfig.targetHost,
    mode: isDebugIpRewriteProxyMode(input.mode)
      ? input.mode
      : defaultDebugIpRewriteProxyConfig.mode,
    ports: Array.isArray(input.ports)
      ? input.ports.map((port) => Number(port))
      : [...defaultDebugIpRewriteProxyConfig.ports],
    pattern:
      typeof input.pattern === "string"
        ? input.pattern
        : defaultDebugIpRewriteProxyConfig.pattern,
  };

  assertValidTargetHost(config.targetHost);
  config.ports.forEach(assertValidPort);

  if (config.mode === "regex") {
    if (!config.pattern.trim()) {
      throw new Error("正则表达式不能为空");
    }

    try {
      new RegExp(config.pattern);
    } catch {
      throw new Error("正则表达式无效");
    }
  }

  return config;
}

export function shouldRewriteDebugIpUrl(
  config: DebugIpRewriteProxyConfig,
  originalUrl: string,
) {
  if (!config.enabled) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(originalUrl);
  } catch {
    return false;
  }

  if (config.mode === "all") {
    return true;
  }

  if (config.mode === "ports") {
    return config.ports.includes(getUrlPort(url));
  }

  try {
    return new RegExp(config.pattern).test(originalUrl);
  } catch {
    return false;
  }
}

export function getDebugIpRewriteProxyPreview(
  config: DebugIpRewriteProxyConfig,
  originalUrl: string,
): DebugIpRewriteProxyPreview {
  try {
    new URL(originalUrl);
  } catch {
    return {
      ok: false,
      error: "请输入完整 URL，例如 http://192.168.1.20:8288/api/users",
    };
  }

  const matched = shouldRewriteDebugIpUrl(config, originalUrl);

  return {
    ok: true,
    matched,
    originalUrl,
    rewrittenUrl: matched ? rewriteUrlHost(originalUrl, config.targetHost) : originalUrl,
  };
}
