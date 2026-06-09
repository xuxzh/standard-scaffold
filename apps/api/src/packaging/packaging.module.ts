import { Module } from "@nestjs/common";
import { PackagingTypesModule } from "./types/packaging-types.module";

@Module({
  imports: [PackagingTypesModule],
})
export class PackagingModule {}
