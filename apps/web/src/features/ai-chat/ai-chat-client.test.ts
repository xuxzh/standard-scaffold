import { afterEach, describe, expect, it, vi } from "vitest";

import { clearTenantContext } from "@/lib/auth/tenant-context-store";
import { clearAccessTokenForTests, setAccessTokenForTests } from "@/lib/auth/token-store";
import { clearUserDisplay, setUserDisplay } from "@/lib/auth/user-display-store";
import { getFetchRequest } from "@/test/fetch-request";

import {
  AiChatClientError,
  getAiChatClient,
  resetAiChatTransportForTests,
} from "./ai-chat-client";

afterEach(() => {
  clearAccessTokenForTests();
  clearTenantContext();
  clearUserDisplay();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetAiChatTransportForTests();
});

describe("getAiChatClient", () => {
  it("uses the root-relative AI API and adds auth, tenant, and user headers", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://remote.example.test");
    setAccessTokenForTests(jwt({ CompanyCode: "COMPANY-A", FactoryCode: "FACTORY-A", UserId: 42 }));
    setUserDisplay({ userCode: "alice", displayName: "Alice" });
    const fetchMock = vi.fn<typeof fetch>(async () => wrapped({ id: "conversation-1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await getAiChatClient().post("/conversations", undefined);

    const request = getFetchRequest(fetchMock);
    expect(request.url).toBe(`${window.location.origin}/api/ai/conversations`);
    expect(request.headers.get("Authorization")).toMatch(/^Bearer /);
    expect(request.headers.get("x-company-code")).toBe("COMPANY-A");
    expect(request.headers.get("x-factory-code")).toBe("FACTORY-A");
    expect(request.headers.get("x-user-name")).toBe("alice");
    expect(request.headers.get("x-user-id")).toBe("42");
  });

  it("omits x-user-id when the JWT claim is not explicitly numeric", async () => {
    setAccessTokenForTests(jwt({ CompanyCode: "C", FactoryCode: "F", UserId: "42" }));
    const fetchMock = vi.fn<typeof fetch>(async () => wrapped([]));
    vi.stubGlobal("fetch", fetchMock);

    await getAiChatClient().get("/conversations");

    expect(getFetchRequest(fetchMock).headers.has("x-user-id")).toBe(false);
  });

  it("accepts 202, unwraps the common response, and forwards AbortSignal", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>(async () => wrapped({ run: { id: "run-1" } }, 202));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getAiChatClient().post(
        "/conversations/conversation-1/messages",
        { content: "Question" },
        controller.signal,
      ),
    ).resolves.toEqual({ run: { id: "run-1" } });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it("propagates the API error status and error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        new Response(
          JSON.stringify({
            success: false,
            statusCode: 409,
            message: "Conversation is busy",
            data: null,
            errorCode: "AI_CONVERSATION_BUSY",
            timestamp: new Date().toISOString(),
          }),
          { status: 409, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(getAiChatClient().post("/conversations/1/messages", {})).rejects.toEqual(
      expect.objectContaining<Partial<AiChatClientError>>({
        name: "AiChatClientError",
        status: 409,
        errorCode: "AI_CONVERSATION_BUSY",
      }),
    );
  });
});

function wrapped(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      statusCode: status,
      message: "OK",
      data,
      timestamp: new Date().toISOString(),
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function jwt(payload: Record<string, unknown>) {
  const encoded = btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `header.${encoded}.signature`;
}
