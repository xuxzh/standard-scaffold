import { ConflictException, NotFoundException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpExceptionFilter } from "@/common/http/http-exception.filter";
import { HttpResponseInterceptor } from "@/common/http/http-response.interceptor";
import { createValidationPipe } from "@/common/http/validation";

import { AiChatController } from "./ai-chat.controller.js";
import { AiChatService } from "./ai-chat.service.js";

const tenantHeaders = {
  "x-company-code": "COMPANY-A",
  "x-factory-code": "FACTORY-A",
  "x-user-id": "42",
};

describe("AiChatController", () => {
  let app: INestApplication;
  let baseUrl: string;
  let service: {
    listConversations: ReturnType<typeof vi.fn>;
    createConversation: ReturnType<typeof vi.fn>;
    listMessages: ReturnType<typeof vi.fn>;
    deleteConversation: ReturnType<typeof vi.fn>;
    startRun: ReturnType<typeof vi.fn>;
    subscribeRun: ReturnType<typeof vi.fn>;
    stopRun: ReturnType<typeof vi.fn>;
    health: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      listConversations: vi.fn().mockResolvedValue([]),
      createConversation: vi.fn().mockResolvedValue({ id: "conversation-1" }),
      listMessages: vi.fn().mockResolvedValue([]),
      deleteConversation: vi.fn().mockResolvedValue(undefined),
      startRun: vi.fn().mockResolvedValue({ run: { id: "run-1" } }),
      subscribeRun: vi.fn(),
      stopRun: vi.fn().mockResolvedValue({ id: "run-1", status: "stopped" }),
      health: vi.fn().mockResolvedValue({ available: true }),
    };
    const module = await Test.createTestingModule({
      controllers: [AiChatController],
      providers: [{ provide: AiChatService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalInterceptors(new HttpResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  it("passes tenant scope to conversation and message endpoints", async () => {
    await request("/api/ai/conversations");
    await request("/api/ai/conversations", { method: "POST" });
    await request("/api/ai/conversations/conversation-1/messages");
    await request("/api/ai/conversations/conversation-1", { method: "DELETE" });

    const tenant = {
      companyCode: "COMPANY-A",
      factoryCode: "FACTORY-A",
      userId: 42,
      userName: undefined,
    };
    expect(service.listConversations).toHaveBeenCalledWith(tenant);
    expect(service.createConversation).toHaveBeenCalledWith(tenant);
    expect(service.listMessages).toHaveBeenCalledWith(tenant, "conversation-1");
    expect(service.deleteConversation).toHaveBeenCalledWith(tenant, "conversation-1");
  });

  it("returns 202 when starting a run", async () => {
    const response = await request("/api/ai/conversations/conversation-1/messages", {
      method: "POST",
      body: JSON.stringify({ content: "How many work orders completed today?" }),
    });

    expect(response.status).toBe(202);
    expect(service.startRun).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 }),
      "conversation-1",
      "How many work orders completed today?",
    );
  });

  it("rejects unknown and empty DTO fields", async () => {
    const unknown = await request("/api/ai/conversations/conversation-1/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Question", unexpected: true }),
    });
    const empty = await request("/api/ai/conversations/conversation-1/messages", {
      method: "POST",
      body: JSON.stringify({ content: "" }),
    });

    expect(unknown.status).toBe(400);
    expect((await unknown.json()).errorCode).toBe("VALIDATION_ERROR");
    expect(empty.status).toBe(400);
    expect((await empty.json()).errorCode).toBe("VALIDATION_ERROR");
    expect(service.startRun).not.toHaveBeenCalled();
  });

  it.each([
    [new NotFoundException({ message: "missing", errorCode: "AI_RUN_NOT_FOUND" }), 404, "AI_RUN_NOT_FOUND"],
    [new ConflictException({ message: "busy", errorCode: "AI_CONVERSATION_BUSY" }), 409, "AI_CONVERSATION_BUSY"],
  ])("maps service errors", async (error, status, errorCode) => {
    service.startRun.mockRejectedValueOnce(error);
    const response = await request("/api/ai/conversations/conversation-1/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Question" }),
    });

    expect(response.status).toBe(status);
    expect((await response.json()).errorCode).toBe(errorCode);
  });

  it("writes named raw SSE events without the JSON response envelope", async () => {
    service.subscribeRun.mockResolvedValue(
      events([
        { type: "message.delta", runId: "run-1", messageId: "message-1", delta: "42" },
        { type: "run.completed", runId: "run-1", message: { id: "message-1" } },
      ]),
    );

    const response = await request("/api/ai/runs/run-1/events");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toContain("event: message.delta\n");
    expect(body).toContain('data: {"type":"message.delta","runId":"run-1","messageId":"message-1","delta":"42"}\n\n');
    expect(body).toContain("event: run.completed\n");
    expect(body).not.toContain('"success":true');
  });

  it("closes the SSE subscription when the client disconnects", async () => {
    const finalized = vi.fn();
    service.subscribeRun.mockImplementation(
      (_tenant, _runId, signal: AbortSignal) =>
        Promise.resolve(openEvents(finalized, signal)),
    );
    const response = await request("/api/ai/runs/run-1/events");
    const reader = response.body?.getReader();

    expect(reader).toBeDefined();
    await reader?.read();
    await reader?.cancel();

    await vi.waitFor(() => expect(finalized).toHaveBeenCalledOnce());
  });

  it("returns the same terminal run for repeated stop calls", async () => {
    const first = await request("/api/ai/runs/run-1/stop", { method: "POST" });
    const second = await request("/api/ai/runs/run-1/stop", { method: "POST" });

    expect((await first.json()).data).toEqual({ id: "run-1", status: "stopped" });
    expect((await second.json()).data).toEqual({ id: "run-1", status: "stopped" });
    expect(service.stopRun).toHaveBeenCalledTimes(2);
  });

  it("exposes only the health summary", async () => {
    service.health.mockResolvedValue({ available: true, version: "1.2.3", capabilities: ["streaming"] });
    const response = await request("/api/ai/health");

    expect((await response.json()).data).toEqual({
      available: true,
      version: "1.2.3",
      capabilities: ["streaming"],
    });
  });

  function request(path: string, init: RequestInit = {}) {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...tenantHeaders,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  }
});

async function* events(values: Array<Record<string, unknown>>) {
  for (const value of values) {
    yield value;
  }
}

async function* openEvents(finalized: () => void, signal: AbortSignal) {
  try {
    yield { type: "message.delta", runId: "run-1", messageId: "message-1", delta: "a" };
    await new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
  } finally {
    finalized();
  }
}
