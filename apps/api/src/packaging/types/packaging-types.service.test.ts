import { describe, expect, it, vi } from "vitest";
import { PackagingTypesService } from "./packaging-types.service";

const tenant = {
  companyCode: "RUIHUI",
  factoryCode: "DEFAULT",
  userId: 1,
  userName: "admin",
};

function createPrismaMock() {
  return {
    packagingType: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe("PackagingTypesService", () => {
  it("lists packaging types with tenant filtering and sort whitelist", async () => {
    const prisma = createPrismaMock();
    prisma.packagingType.count.mockResolvedValue(1);
    prisma.packagingType.findMany.mockResolvedValue([
      {
        id: 1,
        typeCode: "BOX",
        typeName: "Box",
        isRecyclable: false,
        description: "Carton",
        remark: "",
        createdAt: new Date("2026-06-09T01:00:00.000Z"),
        updatedAt: new Date("2026-06-09T01:00:00.000Z"),
      },
    ]);
    const service = new PackagingTypesService(prisma as never);

    const result = await service.list(
      {
        pageNum: 2,
        pageSize: 20,
        typeCode: "BO",
        isRecyclable: false,
        sortField: "typeCode",
        sortOrder: "asc",
      },
      tenant,
    );

    expect(prisma.packagingType.count).toHaveBeenCalledWith({
      where: {
        companyCode: "RUIHUI",
        factoryCode: "DEFAULT",
        deletedAt: null,
        typeCode: { contains: "BO", mode: "insensitive" },
        isRecyclable: false,
      },
    });
    expect(prisma.packagingType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: { typeCode: "asc" },
      }),
    );
    expect(result).toEqual({
      records: [
        expect.objectContaining({
          id: 1,
          typeCode: "BOX",
          createdAt: "2026-06-09T01:00:00.000Z",
        }),
      ],
      total: 1,
      pageNum: 2,
      pageSize: 20,
      pages: 1,
    });
  });

  it("rejects unsupported sort fields before reaching Prisma", async () => {
    const prisma = createPrismaMock();
    const service = new PackagingTypesService(prisma as never);

    await expect(
      service.list(
        {
          pageNum: 1,
          pageSize: 20,
          sortField: "companyCode",
          sortOrder: "asc",
        },
        tenant,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: "INVALID_SORT_FIELD",
      }),
    });
    expect(prisma.packagingType.findMany).not.toHaveBeenCalled();
  });

  it("creates packaging types inside the current tenant", async () => {
    const prisma = createPrismaMock();
    prisma.packagingType.create.mockResolvedValue({
      id: 1,
      typeCode: "BOX",
      typeName: "Box",
      isRecyclable: false,
      description: "Carton",
      remark: "",
      createdAt: new Date("2026-06-09T01:00:00.000Z"),
      updatedAt: new Date("2026-06-09T01:00:00.000Z"),
    });
    const service = new PackagingTypesService(prisma as never);

    await service.create(
      {
        typeCode: "BOX",
        typeName: "Box",
        isRecyclable: false,
        description: "Carton",
        remark: "",
      },
      tenant,
    );

    expect(prisma.packagingType.create).toHaveBeenCalledWith({
      data: {
        companyCode: "RUIHUI",
        factoryCode: "DEFAULT",
        typeCode: "BOX",
        typeName: "Box",
        isRecyclable: false,
        description: "Carton",
        remark: "",
        creatorUserId: 1,
        creatorUserName: "admin",
      },
    });
  });
});
