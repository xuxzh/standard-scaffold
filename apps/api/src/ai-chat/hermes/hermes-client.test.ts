import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import {
  HttpHermesClient,
  loadHermesClientConfig,
  type HermesStreamEvent,
} from "./hermes-client.js";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

describe("loadHermesClientConfig", () => {
  it("loads only the configured URL, key, and timeout", () => {
    expect(
      loadHermesClientConfig({
        HERMES_API_BASE_URL: "http://127.0.0.1:8650",
        HERMES_API_KEY: "test-key",
        HERMES_REQUEST_TIMEOUT_MS: "1800000",
        HERMES_SYSTEM_PROMPT: "ignored",
      }),
    ).toEqual({
      baseUrl: "http://127.0.0.1:8650",
      apiKey: "test-key",
      requestTimeoutMs: 1_800_000,
    });
  });
});

describe("HttpHermesClient", () => {
  it("sends the Bearer key to the health endpoint", async () => {
    let requestHeaders: IncomingMessage["headers"] = {};
    const baseUrl = await startServer((request, response) => {
      requestHeaders = request.headers;
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"status":"ok"}');
    });
    const client = createClient(baseUrl);

    await client.health();

    expect(requestHeaders.authorization).toBe("Bearer test-key");
  });

  it("creates a Hermes session without leaking the system prompt into the URL", async () => {
    let path = "";
    let body = "";
    const baseUrl = await startServer(async (request, response) => {
      path = request.url ?? "";
      body = await readBody(request);
      response.writeHead(201).end();
    });
    const client = createClient(baseUrl);

    await client.createSession({
      id: "session-1",
      title: "Daily output",
      systemPrompt: "tenant-scoped-secret-prompt",
    });

    expect(path).toBe("/api/sessions");
    expect(path).not.toContain("tenant-scoped-secret-prompt");
    expect(JSON.parse(body)).toEqual({
      id: "session-1",
      title: "Daily output",
      system_prompt: "tenant-scoped-secret-prompt",
    });
  });

  it("parses chunked CRLF SSE, keepalive, and only whitelisted events", async () => {
    const baseUrl = await startServer(async (request, response) => {
      expect(request.url).toBe("/api/sessions/session%2F1/chat/stream");
      expect(JSON.parse(await readBody(request))).toEqual({
        message: "Question",
        system_message: "tenant-scoped-system-prompt",
      });
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(": keepalive\r\n\r\n");
      response.write("event: assistant.delta\r\ndata: {\"del");
      response.write("ta\":\"Hello\"}\r\n\r\n");
      response.write(
        "event: internal.reasoning\r\ndata: {\"content\":\"hidden\"}\r\n\r\n",
      );
      response.write(
        "event: tool.started\r\ndata: {\"tool_name\":\"mcp__mes_data__query_mes_data\",\"args\":{\"sql\":\"SELECT 1\"}}\r\n\r\n",
      );
      response.write(
        "data: {\"type\":\"tool.completed\",\"tool_name\":\"mcp__mes_data__query_mes_data\",\"preview\":\"{\\\"rowCount\\\":1}\",\"durationMs\":7}\r\n\r\n",
      );
      response.write(
        "event: assistant.completed\r\ndata: {\"content\":\"Hello\"}\r\n\r\n",
      );
      response.end(
        "event: run.completed\r\ndata: {\"completed\":true,\"messages\":[]}\r\n\r\n",
      );
    });
    const client = createClient(baseUrl);
    const controller = new AbortController();

    const events = await collect(
      client.streamSession({
        sessionId: "session/1",
        message: "Question",
        systemPrompt: "tenant-scoped-system-prompt",
        signal: controller.signal,
      }),
    );

    expect(events).toEqual([
      { type: "assistant.delta", delta: "Hello" },
      {
        type: "tool.started",
        toolName: "mcp__mes_data__query_mes_data",
        args: { sql: "SELECT 1" },
      },
      {
        type: "tool.completed",
        toolName: "mcp__mes_data__query_mes_data",
        preview: '{"rowCount":1}',
        durationMs: 7,
      },
      { type: "assistant.completed", content: "Hello" },
    ]);
  });

  it("whitelists the terminal transcript and prefers top-level content", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(`event: run.completed\n${`data: ${JSON.stringify({
        content: "Final answer",
        messages: [
          {
            role: "assistant",
            content: null,
            reasoning: "must not escape",
            tool_calls: [
              {
                id: "call-query",
                type: "function",
                function: {
                  name: "mcp__mes_data__query_mes_data",
                  arguments: '{"sql":"SELECT 1 AS value"}',
                },
              },
            ],
          },
          {
            role: "tool",
            tool_call_id: "call-query",
            content:
              '{"columns":["value"],"rows":[{"value":1}],"rowCount":1,"truncated":false}',
            credentials: "must not escape",
          },
          { role: "assistant", content: "Fallback answer" },
        ],
        system_prompt: "must not escape",
      })}`}\n\n`);
    });
    const events = await collect(
      createClient(baseUrl).streamSession({
        sessionId: "session-1",
        message: "Question",
        systemPrompt: "tenant-scoped-system-prompt",
        signal: new AbortController().signal,
      }),
    );

    expect(events.at(-1)).toEqual({
      type: "run.completed",
      content: "Final answer",
      messages: [
        {
          role: "assistant",
          content: null,
          toolCalls: [
            {
              id: "call-query",
              name: "mcp__mes_data__query_mes_data",
              arguments: '{"sql":"SELECT 1 AS value"}',
            },
          ],
        },
        {
          role: "tool",
          toolCallId: "call-query",
          content:
            '{"columns":["value"],"rows":[{"value":1}],"rowCount":1,"truncated":false}',
        },
        { role: "assistant", content: "Fallback answer" },
      ],
    });
    expect(JSON.stringify(events)).not.toContain("must not escape");
  });

  it("falls back to the last assistant message and tolerates old events", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(
        `event: run.completed\ndata: ${JSON.stringify({
          messages: [
            { role: "assistant", content: "First answer" },
            { role: "tool", content: "ignored" },
            { role: "assistant", content: "Inferred answer" },
          ],
        })}\n\n`,
      );
      response.end(
        `event: run.completed\ndata: ${JSON.stringify({ content: "Old answer" })}\n\n`,
      );
    });
    const events = await collect(
      createClient(baseUrl).streamSession({
        sessionId: "session-1",
        message: "Question",
        systemPrompt: "tenant-scoped-system-prompt",
        signal: new AbortController().signal,
      }),
    );

    expect(events).toEqual([
      {
        type: "run.completed",
        content: "Inferred answer",
        messages: [
          { role: "assistant", content: "First answer" },
          { role: "tool", content: "ignored" },
          { role: "assistant", content: "Inferred answer" },
        ],
      },
      { type: "run.completed", content: "Old answer", messages: [] },
    ]);
  });

  it("drops malformed transcript entries without exposing their payload", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(
        `event: run.completed\ndata: ${JSON.stringify({
          content: "Safe answer",
          messages: [null, { content: "secret raw payload" }],
        })}\n\n`,
      );
    });
    const events = await collect(
      createClient(baseUrl).streamSession({
        sessionId: "session-1",
        message: "Question",
        systemPrompt: "tenant-scoped-system-prompt",
        signal: new AbortController().signal,
      }),
    );

    expect(events).toEqual([
      { type: "run.completed", content: "Safe answer", messages: [] },
    ]);
    expect(JSON.stringify(events)).not.toContain("secret raw payload");
  });

  it("returns a stable redacted error for non-2xx responses", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(500, { "content-type": "text/plain" });
      response.end("test-key and database-password must never escape");
    });
    const client = createClient(baseUrl);

    const error = await client.health().catch((cause: unknown) => cause);

    expect(error).toMatchObject({ message: "Hermes request failed with status 500" });
    expect(String(error)).not.toContain("test-key");
    expect(String(error)).not.toContain("database-password");
  });

  it("times out a request without exposing the API key", async () => {
    const baseUrl = await startServer(() => undefined);
    const client = createClient(baseUrl, 20);

    const error = await client.health().catch((cause: unknown) => cause);

    expect(error).toMatchObject({ message: "Hermes request timed out" });
    expect(String(error)).not.toContain("test-key");
  });

  it("aborts an active stream and yields no later delta", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(
        "event: assistant.delta\ndata: {\"delta\":\"first\"}\n\n",
      );
      setTimeout(() => {
        response.write(
          "event: assistant.delta\ndata: {\"delta\":\"late\"}\n\n",
        );
      }, 50);
    });
    const client = createClient(baseUrl);
    const controller = new AbortController();
    const stream = client.streamSession({
      sessionId: "session-1",
      message: "Question",
      systemPrompt: "tenant-scoped-system-prompt",
      signal: controller.signal,
    });
    const iterator = stream[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { type: "assistant.delta", delta: "first" },
    });
    controller.abort();

    await expect(iterator.next()).rejects.toMatchObject({ name: "AbortError" });
  });
});

function createClient(baseUrl: string, requestTimeoutMs = 1_000) {
  return new HttpHermesClient({
    baseUrl,
    apiKey: "test-key",
    requestTimeoutMs,
  });
}

async function startServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fake Hermes server did not bind to a TCP port");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function collect(
  events: AsyncIterable<HermesStreamEvent>,
): Promise<HermesStreamEvent[]> {
  const collected: HermesStreamEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}
