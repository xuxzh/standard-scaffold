import axios from "axios";
import { redirectToLogin } from "@/lib/auth/auth-redirect";
import { clearAuthToken } from "@/lib/auth/token-store";
import { loadDebugIpRewriteProxyConfigFromStorage } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";
import { getDebugIpRewriteProxyPreview } from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy";

export type HttpMethod = "GET" | "POST";

export type TransportRequest = {
  method: HttpMethod;
  path: string;
  body?: unknown;
  signal?: AbortSignal;
};

export type TransportResponse<T = unknown> = {
  status: number;
  data: T;
};

export type Transport = (
  request: TransportRequest,
) => Promise<TransportResponse>;

type HttpClientOptions = {
  transport: Transport;
  handleUnauthorized?: () => Promise<boolean>;
  /**
   * Optional hook invoked once per request, before the body is handed to
   * the transport. Lets a client opt in to cross-cutting payload
   * enrichment (e.g. injecting tenant scope into POST bodies) without
   * the call sites having to know about it. The hook may return the body
   * unchanged to opt out of a specific call.
   */
  enrichBody?: (body: unknown) => unknown;
};

type HttpRequestOptions = {
  signal?: AbortSignal;
};

export type DataResult<T> = {
  Success: boolean;
  Code: string | null;
  Message: string;
  Attach: T;
  SkipCount: number;
  TotalCount: number;
  Record: number;
};

export type ApiQueryParams = {
  IsPaged?: boolean;
  PageSize?: number;
  PageIndex?: number;
};

type HttpClientErrorCode = "HTTP_ERROR" | "NETWORK_ERROR" | "BUSINESS_ERROR";

type HttpClientErrorOptions = {
  message: string;
  code: HttpClientErrorCode;
  status?: number;
  apiCode?: string | null;
  result?: DataResult<unknown>;
};

export class HttpClientError extends Error {
  code: HttpClientErrorCode;
  status?: number;
  apiCode?: string | null;
  result?: DataResult<unknown>;

  constructor({ message, code, status, apiCode, result }: HttpClientErrorOptions) {
    super(message);
    this.name = "HttpClientError";
    this.code = code;
    this.status = status;
    this.apiCode = apiCode;
    this.result = result;
  }
}

function getErrorMessage(data: unknown) {
  if (
    typeof data === "object" &&
    data &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  if (
    typeof data === "object" &&
    data &&
    "Message" in data &&
    typeof data.Message === "string"
  ) {
    return data.Message;
  }

  return "Request failed";
}

function isDataResult(data: unknown): data is DataResult<unknown> {
  return (
    typeof data === "object" &&
    data !== null &&
    "Success" in data &&
    typeof data.Success === "boolean" &&
    "Message" in data &&
    typeof data.Message === "string" &&
    "Attach" in data
  );
}

function assertSuccessfulDataResult<T>(data: unknown): DataResult<T> {
  if (!isDataResult(data)) {
    throw new HttpClientError({
      message: "Unexpected response format",
      code: "BUSINESS_ERROR",
    });
  }

  const result = data as DataResult<T>;

  if (!result.Success && result.Code !== "100001") {
    throw new HttpClientError({
      message: result.Message,
      code: "BUSINESS_ERROR",
      apiCode: result.Code,
      result: result as DataResult<unknown>,
    });
  }

  return result;
}

function normalizeHttpClientError(error: unknown) {
  if (error instanceof HttpClientError) {
    return error;
  }

  if (error instanceof Error) {
    return new HttpClientError({
      message: error.message,
      code: "NETWORK_ERROR",
    });
  }

  return new HttpClientError({
    message: "Request failed",
    code: "NETWORK_ERROR",
  });
}

function shouldHandleUnauthorized(path: string) {
  return path !== "/account/login" && path !== "/account/refresh";
}

type MockTransportHandlers = Record<
  `${HttpMethod} ${string}`,
  (request: TransportRequest) => Promise<TransportResponse> | TransportResponse
>;

export function createMockTransport(
  handlers: MockTransportHandlers,
): Transport {
  return async (request: TransportRequest) => {
    const handler = handlers[`${request.method} ${request.path}`];

    if (!handler) {
      return {
        status: 404,
        data: {
          message: `No mock handler registered for ${request.method} ${request.path}`,
        },
      };
    }

    return await handler(request);
  };
}

type AxiosTransportOptions = {
  /**
   * Absolute or root-relative base URL prepended to each request path.
   * Accepts a getter so runtime debug configuration is resolved per request.
   */
  baseUrl?: string | (() => string | undefined);
  getToken?: () => string | null | undefined;
};

function joinBaseUrlAndPath(baseUrl: string | undefined, path: string) {
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function resolveBaseUrl(
  baseUrl: string | (() => string | undefined) | undefined,
): string | undefined {
  return typeof baseUrl === "function" ? baseUrl() : baseUrl;
}

function resolveTransportUrl(
  baseUrl: string | (() => string | undefined) | undefined,
  path: string,
) {
  const requestUrl = joinBaseUrlAndPath(resolveBaseUrl(baseUrl), path);

  if (import.meta.env.DEV) {
    return requestUrl;
  }

  const config = loadDebugIpRewriteProxyConfigFromStorage();
  const preview = getDebugIpRewriteProxyPreview(config, requestUrl);

  return preview.ok ? preview.rewrittenUrl : requestUrl;
}

function resolveAxiosUrl(
  baseUrl: string | (() => string | undefined) | undefined,
  path: string,
) {
  const requestUrl = resolveTransportUrl(baseUrl, path);

  if (requestUrl.startsWith("/") && typeof window !== "undefined") {
    return new URL(requestUrl, window.location.origin).toString();
  }

  return requestUrl;
}

export function createAxiosTransport({
  baseUrl,
  getToken,
}: AxiosTransportOptions = {}): Transport {
  const client = axios.create({
    adapter: "fetch",
    transformResponse: [
      (data, headers) => {
        const contentType = String(headers.get("Content-Type") ?? "");

        if (
          typeof data === "string" &&
          contentType.includes("application/json")
        ) {
          return JSON.parse(data) as unknown;
        }

        return data;
      },
    ],
    validateStatus: () => true,
    withXSRFToken: false,
  });

  client.interceptors.request.use((config) => {
    config.url = resolveAxiosUrl(baseUrl, config.url ?? "");
    config.baseURL = undefined;
    config.headers.set("Accept", "application/json");
    config.headers.set("Content-Type", "application/json");

    const token = getToken?.();

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  });

  return async ({ method, path, body, signal }) => {
    const response = await client.request({
      method,
      url: path,
      data: body,
      signal,
    });

    return {
      status: response.status,
      data: response.data,
    };
  };
}

export function createHttpClient({
  transport,
  handleUnauthorized,
  enrichBody,
}: HttpClientOptions) {
  async function request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: HttpRequestOptions = {},
    hasRetriedUnauthorized = false,
  ) {
    try {
      const finalBody = enrichBody ? enrichBody(body) : body;
      const response = await transport({
        method,
        path,
        body: finalBody,
        signal: options.signal,
      });

      if (
        response.status === 401 &&
        handleUnauthorized &&
        shouldHandleUnauthorized(path) &&
        !hasRetriedUnauthorized
      ) {
        const canRetry = await handleUnauthorized();

        if (canRetry) {
          return await request<T>(method, path, body, options, true);
        }
      }

      if (response.status >= 400) {
        if (hasRetriedUnauthorized && shouldHandleUnauthorized(path)) {
          clearAuthToken();
          redirectToLogin();
        }

        throw new HttpClientError({
          message: getErrorMessage(response.data),
          code: "HTTP_ERROR",
          status: response.status,
        });
      }

      return response.data as T;
    } catch (error) {
      throw normalizeHttpClientError(error);
    }
  }

  return {
    async get<T>(path: string, options: HttpRequestOptions = {}) {
      return await request<T>("GET", path, undefined, options);
    },

    async post<T>(
      path: string,
      body?: unknown,
      options: HttpRequestOptions = {},
    ) {
      return await request<T>("POST", path, body, options);
    },

    async postDataResult<T>(
      path: string,
      body?: unknown,
      options: HttpRequestOptions = {},
    ) {
      const data = await request<unknown>("POST", path, body, options);

      return assertSuccessfulDataResult<T>(data);
    },
  };
}
