import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentTenant } from "@/common/tenant/tenant-context.decorator";
import type { TenantContext } from "@/common/tenant/tenant-context";
import {
  CreatePackagingTypeDto,
  ListPackagingTypesQueryDto,
  UpdatePackagingTypeDto,
} from "./dto/packaging-type.dto";
import { PackagingTypesService } from "./packaging-types.service";

@ApiTags("packaging-types")
@Controller("packaging/types")
export class PackagingTypesController {
  constructor(
    @Inject(PackagingTypesService)
    private readonly packagingTypesService: PackagingTypesService,
  ) {}

  @Get()
  list(
    @Query() query: ListPackagingTypesQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.packagingTypesService.list(query, tenant);
  }

  @Post()
  create(
    @Body() body: CreatePackagingTypeDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.packagingTypesService.create(body, tenant);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePackagingTypeDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.packagingTypesService.update(id, body, tenant);
  }

  @Delete(":id")
  delete(
    @Param("id", ParseIntPipe) id: number,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.packagingTypesService.delete(id, tenant);
  }

  @Post(":batch-delete")
  batchDelete(
    @Body("ids", new ParseArrayPipe({ items: Number })) ids: number[],
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.packagingTypesService.batchDelete(ids, tenant);
  }
}
