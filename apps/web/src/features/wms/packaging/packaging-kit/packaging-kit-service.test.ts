import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  createPackagingKit,
  deletePackagingKit,
  deletePackagingKits,
  getPackagingKitMaterialOptions,
  getPackagingKits,
  updatePackagingKit,
  type PackagingKitApiDto,
  type PackagingKitMaterialApiDto,
} from "@/features/wms/packaging/packaging-kit/packaging-kit-service";

const packagingKitDto: PackagingKitApiDto = {
  Id: 1,
  KitCode: "KIT001",
  KitName: "Starter Kit",
  MainMaterialCode: "MAT001",
  MainMaterialName: "Main Material",
  Unit: "set",
  IsVirtualMain: false,
  ChildCount: 2,
  Children: [
    {
      Code: "CH001",
      Name: "Child A",
      Quantity: 2,
      Unit: "pcs",
    },
    {
      Code: "CH002",
      Name: "Child B",
      Quantity: 1,
      Unit: "pcs",
    },
  ],
  Remark: "remark",
  CompanyCode: "RUIHUI",
  FactoryCode: "DEFAULT",
  CreationTime: "2026-05-29T10:00:00",
  LastModificationTime: null,
};

const materialDto: PackagingKitMaterialApiDto = {
  Id: 1,
  MaterialCode: "MAT001",
  MaterialName: "Main Material",
  Unit: "set",
  MaterialTypeName: "FG",
};

afterEach(() => {
  resetWmsTransportForTests();
});

describe("packaging kit service", () => {
  it("queries packaging kits with pagination and filters", async () => {
    const result: DataResult<PackagingKitApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [packagingKitDto],
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
      getPackagingKits({
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        KitCode: "KIT",
        KitName: "Starter",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingKitApi/GetPackagingKitAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        KitCode: "KIT",
        KitName: "Starter",
      },
      signal: undefined,
    });
  });

  it("queries material options", async () => {
    const result: DataResult<PackagingKitMaterialApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [materialDto],
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
      getPackagingKitMaterialOptions({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        MaterialCode: "MAT",
        MaterialName: "Main",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/Material/GetMaterialAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        MaterialCode: "MAT",
        MaterialName: "Main",
      },
      signal: undefined,
    });
  });

  it("creates a packaging kit", async () => {
    const result: DataResult<PackagingKitApiDto> = {
      Success: true,
      Code: "",
      Message: "[WMS] Save success",
      Attach: packagingKitDto,
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
      createPackagingKit({
        kitCode: "KIT001",
        kitName: "Starter Kit",
        mainMaterialCode: "MAT001",
        mainMaterialName: "Main Material",
        unit: "set",
        isVirtualMain: false,
        children: [
          { code: "CH001", name: "Child A", quantity: "2", unit: "pcs" },
        ],
        remark: "remark",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingKitApi/StorePackagingKitData",
      body: {
        KitCode: "KIT001",
        KitName: "Starter Kit",
        MainMaterialCode: "MAT001",
        MainMaterialName: "Main Material",
        Unit: "set",
        IsVirtualMain: false,
        Children: [
          { Code: "CH001", Name: "Child A", Quantity: 2, Unit: "pcs" },
        ],
        Remark: "remark",
      },
      signal: undefined,
    });
  });

  it("updates a packaging kit using NeedUpdateFields", async () => {
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
      updatePackagingKit({
        id: 1,
        kitCode: "KIT001",
        kitName: "Updated Kit",
        mainMaterialCode: "MAT002",
        mainMaterialName: "Updated Main",
        unit: "box",
        isVirtualMain: true,
        children: [
          { code: "CH003", name: "Child C", quantity: "3", unit: "pcs" },
        ],
        remark: "updated",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingKitApi/UpdatePackagingKitData",
      body: {
        NeedUpdateFields: {
          Id: 1,
          KitName: "Updated Kit",
          MainMaterialCode: "MAT002",
          MainMaterialName: "Updated Main",
          Unit: "box",
          IsVirtualMain: true,
          Children: [
            { Code: "CH003", Name: "Child C", Quantity: 3, Unit: "pcs" },
          ],
          Remark: "updated",
        },
      },
      signal: undefined,
    });
  });

  it("deletes a single packaging kit with company and factory removed", async () => {
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

    await expect(deletePackagingKit(packagingKitDto)).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingKitApi/RemovePackagingKitData",
      body: {
        Id: 1,
        KitCode: "KIT001",
        KitName: "Starter Kit",
        MainMaterialCode: "MAT001",
        MainMaterialName: "Main Material",
        Unit: "set",
        IsVirtualMain: false,
        ChildCount: 2,
        Children: packagingKitDto.Children,
        Remark: "remark",
        CreationTime: "2026-05-29T10:00:00",
        LastModificationTime: null,
      },
      signal: undefined,
    });
  });

  it("deletes multiple packaging kits with company and factory removed", async () => {
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

    await expect(deletePackagingKits([packagingKitDto])).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingKitApi/RemoveBatchPackagingKitDatas",
      body: [
        {
          Id: 1,
          KitCode: "KIT001",
          KitName: "Starter Kit",
          MainMaterialCode: "MAT001",
          MainMaterialName: "Main Material",
          Unit: "set",
          IsVirtualMain: false,
          ChildCount: 2,
          Children: packagingKitDto.Children,
          Remark: "remark",
          CreationTime: "2026-05-29T10:00:00",
          LastModificationTime: null,
        },
      ],
      signal: undefined,
    });
  });

  it("rejects malformed child quantity strings before sending create requests", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: {
        Success: true,
        Code: "",
        Message: "[WMS] Save success",
        Attach: packagingKitDto,
        SkipCount: 0,
        TotalCount: 0,
        Record: 0,
      },
    }));

    setWmsTransportForTests(transport);

    expect(() =>
      createPackagingKit({
        kitCode: "KIT001",
        kitName: "Starter Kit",
        mainMaterialCode: "MAT001",
        mainMaterialName: "Main Material",
        unit: "set",
        isVirtualMain: false,
        children: [
          { code: "CH001", name: "Child A", quantity: "1e2", unit: "pcs" },
        ],
        remark: "remark",
      }),
    ).toThrow(/quantity/i);

    expect(transport).not.toHaveBeenCalled();
  });
});
