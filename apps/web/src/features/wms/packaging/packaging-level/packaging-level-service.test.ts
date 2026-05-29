import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
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
} from "@/features/wms/packaging/packaging-level/packaging-level-service";

const packagingLevelDto: PackagingLevelApiDto = {
  Id: 1,
  LevelCode: "LV001",
  LevelSequence: 1,
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
  LevelSequence: 1,
  LevelName: "UNIT",
  ParentLevelCode: null,
  ParentLevelName: null,
  Description: "Smallest packaging unit",
  Remark: "",
  CreationTime: "2026-05-25T10:00:00",
  LastModificationTime: null,
};

afterEach(() => {
  resetWmsTransportForTests();
});

describe("packaging level service", () => {
  it("queries packaging levels with pagination and filters", async () => {
    const result: DataResult<PackagingLevelApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [packagingLevelDto],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

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
      Message: "[WMS] Query success",
      Attach: [packagingLevelDto],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

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
      Message: "[WMS] Query success",
      Attach: [
        {
          Id: 1,
          LevelCode: "LV001",
          LevelSequence: 1,
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

    setWmsTransportForTests(transport);

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
      Message: "[WMS] Save success",
      Attach: packagingLevelDto,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

    await expect(
      createPackagingLevel({
        levelCode: "LV001",
        levelSequence: "1",
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
        LevelSequence: 1,
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
      Message: "[WMS] Update success",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

    await expect(
      updatePackagingLevel({
        id: 1,
        levelCode: "LV001",
        levelSequence: "2",
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
          LevelSequence: 2,
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
      Message: "[WMS] Delete success",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

    await expect(deletePackagingLevel(packagingLevelDto)).resolves.toEqual(result);

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
      Message: "[WMS] Delete success",
      Attach: null,
      SkipCount: 0,
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

    await expect(deletePackagingLevels([packagingLevelDto])).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingLevelApi/RemoveBatchPackagingLevelDatas",
      body: [packagingLevelDeletePayload],
      signal: undefined,
    });
  });
});
