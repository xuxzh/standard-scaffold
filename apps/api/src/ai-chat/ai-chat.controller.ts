import type { ServerResponse } from "node:http";

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CurrentTenant } from "@/common/tenant/tenant-context.decorator";
import type { TenantContext } from "@/common/tenant/tenant-context";
import { createValidationPipe } from "@/common/http/validation";

import { AiChatService } from "./ai-chat.service.js";
import { StartAiRunDto } from "./dto/ai-chat.dto.js";
import type { AiRunPublicEvent } from "./runs/ai-run-event-broker.js";

@ApiTags("ai-chat")
@Controller("ai")
export class AiChatController {
  constructor(
    @Inject(AiChatService)
    private readonly service: AiChatService,
  ) {}

  @Get("conversations")
  listConversations(@CurrentTenant() tenant: TenantContext) {
    return this.service.listConversations(tenant);
  }

  @Post("conversations")
  createConversation(@CurrentTenant() tenant: TenantContext) {
    return this.service.createConversation(tenant);
  }

  @Get("conversations/:id/messages")
  listMessages(
    @Param("id") conversationId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.service.listMessages(tenant, conversationId);
  }

  @Delete("conversations/:id")
  async deleteConversation(
    @Param("id") conversationId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.service.deleteConversation(tenant, conversationId);
    return { deleted: true };
  }

  @Post("conversations/:id/messages")
  @HttpCode(HttpStatus.ACCEPTED)
  startRun(
    @Param("id") conversationId: string,
    @Body(createValidationPipe(StartAiRunDto)) body: StartAiRunDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.service.startRun(tenant, conversationId, body.content);
  }

  @Get("runs/:runId/events")
  async subscribeRun(
    @Param("runId") runId: string,
    @CurrentTenant() tenant: TenantContext,
    @Res() response: ServerResponse,
  ): Promise<void> {
    const disconnected = new AbortController();
    const events = await this.service.subscribeRun(
      tenant,
      runId,
      disconnected.signal,
    );
    response.statusCode = HttpStatus.OK;
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();

    const iterator = events[Symbol.asyncIterator]();
    response.on("close", () => {
      disconnected.abort();
      void iterator.return?.();
    });
    try {
      for await (const event of iterable(iterator)) {
        response.write(serializeSseEvent(event));
      }
    } finally {
      await iterator.return?.();
      if (!response.closed) {
        response.end();
      }
    }
  }

  @Post("runs/:runId/stop")
  stopRun(
    @Param("runId") runId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.service.stopRun(tenant, runId);
  }

  @Get("health")
  health() {
    return this.service.health();
  }
}

function serializeSseEvent(event: AiRunPublicEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

async function* iterable(
  iterator: AsyncIterator<AiRunPublicEvent>,
): AsyncIterable<AiRunPublicEvent> {
  while (true) {
    const result = await iterator.next();
    if (result.done) {
      return;
    }
    yield result.value;
  }
}
