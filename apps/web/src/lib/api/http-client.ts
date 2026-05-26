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
  CompanyCode?: string;
  FactoryCode?: string;
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

type FetchTransportOptions = {
  baseUrl?: string;
  getToken?: () => string | null | undefined;
  fetcher?: typeof fetch;
};

function joinBaseUrlAndPath(baseUrl: string | undefined, path: string) {
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function parseFetchResponse(response: Response) {
  const contentType = response.headers.get("Content-Type");

  if (contentType?.includes("application/json")) {
    return await response.json();
  }

  return await response.text();
}

export function createFetchTransport({
  baseUrl,
  getToken,
  fetcher = fetch,
}: FetchTransportOptions = {}): Transport {
  return async ({ method, path, body, signal }) => {
    const token = getToken?.();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetcher(joinBaseUrlAndPath(baseUrl, path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

    return {
      status: response.status,
      data: await parseFetchResponse(response),
    };
  };
}

export function createHttpClient({ transport }: HttpClientOptions) {
  async function request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: HttpRequestOptions = {},
  ) {
    try {
      const response = await transport({
        method,
        path,
        body,
        signal: options.signal,
      });

      if (response.status >= 400) {
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
