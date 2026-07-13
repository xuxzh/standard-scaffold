import { describe, expect, it, vi } from "vitest";

import { AiRunEventBroker } from "./runs/ai-run-event-broker.js";
import { AiChatService } from "./ai-chat.service.js";

const TENANT = {
  companyCode: "RUIHUI",
  factoryCode: "FACTORY-01",
  userId: 42,
  userName: "Alice",
};

describe("AiChatService", () => {
  it("requires a non-empty user identity", async () => {
    const harness = createHarness();

    await expect(
      harness.service.listConversations({
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ errorCode: "AI_USER_CONTEXT_REQUIRED" }),
    });
  });

  it("prefers stringified userId and falls back to a non-empty userName", async () => {
    const harness = createHarness();
    harness.repository.listConversations.mockResolvedValue([]);

    await harness.service.listConversations(TENANT);
    await harness.service.listConversations({
      ...TENANT,
      userId: undefined,
      userName: "  fallback-user  ",
    });

    expect(harness.repository.listConversations).toHaveBeenNthCalledWith(1, {
      companyCode: "RUIHUI",
      factoryCode: "FACTORY-01",
      userKey: "42",
      userName: "Alice",
    });
    expect(harness.repository.listConversations).toHaveBeenNthCalledWith(2, {
      companyCode: "RUIHUI",
      factoryCode: "FACTORY-01",
      userKey: "fallback-user",
      userName: "fallback-user",
    });
  });

  it("does not create a conversation while Hermes is unhealthy", async () => {
    const harness = createHarness();
    harness.hermes.health.mockRejectedValue(new Error("offline"));

    await expect(harness.service.createConversation(TENANT)).rejects.toMatchObject({
      response: expect.objectContaining({ errorCode: "AI_SERVICE_UNAVAILABLE" }),
    });
    expect(harness.repository.createConversation).not.toHaveBeenCalled();
    expect(harness.hermes.createSession).not.toHaveBeenCalled();
  });

  it("pins the compiled context version when creating a Hermes session", async () => {
    const harness = createHarness();
    harness.hermes.health.mockResolvedValue(undefined);
    harness.context.compile.mockReturnValue({
      version: "b".repeat(64),
      systemPrompt: "scoped system prompt",
    });
    harness.repository.createConversation.mockResolvedValue(conversationDto());

    await harness.service.createConversation(TENANT);

    expect(harness.hermes.createSession).toHaveBeenCalledWith({
      id: expect.any(String),
      title: "New conversation",
      systemPrompt: "scoped system prompt",
    });
    expect(harness.repository.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: "42" }),
      {
        title: "New conversation",
        hermesSessionId: expect.any(String),
        contextVersion: "b".repeat(64),
      },
    );
  });

  it("creates a first-message title and completes with the final Hermes content", async () => {
    const harness = createHarness([
      { type: "assistant.delta", delta: "draft" },
      { type: "run.completed", content: "Final answer" },
    ]);
    harness.repository.createRun.mockResolvedValue(startRunRecord({ userSequence: 1 }));

    const result = await harness.service.startRun(
      TENANT,
      "conversation-1",
      "What is today's production output?",
    );

    expect(result).not.toHaveProperty("hermesSessionId");
    await vi.waitFor(() => {
      expect(harness.repository.completeRun).toHaveBeenCalledWith(
        "run-1",
        "Final answer",
      );
    });
    expect(harness.repository.updateConversationTitle).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: "42" }),
      "conversation-1",
      "What is today's production output?",
    );
  });

  it("persists a draft after 2 KiB instead of writing every delta", async () => {
    const harness = createHarness([
      { type: "assistant.delta", delta: "a".repeat(1_024) },
      { type: "assistant.delta", delta: "b".repeat(1_024) },
      { type: "run.completed", content: "done" },
    ]);
    harness.repository.createRun.mockResolvedValue(startRunRecord());

    await harness.service.startRun(TENANT, "conversation-1", "Question");

    await vi.waitFor(() => {
      expect(harness.repository.completeRun).toHaveBeenCalled();
    });
    expect(harness.repository.saveAssistantDraft).toHaveBeenCalledTimes(1);
    expect(harness.repository.saveAssistantDraft).toHaveBeenCalledWith(
      "run-1",
      "a".repeat(1_024) + "b".repeat(1_024),
    );
  });

  it("creates and updates evidence only for MES MCP tool events", async () => {
    const harness = createHarness([
      {
        type: "tool.started",
        toolName: "unrelated_tool",
        args: { sql: "SELECT ignored" },
      },
      {
        type: "tool.started",
        toolName: "mcp_mes_data_query_mes_data",
        args: { sql: "SELECT Quantity FROM dbo.Output" },
      },
      {
        type: "tool.completed",
        toolName: "mcp_mes_data_query_mes_data",
        preview: '{"rowCount":5,"truncated":false}',
        durationMs: 12,
      },
      { type: "run.completed", content: "5 units" },
    ]);
    harness.repository.createRun.mockResolvedValue(startRunRecord());
    harness.repository.createEvidence.mockResolvedValue({ id: "evidence-1" });

    await harness.service.startRun(TENANT, "conversation-1", "Question");

    await vi.waitFor(() => {
      expect(harness.repository.completeEvidence).toHaveBeenCalledWith(
        "evidence-1",
        { durationMs: 12, rowCount: 5, truncated: false },
      );
    });
    expect(harness.repository.createEvidence).toHaveBeenCalledTimes(1);
    expect(harness.repository.createEvidence).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ companyCode: "RUIHUI", factoryCode: "FACTORY-01" }),
      {
        toolName: "mcp_mes_data_query_mes_data",
        sql: "SELECT Quantity FROM dbo.Output",
      },
    );
  });

  it("keeps preview counts null when the tool preview schema is invalid", async () => {
    const harness = createHarness([
      {
        type: "tool.started",
        toolName: "mcp_mes_data_query_mes_data",
        args: { sql: "SELECT 1" },
      },
      {
        type: "tool.completed",
        toolName: "mcp_mes_data_query_mes_data",
        preview: '{"rowCount":"guessed"}',
      },
      { type: "run.completed", content: "done" },
    ]);
    harness.repository.createRun.mockResolvedValue(startRunRecord());
    harness.repository.createEvidence.mockResolvedValue({ id: "evidence-1" });

    await harness.service.startRun(TENANT, "conversation-1", "Question");

    await vi.waitFor(() => {
      expect(harness.repository.completeEvidence).toHaveBeenCalledWith(
        "evidence-1",
        { durationMs: undefined, rowCount: null, truncated: null },
      );
    });
  });

  it("preserves the partial answer when stopping an active stream", async () => {
    const streamStarted = vi.fn();
    const harness = createHarness(async function* (signal) {
      yield { type: "assistant.delta" as const, delta: "partial" };
      streamStarted();
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      });
    });
    harness.repository.createRun.mockResolvedValue(startRunRecord());
    harness.repository.getRun
      .mockResolvedValueOnce(runDto({ status: "running" }))
      .mockResolvedValueOnce(runDto({ status: "stopped" }));

    await harness.service.startRun(TENANT, "conversation-1", "Question");
    await vi.waitFor(() => expect(streamStarted).toHaveBeenCalled());
    const stopped = await harness.service.stopRun(TENANT, "run-1");

    expect(harness.repository.stopRun).toHaveBeenCalledWith("run-1", "partial");
    expect(stopped.status).toBe("stopped");
  });

  it("marks Hermes failures while preserving the already-created user message", async () => {
    const harness = createHarness(async function* () {
      yield await Promise.reject(new Error("MCP password must not leak"));
    });
    harness.repository.createRun.mockResolvedValue(startRunRecord());

    await harness.service.startRun(TENANT, "conversation-1", "Question");

    await vi.waitFor(() => {
      expect(harness.repository.failRun).toHaveBeenCalledWith(
        "run-1",
        "AI_RUN_FAILED",
      );
    });
    expect(harness.repository.createRun).toHaveBeenCalledOnce();
  });

  it("interrupts residual active runs during module startup", async () => {
    const harness = createHarness();
    harness.repository.interruptActiveRuns.mockResolvedValue(2);

    await harness.service.onModuleInit();

    expect(harness.repository.interruptActiveRuns).toHaveBeenCalledOnce();
  });

  it("checks run ownership and forwards the client disconnect signal", async () => {
    const harness = createHarness();
    harness.repository.getRun.mockResolvedValue(runDto());
    harness.broker.createRun("run-1");
    const disconnected = new AbortController();

    await harness.service.subscribeRun(TENANT, "run-1", disconnected.signal);

    expect(harness.repository.getRun).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: "42" }),
      "run-1",
    );
  });
});

function createHarness(
  eventsOrFactory:
    | unknown[]
    | ((signal: AbortSignal) => AsyncIterable<unknown>) = [],
) {
  const repository = {
    listConversations: vi.fn(),
    listMessages: vi.fn(),
    createConversation: vi.fn(),
    softDeleteConversation: vi.fn(),
    createRun: vi.fn(),
    updateConversationTitle: vi.fn(),
    markRunRunning: vi.fn(),
    saveAssistantDraft: vi.fn(),
    createEvidence: vi.fn(),
    completeEvidence: vi.fn(),
    failRun: vi.fn(),
    completeRun: vi.fn(),
    stopRun: vi.fn(),
    getRun: vi.fn(),
    interruptActiveRuns: vi.fn(),
  };
  const hermes = {
    health: vi.fn(),
    createSession: vi.fn(),
    streamSession: vi.fn(({ signal }: { signal: AbortSignal }) =>
      typeof eventsOrFactory === "function"
        ? eventsOrFactory(signal)
        : events(eventsOrFactory),
    ),
  };
  const context = { compile: vi.fn() };
  const broker = new AiRunEventBroker();
  const service = new AiChatService(
    repository as never,
    hermes as never,
    context as never,
    broker,
  );
  return { service, repository, hermes, context, broker };
}

async function* events(values: unknown[]) {
  for (const value of values) {
    yield value;
  }
}

function conversationDto() {
  return {
    id: "conversation-1",
    title: "New conversation",
    status: "active",
    contextVersion: "b".repeat(64),
    createdAt: "2026-07-13T01:00:00.000Z",
    updatedAt: "2026-07-13T01:00:00.000Z",
  };
}

function startRunRecord(options: { userSequence?: number } = {}) {
  return {
    userMessage: {
      id: "user-message",
      conversationId: "conversation-1",
      role: "user",
      content: "Question",
      sequence: options.userSequence ?? 3,
      status: "completed",
      errorCode: null,
      completedAt: "2026-07-13T01:00:00.000Z",
      createdAt: "2026-07-13T01:00:00.000Z",
      updatedAt: "2026-07-13T01:00:00.000Z",
    },
    assistantMessage: {
      id: "assistant-message",
      conversationId: "conversation-1",
      role: "assistant",
      content: "",
      sequence: (options.userSequence ?? 3) + 1,
      status: "pending",
      errorCode: null,
      completedAt: null,
      createdAt: "2026-07-13T01:00:00.000Z",
      updatedAt: "2026-07-13T01:00:00.000Z",
    },
    run: runDto(),
    hermesSessionId: "hermes-session-1",
  };
}

function runDto(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    conversationId: "conversation-1",
    userMessageId: "user-message",
    assistantMessageId: "assistant-message",
    status: "queued",
    startedAt: null,
    endedAt: null,
    errorCode: null,
    createdAt: "2026-07-13T01:00:00.000Z",
    updatedAt: "2026-07-13T01:00:00.000Z",
    ...overrides,
  };
}
