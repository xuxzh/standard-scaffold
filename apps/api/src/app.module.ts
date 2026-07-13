import { Module } from "@nestjs/common";
import { AiChatModule } from "./ai-chat/ai-chat.module.js";
import { PackagingModule } from "./packaging/packaging.module";

@Module({
  imports: [AiChatModule, PackagingModule],
})
export class AppModule {}
