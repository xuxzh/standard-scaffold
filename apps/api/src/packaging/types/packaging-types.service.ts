import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { XzPageData } from "@/common/contracts/response.contract";
import { createOrderBy } from "@/common/query/sort";
import type { TenantContext } from "@/common/tenant/tenant-context";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  CreatePackagingTypeDto,
  ListPackagingTypesQueryDto,
  PackagingTypeDto,
  UpdatePackagingTypeDto,
} from "./dto/packaging-type.dto";

type PackagingTypeEntity = {
  id: number;
  typeCode: string;
  typeName: string;
  isRecyclable: boolean;
  description: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PackagingTypeDelegate = {
  count: (args: unknown) => Promise<number>;
  findMany: (args: unknown) => Promise<PackagingTypeEntity[]>;
  create: (args: unknown) => Promise<PackagingTypeEntity>;
  update: (args: unknown) => Promise<PackagingTypeEntity>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
};

type PackagingTypePrisma = {
  packagingType: PackagingTypeDelegate;
};

const packagingTypeSortFields = [
  "typeCode",
  "typeName",
  "isRecyclable",
  "createdAt",
  "updatedAt",
] as const;

function toPackagingTypeDto(entity: PackagingTypeEntity): PackagingTypeDto {
  return {
    id: entity.id,
    typeCode: entity.typeCode,
    typeName: entity.typeName,
    isRecyclable: entity.isRecyclable,
    description: entity.description ?? "",
    remark: entity.remark ?? "",
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function buildWhere(query: ListPackagingTypesQueryDto, tenant: TenantContext) {
  return {
    companyCode: tenant.companyCode,
    factoryCode: tenant.factoryCode,
    deletedAt: null,
    ...(query.typeCode
      ? { typeCode: { contains: query.typeCode, mode: "insensitive" } }
      : {}),
    ...(query.typeName
      ? { typeName: { contains: query.typeName, mode: "insensitive" } }
      : {}),
    ...(query.isRecyclable === undefined
      ? {}
      : { isRecyclable: query.isRecyclable }),
  };
}

@Injectable()
export class PackagingTypesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService & PackagingTypePrisma,
  ) {}

  async list(
    query: ListPackagingTypesQueryDto,
    tenant: TenantContext,
  ): Promise<XzPageData<PackagingTypeDto>> {
    const pageNum = query.pageNum ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = buildWhere(query, tenant);
    const orderBy = createOrderBy(
      query.sortField,
      query.sortOrder,
      packagingTypeSortFields,
      { createdAt: "desc" },
    );
    const [total, records] = await Promise.all([
      this.prisma.packagingType.count({ where }),
      this.prisma.packagingType.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
    ]);

    return {
      records: records.map(toPackagingTypeDto),
      total,
      pageNum,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }

  async create(
    input: CreatePackagingTypeDto,
    tenant: TenantContext,
  ): Promise<PackagingTypeDto> {
    const created = await this.prisma.packagingType.create({
      data: {
        companyCode: tenant.companyCode,
        factoryCode: tenant.factoryCode,
        typeCode: input.typeCode,
        typeName: input.typeName,
        isRecyclable: input.isRecyclable,
        description: input.description ?? "",
        remark: input.remark ?? "",
        creatorUserId: tenant.userId,
        creatorUserName: tenant.userName,
      },
    });

    return toPackagingTypeDto(created);
  }

  async update(
    id: number,
    input: UpdatePackagingTypeDto,
    tenant: TenantContext,
  ): Promise<PackagingTypeDto> {
    const updated = await this.prisma.packagingType.update({
      where: {
        id,
        companyCode: tenant.companyCode,
        factoryCode: tenant.factoryCode,
        deletedAt: null,
      },
      data: input,
    });

    return toPackagingTypeDto(updated);
  }

  async delete(id: number, tenant: TenantContext): Promise<{ deletedCount: number }> {
    const result = await this.prisma.packagingType.updateMany({
      where: {
        id,
        companyCode: tenant.companyCode,
        factoryCode: tenant.factoryCode,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException({
        message: "Packaging type not found",
        errorCode: "PACKAGING_TYPE_NOT_FOUND",
      });
    }

    return { deletedCount: result.count };
  }

  async batchDelete(
    ids: number[],
    tenant: TenantContext,
  ): Promise<{ deletedCount: number }> {
    const result = await this.prisma.packagingType.updateMany({
      where: {
        id: { in: ids },
        companyCode: tenant.companyCode,
        factoryCode: tenant.factoryCode,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return { deletedCount: result.count };
  }
}
