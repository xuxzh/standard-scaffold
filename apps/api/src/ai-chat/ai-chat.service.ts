import { randomUUID } from "node:crypto";

import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type OnModuleInit,
} from "@nestjs/common";

import type { TenantContext } from "@/common/tenant/tenant-context";

import { AiChatRepository } from "./ai-chat.repository.js";
import type {
  AiActorScope,
  AiConversationDto,
  AiMessageDto,
  AiRunDto,
  StartAiRunRecord,
} from "./ai-chat.types.js";
import { MesContextService } from "./context/mes-context.service.js";
import type {
  HermesClient,
  HermesStreamEvent,
} from "./hermes/hermes-client.js";
import { AiRunEventBroker } from "./runs/ai-run-event-broker.js";

export const HERMES_CLIENT = Symbol("HERMES_CLIENT");

@Injectable()
export class AiChatService implements OnModuleInit {
  private readonly activeRuns = new Map<string, Promise<void>>();

  constructor(
    @Inject(AiChatRepository)
    private readonly repository: AiChatRepository,
    @Inject(HERMES_CLIENT)
    private readonly hermes: HermesClient,
    @Inject(MesContextService)
    private readonly context: MesContextService,
    @Inject(AiRunEventBroker)
    private readonly broker: AiRunEventBroker,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.repository.interruptActiveRuns();
  }

  async listConversations(tenant: TenantContext): Promise<AiConversationDto[]> {
    return this.repository.listConversations(toActorScope(tenant));
  }

  async createConversation(tenant: TenantContext): Promise<AiConversationDto> {
    const scope = toActorScope(tenant);
    try {
      await this.hermes.health();
    } catch {
      throw new ServiceUnavailableException({
        message: "AI service is unavailable",
        errorCode: "AI_SERVICE_UNAVAILABLE",
      });
    }

    const compiled = this.context.compile({
      ...scope,
      now: new Date(),
    });
    const hermesSessionId = randomUUID();
    const title = "New conversation";
    await this.hermes.createSession({
      id: hermesSessionId,
      title: `${title} ${hermesSessionId}`,
      systemPrompt: compiled.systemPrompt,
    });
    return this.repository.createConversation(scope, {
      title,
      hermesSessionId,
      contextVersion: compiled.version,
    });
  }

  async listMessages(
    tenant: TenantContext,
    conversationId: string,
  ): Promise<AiMessageDto[]> {
    return this.repository.listMessages(toActorScope(tenant), conversationId);
  }

  async deleteConversation(
    tenant: TenantContext,
    conversationId: string,
  ): Promise<void> {
    await this.repository.softDeleteConversation(
      toActorScope(tenant),
      conversationId,
    );
  }

  async startRun(
    tenant: TenantContext,
    conversationId: string,
    content: string,
  ): Promise<Omit<StartAiRunRecord, "hermesSessionId">> {
    const scope = toActorScope(tenant);
    const record = await this.repository.createRun(scope, conversationId, content);
    if (record.userMessage.sequence === 1) {
      await this.repository.updateConversationTitle(
        scope,
        conversationId,
        createTitle(content),
      );
    }

    const signal = this.broker.createRun(record.run.id);
    const processing = this.processRun(scope, record, content, signal);
    this.activeRuns.set(record.run.id, processing);
    void processing.finally(() => this.activeRuns.delete(record.run.id));

    return {
      userMessage: record.userMessage,
      assistantMessage: record.assistantMessage,
      run: record.run,
    };
  }

  async stopRun(tenant: TenantContext, runId: string): Promise<AiRunDto> {
    const scope = toActorScope(tenant);
    const current = await this.repository.getRun(scope, runId);
    if (!isActiveRun(current.status)) {
      return current;
    }
    this.broker.stop(runId);
    await this.activeRuns.get(runId);
    return this.repository.getRun(scope, runId);
  }

  async subscribeRun(
    tenant: TenantContext,
    runId: string,
    signal?: AbortSignal,
  ) {
    await this.repository.getRun(toActorScope(tenant), runId);
    return this.broker.subscribe(runId, signal);
  }

  async health(): Promise<{ available: boolean }> {
    try {
      await this.hermes.health();
      return { available: true };
    } catch {
      return { available: false };
    }
  }

  private async processRun(
    scope: AiActorScope,
    record: StartAiRunRecord,
    message: string,
    signal: AbortSignal,
  ): Promise<void> {
    let draft = "";
    let lastSavedBytes = 0;
    let lastSavedAt = Date.now();
    let assistantCompletedContent: string | undefined;
    const evidenceByTool = new Map<string, string[]>();

    try {
      await this.repository.markRunRunning(record.run.id);
      const { systemPrompt } = this.context.compile({
        ...scope,
        now: new Date(),
      });
      for await (const event of this.hermes.streamSession({
        sessionId: record.hermesSessionId,
        message,
        systemPrompt,
        signal,
      })) {
        if (event.type === "assistant.delta") {
          draft += event.delta;
          this.broker.publish(record.run.id, {
            type: "message.delta",
            runId: record.run.id,
            messageId: record.assistantMessage.id,
            delta: event.delta,
          });
          const currentBytes = Buffer.byteLength(draft, "utf8");
          if (
            currentBytes - lastSavedBytes >= 2_048 ||
            Date.now() - lastSavedAt >= 500
          ) {
            await this.repository.saveAssistantDraft(record.run.id, draft);
            lastSavedBytes = currentBytes;
            lastSavedAt = Date.now();
          }
          continue;
        }
        if (event.type === "tool.started") {
          await this.startEvidence(scope, record.run.id, event, evidenceByTool);
          continue;
        }
        if (event.type === "tool.completed") {
          await this.completeEvidence(event, evidenceByTool);
          continue;
        }
        if (event.type === "assistant.completed") {
          assistantCompletedContent = event.content;
          continue;
        }
        if (event.type === "run.completed") {
          await this.completeRun(record, event.content);
          return;
        }
        if (event.type === "run.failed") {
          await this.failRun(record.run.id);
          return;
        }
      }

      if (assistantCompletedContent !== undefined) {
        await this.completeRun(record, assistantCompletedContent);
        return;
      }
      throw new Error("Hermes stream ended without a terminal event");
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        await this.repository.stopRun(record.run.id, draft);
        this.broker.publish(record.run.id, {
          type: "run.stopped",
          runId: record.run.id,
          message: {
            ...record.assistantMessage,
            content: draft,
            status: "stopped",
          },
        });
        this.broker.complete(record.run.id);
        return;
      }
      await this.failRun(record.run.id);
    }
  }

  private async startEvidence(
    scope: AiActorScope,
    runId: string,
    event: Extract<HermesStreamEvent, { type: "tool.started" }>,
    evidenceByTool: Map<string, string[]>,
  ): Promise<void> {
    if (!isMesDataTool(event.toolName) || !isRecord(event.args)) {
      return;
    }
    const sql = event.args.sql;
    if (typeof sql !== "string" || !sql.trim()) {
      return;
    }
    const evidence = await this.repository.createEvidence(runId, scope, {
      toolName: event.toolName,
      sql,
    });
    const ids = evidenceByTool.get(event.toolName) ?? [];
    ids.push(evidence.id);
    evidenceByTool.set(event.toolName, ids);
    this.broker.publish(runId, {
      type: "evidence.updated",
      runId,
      evidence,
    });
  }

  private async completeEvidence(
    event: Extract<HermesStreamEvent, { type: "tool.completed" }>,
    evidenceByTool: Map<string, string[]>,
  ): Promise<void> {
    if (!isMesDataTool(event.toolName)) {
      return;
    }
    const evidenceId = evidenceByTool.get(event.toolName)?.shift();
    if (!evidenceId) {
      return;
    }
    const preview = parseEvidencePreview(event.preview);
    const evidence = await this.repository.completeEvidence(evidenceId, {
      durationMs: event.durationMs,
      rowCount: preview?.rowCount ?? null,
      truncated: preview?.truncated ?? null,
    });
    this.broker.publish(evidence.runId, {
      type: "evidence.updated",
      runId: evidence.runId,
      evidence,
    });
  }

  private async completeRun(
    record: StartAiRunRecord,
    content: string,
  ): Promise<void> {
    await this.repository.completeRun(record.run.id, content);
    this.broker.publish(record.run.id, {
      type: "run.completed",
      runId: record.run.id,
      message: {
        ...record.assistantMessage,
        content,
        status: "completed",
      },
    });
    this.broker.complete(record.run.id);
  }

  private async failRun(runId: string): Promise<void> {
    await this.repository.failRun(runId, "AI_RUN_FAILED");
    this.broker.publish(runId, {
      type: "run.failed",
      runId,
      errorCode: "AI_RUN_FAILED",
      message: "AI run failed",
    });
    this.broker.complete(runId);
  }
}

function toActorScope(tenant: TenantContext): AiActorScope {
  const userName = tenant.userName?.trim() || undefined;
  const userKey = tenant.userId === undefined ? userName : String(tenant.userId);
  if (!userKey) {
    throw new UnauthorizedException({
      message: "AI user context is required",
      errorCode: "AI_USER_CONTEXT_REQUIRED",
    });
  }
  return {
    companyCode: tenant.companyCode,
    factoryCode: tenant.factoryCode,
    userKey,
    ...(userName ? { userName } : {}),
  };
}

function createTitle(content: string): string {
  return content.trim().replace(/\s+/g, " ").slice(0, 80);
}

function isActiveRun(status: AiRunDto["status"]): boolean {
  return status === "queued" || status === "running";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMesDataTool(toolName: string): boolean {
  return (
    toolName.startsWith("mcp__mes_data__") ||
    toolName.startsWith("mcp_mes_data_")
  );
}

function parseEvidencePreview(
  preview: string | undefined,
): { rowCount: number; truncated: boolean } | undefined {
  if (!preview) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(preview);
    if (
      isRecord(value) &&
      Number.isInteger(value.rowCount) &&
      (value.rowCount as number) >= 0 &&
      typeof value.truncated === "boolean"
    ) {
      return {
        rowCount: value.rowCount as number,
        truncated: value.truncated,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}
