import { Module } from "@nestjs/common";
import { PrismaModule } from "@/prisma/prisma.module";
import { PackagingTypesController } from "./packaging-types.controller";
import { PackagingTypesService } from "./packaging-types.service";

@Module({
  imports: [PrismaModule],
  controllers: [PackagingTypesController],
  providers: [PackagingTypesService],
})
export class PackagingTypesModule {}
