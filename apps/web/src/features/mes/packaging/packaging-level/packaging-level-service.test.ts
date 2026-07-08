import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  createPackagingLevel,
  deletePackagingLevel,
  deletePackagingLevels,
  getPackagingLevelOptions,
  getPackagingLevelTree,
  getPackagingLevels,
  updatePackagingLevel,
  type PackagingLevelApiDto,
  type PackagingLevelTreeDto,
} from "@/features/mes/packaging/packaging-level/packaging-level-service";

const packagingLevelDto: PackagingLevelApiDto = {
  Id: 1,
  LevelCode: "LV001",
  LevelName: "UNIT",
  ParentLevelCode: null,
  ParentLevelName: null,
  Description: "Smallest packaging unit",
  Remark: "",
  CompanyCode: "RUIHUI",
  FactoryCode: "DEFAULT",
  CreationTime: "2026-05-25T10:00:00",
  LastModificationTime: null,
};

const packagingLevelDeletePayload = {
  Id: 1,
  LevelCode: "LV001",
  LevelName: "UNIT",
  ParentLevelCode: null,
  ParentLevelName: null,
  Description: "Smallest packaging unit",
  Remark: "",
  CreationTime: "2026-05-25T10:00:00",
  LastModificationTime: null,
};

afterEach(() => {
  resetMesTransportForTests();
});

describe("packaging level service", () => {
  it("queries packaging levels with pagination and filters", async () => {
    const result: DataResult<PackagingLevelApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[MES] Query success",
      Attach: [packagingLevelDto],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);
    setMesTransportForTests(transport);

    await expect(
      getPackagingLevels({
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        LevelCode: "LV",
        LevelName: "UNIT",
        ParentLevelCode: "ROOT",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        LevelCode: "LV",
        LevelName: "UNIT",
        ParentLevelCode: "ROOT",
      },
      signal: undefined,
    });
  });

  it("queries packaging level options with unpaged request", async () => {
    const result: DataResult<PackagingLevelApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[MES] Query success",
      Attach: [packagingLevelDto],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(
      getPackagingLevelOptions({
        IsPaged: false,
        PageIndex: 1,
        PageSize: 1000,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
      body: {
        IsPaged: false,
        PageIndex: 1,
        PageSize: 1000,
      },
      signal: undefined,
    });
  });

  it("queries packaging level tree", async () => {
    const treeResult: DataResult<PackagingLevelTreeDto[]> = {
      Success: true,
      Code: "",
      Message: "[MES] Query success",
      Attach: [
        {
          Id: 1,
          LevelCode: "LV001",
          LevelName: "UNIT",
          ParentLevelCode: null,
          ParentLevelName: null,
          Description: "Smallest packaging unit",
          Children: [],
        },
      ],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: treeResult,
    }));

    setMesTransportForTests(transport);

    await expect(getPackagingLevelTree()).resolves.toEqual(treeResult);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/GetPackagingLevelTree",
      body: undefined,
      signal: undefined,
    });
  });

  it("creates a packaging level", async () => {
    const result: DataResult<PackagingLevelApiDto> = {
      Success: true,
      Code: "",
      Message: "[MES] Save success",
      Attach: packagingLevelDto,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(
      createPackagingLevel({
        levelCode: "LV001",
        levelName: "UNIT",
        parentLevelCode: "",
        description: "Smallest packaging unit",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/StorePackagingLevelData",
      body: {
        LevelCode: "LV001",
        LevelName: "UNIT",
        ParentLevelCode: "",
        ParentLevelName: "",
        Description: "Smallest packaging unit",
        Remark: "",
      },
      signal: undefined,
    });
  });

  it("updates a packaging level using NeedUpdateFields", async () => {
    const result: DataResult<null> = {
      Success: true,
      Code: "",
      Message: "[MES] Update success",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(
      updatePackagingLevel({
        id: 1,
        levelCode: "LV001",
        levelName: "BOX",
        parentLevelCode: "LV000",
        description: "Updated description",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/UpdatePackagingLevelData",
      body: {
        NeedUpdateFields: {
          Id: 1,
          LevelName: "BOX",
          ParentLevelCode: "LV000",
          ParentLevelName: "",
          Description: "Updated description",
        },
      },
      signal: undefined,
    });
  });

  it("deletes a single packaging level with the full dto", async () => {
    const result: DataResult<null> = {
      Success: true,
      Code: "",
      Message: "[MES] Delete success",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(deletePackagingLevel(packagingLevelDto)).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/RemovePackagingLevelData",
      body: packagingLevelDeletePayload,
      signal: undefined,
    });
  });

  it("deletes packaging levels in batch with full dto array", async () => {
    const result: DataResult<null> = {
      Success: true,
      Code: "",
      Message: "[MES] Delete success",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(deletePackagingLevels([packagingLevelDto])).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/RemoveBatchPackagingLevelDatas",
      body: [packagingLevelDeletePayload],
      signal: undefined,
    });
  });
});
