import { afterEach, describe, expect, it, vi } from "vitest";

import { subscribeAiRun } from "./ai-run-stream";

afterEach(() => vi.unstubAllGlobals());

describe("subscribeAiRun", () => {
  it("parses CRLF, cross-chunk data, multiple events, and keepalive comments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        streamResponse([
          ": keepalive\r\nevent: message.delta\r\ndata: {\"type\":\"message.",
          "delta\",\"runId\":\"run-1\",\"messageId\":\"message-1\",\"delta\":\"a\"}\r\n\r\n",
          "event: run.completed\ndata: {\"type\":\"run.completed\",\"runId\":\"run-1\",\"message\":{\"id\":\"message-1\"}}\n\n",
        ]),
      ),
    );
    const onEvent = vi.fn();

    await subscribeAiRun("run-1", {
      signal: new AbortController().signal,
      onEvent,
    });

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "message.delta", delta: "a" }),
    );
    expect(onEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "run.completed" }),
    );
  });

  it("ignores unknown event names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        streamResponse(["event: reasoning.delta\ndata: not-json\n\n"]),
      ),
    );
    const onEvent = vi.fn();

    await subscribeAiRun("run-1", {
      signal: new AbortController().signal,
      onEvent,
    });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it.each([
    "event: message.delta\ndata: not-json\n\n",
    'event: message.delta\ndata: {"type":"message.delta","runId":"run-1"}\n\n',
  ])("rejects malformed public events", async (frame) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => streamResponse([frame])));

    await expect(
      subscribeAiRun("run-1", {
        signal: new AbortController().signal,
        onEvent: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "AI_STREAM_PROTOCOL_ERROR" });
  });

  it("parses the final event at EOF without a trailing blank line", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        streamResponse([
          'event: run.failed\ndata: {"type":"run.failed","runId":"run-1","errorCode":"AI_RUN_FAILED","message":"failed"}',
        ]),
      ),
    );
    const onEvent = vi.fn();

    await subscribeAiRun("run-1", {
      signal: new AbortController().signal,
      onEvent,
    });

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "run.failed" }));
  });

  it("forwards abort to fetch", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.signal).toBe(controller.signal);
      throw new DOMException("aborted", "AbortError");
    });
    vi.stubGlobal("fetch", fetchMock);
    controller.abort();

    await expect(
      subscribeAiRun("run-1", { signal: controller.signal, onEvent: vi.fn() }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}
