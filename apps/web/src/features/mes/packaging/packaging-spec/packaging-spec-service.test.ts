import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  createPackagingSpec,
  deletePackagingSpec,
  deletePackagingSpecs,
  getPackagingLevelOptions,
  getPackagingSpecList,
  getPackagingTypeOptions,
  updatePackagingSpec,
  type PackagingSpecApiDto,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-service";

const packagingSpecDto: PackagingSpecApiDto = {
  Id: 1,
  SpecCode: "SPEC-001",
  SpecName: "Regular Carton",
  PackagingTypeCode: "TYPE-001",
  PackagingTypeName: "Carton",
  PackagingLevelCode: "LEVEL-002",
  PackagingLevelName: "Box",
  BarcodeRuleCode: "BAR-001",
  BarcodeRuleName: "Default Barcode",
  Length: 60,
  Width: 40,
  Height: 30,
  Volume: 0.072,
  MaxWeight: 20,
  GrossWeight: 18,
  TareWeight: 2,
  StandardCapacity: 24,
  StackLimit: 8,
  Unit: "EA",
  IsEnabled: true,
  Remark: "",
  CompanyCode: "00000",
  FactoryCode: "00000.00001",
  CreationTime: "2026-05-29T09:00:00",
  LastModificationTime: null,
};

afterEach(() => {
  resetMesTransportForTests();
});

describe("packaging spec service", () => {
  it("queries packaging specs with pagination and filters", async () => {
    const result: DataResult<PackagingSpecApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[MES] Query success",
      Attach: [packagingSpecDto],
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
      getPackagingSpecList({
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        SpecCode: "SPEC",
        SpecName: "Carton",
        PackagingTypeCode: "TYPE-001",
        IsEnabled: true,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        SpecCode: "SPEC",
        SpecName: "Carton",
        PackagingTypeCode: "TYPE-001",
        IsEnabled: true,
      },
      signal: undefined,
    });
  });

  it("loads packaging type options with unpaged request", async () => {
    const result: DataResult<
      Array<{ Id: number; TypeCode: string; TypeName: string }>
    > = {
      Success: true,
      Code: "",
      Message: "[MES] Query success",
      Attach: [{ Id: 1, TypeCode: "TYPE-001", TypeName: "Carton" }],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(getPackagingTypeOptions()).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
      body: {
        IsPaged: false,
        PageIndex: 1,
        PageSize: 1000,
      },
      signal: undefined,
    });
  });

  it("loads packaging level options with unpaged request", async () => {
    const result: DataResult<
      Array<{ Id: number; LevelCode: string; LevelName: string }>
    > = {
      Success: true,
      Code: "",
      Message: "[MES] Query success",
      Attach: [{ Id: 1, LevelCode: "LEVEL-001", LevelName: "Unit" }],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(getPackagingLevelOptions()).resolves.toEqual(result);

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

  it("creates a packaging spec", async () => {
    const result: DataResult<PackagingSpecApiDto> = {
      Success: true,
      Code: "",
      Message: "[MES] Save success",
      Attach: packagingSpecDto,
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
      createPackagingSpec({
        specCode: "SPEC-001",
        specName: "Regular Carton",
        packagingTypeCode: "TYPE-001",
        packagingTypeName: "Carton",
        packagingLevelCode: "LEVEL-002",
        packagingLevelName: "Box",
        barcodeRuleCode: "BAR-001",
        barcodeRuleName: "Default Barcode",
        length: "60",
        width: "40",
        height: "30",
        volume: "0.072",
        maxWeight: "20",
        grossWeight: "18",
        tareWeight: "2",
        standardCapacity: "24",
        stackLimit: "8",
        unit: "EA",
        isEnabled: true,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingSpecApi/StorePackagingSpecData",
      body: {
        SpecCode: "SPEC-001",
        SpecName: "Regular Carton",
        PackagingTypeCode: "TYPE-001",
        PackagingTypeName: "Carton",
        PackagingLevelCode: "LEVEL-002",
        PackagingLevelName: "Box",
        BarcodeRuleCode: "BAR-001",
        BarcodeRuleName: "Default Barcode",
        Length: 60,
        Width: 40,
        Height: 30,
        Volume: 0.072,
        MaxWeight: 20,
        GrossWeight: 18,
        TareWeight: 2,
        StandardCapacity: 24,
        StackLimit: 8,
        Unit: "EA",
        IsEnabled: true,
        Remark: "",
      },
      signal: undefined,
    });
  });

  it("updates a packaging spec using NeedUpdateFields and keeps spec code immutable", async () => {
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
      updatePackagingSpec({
        id: 1,
        specCode: "SPEC-001",
        specName: "Updated Carton",
        packagingTypeCode: "TYPE-002",
        packagingTypeName: "Return Box",
        packagingLevelCode: "LEVEL-003",
        packagingLevelName: "Carton",
        barcodeRuleCode: "BAR-002",
        barcodeRuleName: "Secondary Barcode",
        length: "65",
        width: "45",
        height: "35",
        volume: "0.102375",
        maxWeight: "22",
        grossWeight: "19",
        tareWeight: "3",
        standardCapacity: "30",
        stackLimit: "9",
        unit: "EA",
        isEnabled: false,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingSpecApi/UpdatePackagingSpecData",
      body: {
        NeedUpdateFields: {
          Id: 1,
          SpecName: "Updated Carton",
          PackagingTypeCode: "TYPE-002",
          PackagingTypeName: "Return Box",
          PackagingLevelCode: "LEVEL-003",
          PackagingLevelName: "Carton",
          BarcodeRuleCode: "BAR-002",
          BarcodeRuleName: "Secondary Barcode",
          Length: 65,
          Width: 45,
          Height: 35,
          Volume: 0.102375,
          MaxWeight: 22,
          GrossWeight: 19,
          TareWeight: 3,
          StandardCapacity: 30,
          StackLimit: 9,
          Unit: "EA",
          IsEnabled: false,
        },
      },
      signal: undefined,
    });
  });

  it("deletes a single packaging spec without company and factory fields", async () => {
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

    await expect(deletePackagingSpec(packagingSpecDto)).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingSpecApi/RemovePackagingSpecData",
      body: {
        Id: 1,
        SpecCode: "SPEC-001",
        SpecName: "Regular Carton",
        PackagingTypeCode: "TYPE-001",
        PackagingTypeName: "Carton",
        PackagingLevelCode: "LEVEL-002",
        PackagingLevelName: "Box",
        BarcodeRuleCode: "BAR-001",
        BarcodeRuleName: "Default Barcode",
        Length: 60,
        Width: 40,
        Height: 30,
        Volume: 0.072,
        MaxWeight: 20,
        GrossWeight: 18,
        TareWeight: 2,
        StandardCapacity: 24,
        StackLimit: 8,
        Unit: "EA",
        IsEnabled: true,
        Remark: "",
        CreationTime: "2026-05-29T09:00:00",
        LastModificationTime: null,
      },
      signal: undefined,
    });
  });

  it("deletes packaging specs in batch", async () => {
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

    await expect(deletePackagingSpecs([packagingSpecDto])).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingSpecApi/RemoveBatchPackagingSpecDatas",
      body: [
        {
          Id: 1,
          SpecCode: "SPEC-001",
          SpecName: "Regular Carton",
          PackagingTypeCode: "TYPE-001",
          PackagingTypeName: "Carton",
          PackagingLevelCode: "LEVEL-002",
          PackagingLevelName: "Box",
          BarcodeRuleCode: "BAR-001",
          BarcodeRuleName: "Default Barcode",
          Length: 60,
          Width: 40,
          Height: 30,
          Volume: 0.072,
          MaxWeight: 20,
          GrossWeight: 18,
          TareWeight: 2,
          StandardCapacity: 24,
          StackLimit: 8,
          Unit: "EA",
          IsEnabled: true,
          Remark: "",
          CreationTime: "2026-05-29T09:00:00",
          LastModificationTime: null,
        },
      ],
      signal: undefined,
    });
  });
});
