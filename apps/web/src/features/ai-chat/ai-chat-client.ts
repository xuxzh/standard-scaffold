import { decodeJwtPayload } from "@/lib/auth/jwt-decode";
import { getActiveTenantContext } from "@/lib/auth/tenant-context-store";
import { getAccessToken } from "@/lib/auth/token-store";
import { getUserDisplay } from "@/lib/auth/user-display-store";

export const AI_CHAT_API_ROOT = "/api/ai";

export type AiChatTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type XzResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errorCode?: string;
};

export class AiChatClientError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(message: string, status: number, errorCode: string) {
    super(message);
    this.name = "AiChatClientError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

let transport: AiChatTransport | undefined;

export function createAiChatHeaders(): Headers {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const tenant = getActiveTenantContext();
  if (tenant) {
    headers.set("x-company-code", tenant.companyCode);
    headers.set("x-factory-code", tenant.factoryCode);
  }
  const userName = getUserDisplay()?.userCode.trim();
  if (userName) {
    headers.set("x-user-name", userName);
  }
  const userId = token
    ? decodeJwtPayload<Record<string, unknown>>(token)?.UserId
    : undefined;
  if (typeof userId === "number" && Number.isInteger(userId)) {
    headers.set("x-user-id", String(userId));
  }
  return headers;
}

export function getAiChatTransport(): AiChatTransport {
  return transport ?? ((input, init) => fetch(input, init));
}

export function setAiChatTransportForTests(nextTransport: AiChatTransport) {
  transport = nextTransport;
}

export function resetAiChatTransportForTests() {
  transport = undefined;
}

export function getAiChatClient() {
  return {
    get<T>(path: string, signal?: AbortSignal) {
      return request<T>(path, { method: "GET", signal });
    },
    post<T>(path: string, body?: unknown, signal?: AbortSignal) {
      return request<T>(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    },
    delete<T>(path: string, signal?: AbortSignal) {
      return request<T>(path, { method: "DELETE", signal });
    },
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await getAiChatTransport()(`${AI_CHAT_API_ROOT}${path}`, {
    ...init,
    headers: createAiChatHeaders(),
  });
  const payload = await parseResponse<T>(response);
  if (!response.ok || !payload.success) {
    throw new AiChatClientError(
      payload.message || "AI chat request failed",
      response.status,
      payload.errorCode ?? `HTTP_${response.status}`,
    );
  }
  return payload.data;
}

async function parseResponse<T>(response: Response): Promise<XzResponse<T>> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "success" in payload &&
      typeof payload.success === "boolean" &&
      "message" in payload &&
      typeof payload.message === "string" &&
      "data" in payload
    ) {
      return payload as XzResponse<T>;
    }
  } catch {
    // Normalize non-JSON responses below without exposing their body.
  }
  throw new AiChatClientError(
    "Invalid AI chat response",
    response.status,
    "AI_RESPONSE_PROTOCOL_ERROR",
  );
}
