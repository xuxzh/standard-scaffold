import { Module } from "@nestjs/common";
import { PackagingModule } from "./packaging/packaging.module";

@Module({
  imports: [PackagingModule],
})
export class AppModule {}
