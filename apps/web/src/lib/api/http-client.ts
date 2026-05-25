export type HttpMethod = "GET";

export type TransportRequest = {
  method: HttpMethod;
  path: string;
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

type HttpClientErrorCode = "HTTP_ERROR" | "NETWORK_ERROR";

type HttpClientErrorOptions = {
  message: string;
  code: HttpClientErrorCode;
  status?: number;
};

export class HttpClientError extends Error {
  code: HttpClientErrorCode;
  status?: number;

  constructor({ message, code, status }: HttpClientErrorOptions) {
    super(message);
    this.name = "HttpClientError";
    this.code = code;
    this.status = status;
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

  return "Request failed";
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

export function createHttpClient({ transport }: HttpClientOptions) {
  return {
    async get<T>(path: string, options: HttpRequestOptions = {}) {
      try {
        const response = await transport({
          method: "GET",
          path,
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
    },
  };
}
