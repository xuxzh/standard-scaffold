import { Module } from "@nestjs/common";

import { PrismaModule } from "@/prisma/prisma.module";

import { AiChatController } from "./ai-chat.controller.js";
import { AiChatRepository } from "./ai-chat.repository.js";
import { AiChatService, HERMES_CLIENT } from "./ai-chat.service.js";
import { MesContextService } from "./context/mes-context.service.js";
import {
  HttpHermesClient,
  loadHermesClientConfig,
} from "./hermes/hermes-client.js";
import { AiRunEventBroker } from "./runs/ai-run-event-broker.js";

@Module({
  imports: [PrismaModule],
  controllers: [AiChatController],
  providers: [
    AiChatRepository,
    AiChatService,
    AiRunEventBroker,
    {
      provide: MesContextService,
      useFactory: () => new MesContextService(process.env.MES_CONTEXT_DIRECTORY),
    },
    {
      provide: HERMES_CLIENT,
      useFactory: () => new HttpHermesClient(loadHermesClientConfig()),
    },
  ],
})
export class AiChatModule {}
