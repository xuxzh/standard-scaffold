import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetAiChatTransportForTests,
  setAiChatTransportForTests,
  type AiChatTransport,
} from "./ai-chat-client";
import {
  createAiConversation,
  listAiConversations,
  listAiMessages,
  startAiRun,
  stopAiRun,
} from "./ai-chat-service";

afterEach(() => resetAiChatTransportForTests());

describe("ai-chat-service", () => {
  it.each([
    ["list", () => listAiConversations(), "GET", "/api/ai/conversations", undefined],
    ["create", () => createAiConversation(), "POST", "/api/ai/conversations", undefined],
    ["messages", () => listAiMessages("conversation 1"), "GET", "/api/ai/conversations/conversation%201/messages", undefined],
    ["start", () => startAiRun("conversation 1", "Question"), "POST", "/api/ai/conversations/conversation%201/messages", { content: "Question" }],
    ["stop", () => stopAiRun("run 1"), "POST", "/api/ai/runs/run%201/stop", undefined],
  ])("maps the %s operation", async (_name, operation, method, path, body) => {
    const transport = vi.fn<AiChatTransport>(async () => wrappedResponse({ ok: true }));
    setAiChatTransportForTests(transport);

    await operation();

    expect(transport).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  });

  it("forwards AbortSignal", async () => {
    const controller = new AbortController();
    const transport = vi.fn<AiChatTransport>(async () => wrappedResponse([]));
    setAiChatTransportForTests(transport);

    await listAiConversations(controller.signal);

    expect(transport).toHaveBeenCalledWith(
      "/api/ai/conversations",
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

function wrappedResponse(data: unknown) {
  return Promise.resolve(
    new Response(
      JSON.stringify({ success: true, statusCode: 200, message: "OK", data }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
}
