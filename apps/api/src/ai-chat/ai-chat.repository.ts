import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "@/prisma/prisma.service";

import type {
  AiActorScope,
  AiConversationDto,
  AiMessageDto,
  AiRunDto,
  StartAiRunRecord,
} from "./ai-chat.types.js";

type ConversationEntity = {
  id: string;
  title: string;
  hermesSessionId: string;
  contextVersion: string;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
};

type MessageEntity = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  sequence: number;
  status: "pending" | "streaming" | "completed" | "stopped" | "failed";
  errorCode: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type RunEntity = {
  id: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  status: "queued" | "running" | "completed" | "stopped" | "failed" | "interrupted";
  startedAt: Date | null;
  endedAt: Date | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AiChatTransactionClient = {
  aiConversation: {
    create(args: unknown): Promise<ConversationEntity>;
    findFirst(args: unknown): Promise<ConversationEntity | null>;
    findMany(args: unknown): Promise<ConversationEntity[]>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  aiMessage: {
    aggregate(args: unknown): Promise<{ _max: { sequence: number | null } }>;
    create(args: unknown): Promise<MessageEntity>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  aiRun: {
    create(args: unknown): Promise<RunEntity>;
    findFirst(args: unknown): Promise<{ id: string } | null>;
    update(args: unknown): Promise<RunEntity>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

type AiChatPrisma = AiChatTransactionClient & {
  $transaction<T>(
    operation: (transaction: AiChatTransactionClient) => Promise<T>,
    options?: { isolationLevel: "Serializable" },
  ): Promise<T>;
};

@Injectable()
export class AiChatRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService & AiChatPrisma,
  ) {}

  async createConversation(
    scope: AiActorScope,
    input: {
      title: string;
      hermesSessionId: string;
      contextVersion: string;
    },
  ): Promise<AiConversationDto> {
    const conversation = await this.prisma.aiConversation.create({
      data: {
        ...scope,
        ...input,
        status: "active",
      },
    });
    return toConversationDto(conversation);
  }

  async listConversations(scope: AiActorScope): Promise<AiConversationDto[]> {
    const conversations = await this.prisma.aiConversation.findMany({
      where: buildConversationWhere(scope),
      orderBy: { updatedAt: "desc" },
    });
    return conversations.map(toConversationDto);
  }

  async getConversation(
    scope: AiActorScope,
    id: string,
  ): Promise<AiConversationDto> {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: buildConversationWhere(scope, id),
    });
    if (!conversation) {
      throw conversationNotFound();
    }
    return toConversationDto(conversation);
  }

  async softDeleteConversation(scope: AiActorScope, id: string): Promise<void> {
    const result = await this.prisma.aiConversation.updateMany({
      where: buildConversationWhere(scope, id),
      data: {
        status: "archived",
        deletedAt: new Date(),
      },
    });
    if (result.count === 0) {
      throw conversationNotFound();
    }
  }

  async createRun(
    scope: AiActorScope,
    conversationId: string,
    content: string,
  ): Promise<StartAiRunRecord> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
        const conversation = await transaction.aiConversation.findFirst({
          where: buildConversationWhere(scope, conversationId),
        });
        if (!conversation) {
          throw conversationNotFound();
        }

        const activeRun = await transaction.aiRun.findFirst({
          where: {
            conversationId,
            status: { in: ["queued", "running"] },
          },
          select: { id: true },
        });
        if (activeRun) {
          throw conversationBusy();
        }

        const sequence = await transaction.aiMessage.aggregate({
          where: { conversationId },
          _max: { sequence: true },
        });
        const userSequence = (sequence._max.sequence ?? 0) + 1;
        const completedAt = new Date();
        const userMessage = await transaction.aiMessage.create({
          data: {
            conversationId,
            role: "user",
            content,
            sequence: userSequence,
            status: "completed",
            completedAt,
          },
        });
        const assistantMessage = await transaction.aiMessage.create({
          data: {
            conversationId,
            role: "assistant",
            content: "",
            sequence: userSequence + 1,
            status: "pending",
          },
        });
        const run = await transaction.aiRun.create({
          data: {
            conversationId,
            userMessageId: userMessage.id,
            assistantMessageId: assistantMessage.id,
            status: "queued",
          },
        });

        return {
          userMessage: toMessageDto(userMessage),
          assistantMessage: toMessageDto(assistantMessage),
          run: toRunDto(run),
          hermesSessionId: conversation.hermesSessionId,
        };
      },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isPrismaConcurrencyError(error)) {
        throw conversationBusy();
      }
      throw error;
    }
  }

  async completeRun(runId: string, content: string): Promise<void> {
    await this.updateRunAndMessage(runId, "completed", content);
  }

  async stopRun(runId: string, content: string): Promise<void> {
    await this.updateRunAndMessage(runId, "stopped", content);
  }

  async failRun(runId: string, errorCode: string): Promise<void> {
    await this.updateRunAndMessage(runId, "failed", undefined, errorCode);
  }

  async interruptActiveRuns(): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const completedAt = new Date();
      const runs = await transaction.aiRun.updateMany({
        where: { status: { in: ["queued", "running"] } },
        data: {
          status: "interrupted",
          endedAt: completedAt,
          errorCode: "AI_RUN_INTERRUPTED",
        },
      });
      await transaction.aiMessage.updateMany({
        where: { status: { in: ["pending", "streaming"] } },
        data: {
          status: "failed",
          completedAt,
          errorCode: "AI_RUN_INTERRUPTED",
        },
      });
      return runs.count;
    });
  }

  private async updateRunAndMessage(
    runId: string,
    status: "completed" | "stopped" | "failed",
    content?: string,
    errorCode?: string,
  ): Promise<void> {
    const completedAt = new Date();
    await this.prisma.aiRun.update({
      where: { id: runId },
      data: {
        status,
        endedAt: completedAt,
        errorCode,
        assistantMessage: {
          update: {
            ...(content === undefined ? {} : { content }),
            status,
            completedAt,
            errorCode,
          },
        },
      },
    });
  }
}

function buildConversationWhere(scope: AiActorScope, id?: string) {
  return {
    ...(id ? { id } : {}),
    companyCode: scope.companyCode,
    factoryCode: scope.factoryCode,
    userKey: scope.userKey,
    deletedAt: null,
  };
}

function conversationNotFound(): NotFoundException {
  return new NotFoundException({
    message: "AI conversation not found",
    errorCode: "AI_CONVERSATION_NOT_FOUND",
  });
}

function conversationBusy(): ConflictException {
  return new ConflictException({
    message: "AI conversation already has an active run",
    errorCode: "AI_CONVERSATION_BUSY",
  });
}

function isPrismaConcurrencyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return error.code === "P2034" || error.code === "P2002";
}

function toConversationDto(entity: ConversationEntity): AiConversationDto {
  return {
    id: entity.id,
    title: entity.title,
    status: entity.status,
    contextVersion: entity.contextVersion,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function toMessageDto(entity: MessageEntity): AiMessageDto {
  return {
    id: entity.id,
    conversationId: entity.conversationId,
    role: entity.role === "assistant" ? "assistant" : "user",
    content: entity.content,
    sequence: entity.sequence,
    status: entity.status,
    errorCode: entity.errorCode,
    completedAt: entity.completedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function toRunDto(entity: RunEntity): AiRunDto {
  return {
    id: entity.id,
    conversationId: entity.conversationId,
    userMessageId: entity.userMessageId,
    assistantMessageId: entity.assistantMessageId,
    status: entity.status,
    startedAt: entity.startedAt?.toISOString() ?? null,
    endedAt: entity.endedAt?.toISOString() ?? null,
    errorCode: entity.errorCode,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
