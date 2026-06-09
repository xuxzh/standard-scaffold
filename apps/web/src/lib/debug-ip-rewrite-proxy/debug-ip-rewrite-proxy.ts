export type DebugIpRewriteProxyMode = "all" | "ports" | "regex";

export type DebugIpRewriteProxyBaseUrls = {
  app: string;
  wms: string;
  mes: string;
  print: string;
};

export type DebugIpRewriteProxyConfig = {
  enabled: boolean;
  targetHost: string;
  mode: DebugIpRewriteProxyMode;
  ports: number[];
  pattern: string;
  /**
   * Per-API absolute base URLs the SPA should use to reach each backend.
   * Empty string means "use the env-derived default" (see
   * `getDefaultDebugIpRewriteProxyBaseUrls`). The IP rewrite wrapper in
   * `createFetchTransport` reads this field on every request.
   */
  baseUrls: DebugIpRewriteProxyBaseUrls;
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

const DEBUG_IP_REWRITE_PROXY_BASE_URL_ENV_KEYS = {
  app: "VITE_API_BASE_URL",
  wms: "VITE_WMS_API_BASE_URL",
  mes: "VITE_MES_API_BASE_URL",
  print: "VITE_PRINT_API_BASE_URL",
} as const;

export function getDefaultDebugIpRewriteProxyBaseUrls(): DebugIpRewriteProxyBaseUrls {
  return {
    app: (import.meta.env[DEBUG_IP_REWRITE_PROXY_BASE_URL_ENV_KEYS.app] as
      | string
      | undefined) ?? "",
    wms: (import.meta.env[DEBUG_IP_REWRITE_PROXY_BASE_URL_ENV_KEYS.wms] as
      | string
      | undefined) ?? "",
    mes: (import.meta.env[DEBUG_IP_REWRITE_PROXY_BASE_URL_ENV_KEYS.mes] as
      | string
      | undefined) ?? "",
    print: (import.meta.env[DEBUG_IP_REWRITE_PROXY_BASE_URL_ENV_KEYS.print] as
      | string
      | undefined) ?? "",
  };
}

export const defaultDebugIpRewriteProxyConfig: DebugIpRewriteProxyConfig = {
  enabled: false,
  targetHost: "127.0.0.1",
  mode: "ports",
  ports: [],
  pattern: "",
  baseUrls: getDefaultDebugIpRewriteProxyBaseUrls(),
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
  const defaults = defaultDebugIpRewriteProxyConfig;
  const config: DebugIpRewriteProxyConfig = {
    enabled:
      typeof input.enabled === "boolean" ? input.enabled : defaults.enabled,
    targetHost:
      typeof input.targetHost === "string"
        ? input.targetHost.trim()
        : defaults.targetHost,
    mode: isDebugIpRewriteProxyMode(input.mode) ? input.mode : defaults.mode,
    ports: Array.isArray(input.ports)
      ? input.ports.map((port) => Number(port))
      : [...defaults.ports],
    pattern:
      typeof input.pattern === "string" ? input.pattern : defaults.pattern,
    baseUrls: normalizeBaseUrls(input.baseUrls),
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

function normalizeBaseUrls(
  input: Partial<DebugIpRewriteProxyBaseUrls> | undefined,
): DebugIpRewriteProxyBaseUrls {
  const defaults = getDefaultDebugIpRewriteProxyBaseUrls();
  if (!input || typeof input !== "object") {
    return { ...defaults };
  }

  return {
    app:
      typeof input.app === "string" ? input.app.trim() : defaults.app,
    wms:
      typeof input.wms === "string" ? input.wms.trim() : defaults.wms,
    mes:
      typeof input.mes === "string" ? input.mes.trim() : defaults.mes,
    print:
      typeof input.print === "string"
        ? input.print.trim()
        : defaults.print,
  };
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
