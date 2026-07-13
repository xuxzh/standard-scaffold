import { describe, expect, it, vi } from "vitest";

import { AiChatRepository } from "./ai-chat.repository.js";

const SCOPE = {
  companyCode: "RUIHUI",
  factoryCode: "FACTORY-01",
  userKey: "user-42",
  userName: "Alice",
};

const OTHER_USER_SCOPE = {
  ...SCOPE,
  userKey: "user-99",
  userName: "Bob",
};

describe("AiChatRepository", () => {
  it("creates a conversation with the complete actor scope", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.create.mockResolvedValue(createConversationEntity());
    const repository = new AiChatRepository(prisma as never);

    const result = await repository.createConversation(SCOPE, {
      title: "Daily output",
      hermesSessionId: "hermes-session-1",
      contextVersion: "a".repeat(64),
    });

    expect(prisma.aiConversation.create).toHaveBeenCalledWith({
      data: {
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        userKey: "user-42",
        userName: "Alice",
        title: "Daily output",
        hermesSessionId: "hermes-session-1",
        contextVersion: "a".repeat(64),
        status: "active",
      },
    });
    expect(result).not.toHaveProperty("hermesSessionId");
  });

  it("lists only non-deleted conversations owned by the complete actor scope", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.findMany.mockResolvedValue([createConversationEntity()]);
    const repository = new AiChatRepository(prisma as never);

    await repository.listConversations(SCOPE);

    expect(prisma.aiConversation.findMany).toHaveBeenCalledWith({
      where: {
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        userKey: "user-42",
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("does not return another user's conversation", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.findFirst.mockResolvedValue(null);
    const repository = new AiChatRepository(prisma as never);

    await expect(
      repository.getConversation(OTHER_USER_SCOPE, "conversation-1"),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: "AI_CONVERSATION_NOT_FOUND",
      }),
    });
    expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: "conversation-1",
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        userKey: "user-99",
        deletedAt: null,
      },
    });
  });

  it("lists ordered messages only after validating conversation ownership", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.findFirst.mockResolvedValue(createConversationEntity());
    prisma.aiMessage.findMany.mockResolvedValue([
      createMessageEntity({ sequence: 1 }),
    ]);
    const repository = new AiChatRepository(prisma as never);

    const result = await repository.listMessages(SCOPE, "conversation-1");

    expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: "conversation-1",
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        userKey: "user-42",
        deletedAt: null,
      },
    });
    expect(prisma.aiMessage.findMany).toHaveBeenCalledWith({
      where: { conversationId: "conversation-1" },
      orderBy: { sequence: "asc" },
    });
    expect(result).toHaveLength(1);
  });

  it("does not soft-delete another user's conversation", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.updateMany.mockResolvedValue({ count: 0 });
    const repository = new AiChatRepository(prisma as never);

    await expect(
      repository.softDeleteConversation(OTHER_USER_SCOPE, "conversation-1"),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: "AI_CONVERSATION_NOT_FOUND",
      }),
    });
    expect(prisma.aiConversation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "conversation-1",
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        userKey: "user-99",
        deletedAt: null,
      },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });
  });

  it("updates a generated title only inside the complete actor scope", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.updateMany.mockResolvedValue({ count: 1 });
    const repository = new AiChatRepository(prisma as never);

    await repository.updateConversationTitle(
      SCOPE,
      "conversation-1",
      "Today's output",
    );

    expect(prisma.aiConversation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "conversation-1",
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        userKey: "user-42",
        deletedAt: null,
      },
      data: { title: "Today's output" },
    });
  });

  it("creates user message, assistant placeholder, and run in one scoped transaction", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.findFirst.mockResolvedValue(createConversationEntity());
    prisma.aiRun.findFirst.mockResolvedValue(null);
    prisma.aiMessage.aggregate.mockResolvedValue({ _max: { sequence: 4 } });
    prisma.aiMessage.create
      .mockResolvedValueOnce(createMessageEntity({ id: "user-message", sequence: 5 }))
      .mockResolvedValueOnce(
        createMessageEntity({
          id: "assistant-message",
          role: "assistant",
          status: "pending",
          content: "",
          sequence: 6,
        }),
      );
    prisma.aiRun.create.mockResolvedValue(
      createRunEntity({
        userMessageId: "user-message",
        assistantMessageId: "assistant-message",
      }),
    );
    const repository = new AiChatRepository(prisma as never);

    const result = await repository.createRun(
      SCOPE,
      "conversation-1",
      "What is today's output?",
    );

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: "conversation-1",
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        userKey: "user-42",
        deletedAt: null,
      },
    });
    expect(prisma.aiMessage.create).toHaveBeenNthCalledWith(1, {
      data: {
        conversationId: "conversation-1",
        role: "user",
        content: "What is today's output?",
        sequence: 5,
        status: "completed",
        completedAt: expect.any(Date),
      },
    });
    expect(prisma.aiMessage.create).toHaveBeenNthCalledWith(2, {
      data: {
        conversationId: "conversation-1",
        role: "assistant",
        content: "",
        sequence: 6,
        status: "pending",
      },
    });
    expect(result.hermesSessionId).toBe("hermes-session-1");
  });

  it("does not create a run in another user's conversation", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.findFirst.mockResolvedValue(null);
    const repository = new AiChatRepository(prisma as never);

    await expect(
      repository.createRun(OTHER_USER_SCOPE, "conversation-1", "Question"),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: "AI_CONVERSATION_NOT_FOUND",
      }),
    });
    expect(prisma.aiMessage.create).not.toHaveBeenCalled();
  });

  it("rejects a second active run in the same conversation", async () => {
    const prisma = createPrismaMock();
    prisma.aiConversation.findFirst.mockResolvedValue(createConversationEntity());
    prisma.aiRun.findFirst.mockResolvedValue(createRunEntity({ status: "running" }));
    const repository = new AiChatRepository(prisma as never);

    await expect(
      repository.createRun(SCOPE, "conversation-1", "Second question"),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ errorCode: "AI_CONVERSATION_BUSY" }),
    });
    expect(prisma.aiMessage.create).not.toHaveBeenCalled();
  });

  it.each(["P2034", "P2002"])(
    "maps Prisma concurrency error %s to a busy conversation",
    async (code) => {
      const prisma = createPrismaMock();
      prisma.$transaction.mockRejectedValue({ code });
      const repository = new AiChatRepository(prisma as never);

      await expect(
        repository.createRun(SCOPE, "conversation-1", "Concurrent question"),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: "AI_CONVERSATION_BUSY" }),
      });
    },
  );

  it("reads a run only through a conversation owned by the actor scope", async () => {
    const prisma = createPrismaMock();
    prisma.aiRun.findFirst.mockResolvedValue(createRunEntity());
    const repository = new AiChatRepository(prisma as never);

    await repository.getRun(SCOPE, "run-1");

    expect(prisma.aiRun.findFirst).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        conversation: {
          companyCode: "RUIHUI",
          factoryCode: "FACTORY-01",
          userKey: "user-42",
          deletedAt: null,
        },
      },
    });
  });

  it("marks a run and assistant message as streaming", async () => {
    const prisma = createPrismaMock();
    prisma.aiRun.update.mockResolvedValue(createRunEntity({ status: "running" }));
    const repository = new AiChatRepository(prisma as never);

    await repository.markRunRunning("run-1");

    expect(prisma.aiRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "running",
        startedAt: expect.any(Date),
        assistantMessage: { update: { status: "streaming" } },
      },
    });
  });

  it("persists an assistant draft through its run relation", async () => {
    const prisma = createPrismaMock();
    prisma.aiRun.update.mockResolvedValue(createRunEntity());
    const repository = new AiChatRepository(prisma as never);

    await repository.saveAssistantDraft("run-1", "partial");

    expect(prisma.aiRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { assistantMessage: { update: { content: "partial" } } },
    });
  });

  it("creates and completes query evidence with explicit result metadata", async () => {
    const prisma = createPrismaMock();
    prisma.aiQueryEvidence.create.mockResolvedValue({ id: "evidence-1" });
    prisma.aiQueryEvidence.update.mockResolvedValue({ id: "evidence-1" });
    const repository = new AiChatRepository(prisma as never);

    const evidence = await repository.createEvidence("run-1", SCOPE, {
      toolName: "mcp_mes_data_query_mes_data",
      sql: "SELECT 1",
    });
    await repository.completeEvidence(evidence.id, {
      durationMs: 12,
      rowCount: 5,
      truncated: false,
    });

    expect(prisma.aiQueryEvidence.create).toHaveBeenCalledWith({
      data: {
        runId: "run-1",
        toolName: "mcp_mes_data_query_mes_data",
        sql: "SELECT 1",
        companyCode: "RUIHUI",
        factoryCode: "FACTORY-01",
        status: "running",
      },
      select: { id: true },
    });
    expect(prisma.aiQueryEvidence.update).toHaveBeenCalledWith({
      where: { id: "evidence-1" },
      data: {
        status: "completed",
        endedAt: expect.any(Date),
        durationMs: 12,
        rowCount: 5,
        truncated: false,
      },
    });
  });

  it.each([
    {
      method: "completeRun" as const,
      runStatus: "completed",
      messageStatus: "completed",
      content: "Final answer",
      errorCode: undefined,
    },
    {
      method: "stopRun" as const,
      runStatus: "stopped",
      messageStatus: "stopped",
      content: "Partial answer",
      errorCode: undefined,
    },
    {
      method: "failRun" as const,
      runStatus: "failed",
      messageStatus: "failed",
      content: "AI_RUN_FAILED",
      errorCode: "AI_RUN_FAILED",
    },
  ])(
    "$method updates the run and assistant message atomically",
    async ({ method, runStatus, messageStatus, content, errorCode }) => {
      const prisma = createPrismaMock();
      prisma.aiRun.update.mockResolvedValue(createRunEntity({ status: runStatus }));
      const repository = new AiChatRepository(prisma as never);

      await repository[method]("run-1", content);

      expect(prisma.aiRun.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: {
          status: runStatus,
          endedAt: expect.any(Date),
          errorCode,
          assistantMessage: {
            update: {
              ...(method === "failRun" ? {} : { content }),
              status: messageStatus,
              completedAt: expect.any(Date),
              errorCode,
            },
          },
        },
      });
    },
  );

  it("interrupts residual active runs and their unfinished assistant messages", async () => {
    const prisma = createPrismaMock();
    prisma.aiRun.updateMany.mockResolvedValue({ count: 2 });
    prisma.aiMessage.updateMany.mockResolvedValue({ count: 2 });
    const repository = new AiChatRepository(prisma as never);

    const count = await repository.interruptActiveRuns();

    expect(count).toBe(2);
    expect(prisma.aiRun.updateMany).toHaveBeenCalledWith({
      where: { status: { in: ["queued", "running"] } },
      data: {
        status: "interrupted",
        endedAt: expect.any(Date),
        errorCode: "AI_RUN_INTERRUPTED",
      },
    });
    expect(prisma.aiMessage.updateMany).toHaveBeenCalledWith({
      where: { status: { in: ["pending", "streaming"] } },
      data: {
        status: "failed",
        completedAt: expect.any(Date),
        errorCode: "AI_RUN_INTERRUPTED",
      },
    });
  });
});

function createPrismaMock() {
  const prisma = {
    aiConversation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    aiMessage: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    aiRun: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    aiQueryEvidence: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (operation) => operation(prisma));
  return prisma;
}

function createConversationEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: "conversation-1",
    companyCode: "RUIHUI",
    factoryCode: "FACTORY-01",
    userKey: "user-42",
    userName: "Alice",
    title: "Daily output",
    hermesSessionId: "hermes-session-1",
    contextVersion: "a".repeat(64),
    status: "active",
    createdAt: new Date("2026-07-13T01:00:00.000Z"),
    updatedAt: new Date("2026-07-13T01:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function createMessageEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    role: "user",
    content: "Question",
    sequence: 1,
    status: "completed",
    errorCode: null,
    completedAt: new Date("2026-07-13T01:00:00.000Z"),
    createdAt: new Date("2026-07-13T01:00:00.000Z"),
    updatedAt: new Date("2026-07-13T01:00:00.000Z"),
    ...overrides,
  };
}

function createRunEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    conversationId: "conversation-1",
    userMessageId: "user-message",
    assistantMessageId: "assistant-message",
    hermesRunId: null,
    status: "queued",
    startedAt: null,
    endedAt: null,
    errorCode: null,
    createdAt: new Date("2026-07-13T01:00:00.000Z"),
    updatedAt: new Date("2026-07-13T01:00:00.000Z"),
    ...overrides,
  };
}
