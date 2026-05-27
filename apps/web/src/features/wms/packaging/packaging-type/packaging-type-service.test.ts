import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  createPackagingType,
  deletePackagingType,
  deletePackagingTypes,
  getPackagingTypes,
  updatePackagingType,
  type PackagingTypeApiDto,
} from "@/features/wms/packaging/packaging-type/packaging-type-service";

const packagingTypeDto: PackagingTypeApiDto = {
  Id: 1,
  TypeCode: "PKG_TYPE_001",
  TypeName: "纸箱",
  IsRecyclable: false,
  Description: "瓦楞纸箱",
  Remark: "",
  CompanyCode: "00000",
  FactoryCode: "00000.00001",
  CreationTime: "2026-05-25T10:00:00",
  LastModificationTime: null,
};

const packagingTypeDeletePayload = {
  Id: 1,
  TypeCode: "PKG_TYPE_001",
  TypeName: "纸箱",
  IsRecyclable: false,
  Description: "瓦楞纸箱",
  Remark: "",
  CreationTime: "2026-05-25T10:00:00",
  LastModificationTime: null,
};

afterEach(() => {
  resetWmsTransportForTests();
});

describe("packaging type service", () => {
  it("queries packaging types with pagination and filters", async () => {
    const result: DataResult<PackagingTypeApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[MOM] 获取数据成功！",
      Attach: [packagingTypeDto],
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
      getPackagingTypes({
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        TypeCode: "PKG",
        TypeName: "箱",
        IsRecyclable: true,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        TypeCode: "PKG",
        TypeName: "箱",
        IsRecyclable: true,
      },
      signal: undefined,
    });
  });

  it("creates a packaging type", async () => {
    const result: DataResult<PackagingTypeApiDto> = {
      Success: true,
      Code: "",
      Message: "[MOM] 保存数据成功！",
      Attach: packagingTypeDto,
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
      createPackagingType({
        typeCode: "PKG_TYPE_001",
        typeName: "纸箱",
        isRecyclable: false,
        description: "瓦楞纸箱",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingTypeApi/StorePackagingTypeData",
      body: {
        TypeCode: "PKG_TYPE_001",
        TypeName: "纸箱",
        IsRecyclable: false,
        Description: "瓦楞纸箱",
        Remark: "",
      },
      signal: undefined,
    });
  });

  it("updates a packaging type using NeedUpdateFields", async () => {
    const result: DataResult<null> = {
      Success: true,
      Code: "",
      Message: "[MOM] 修改数据成功！",
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
      updatePackagingType({
        id: 1,
        typeName: "循环箱",
        isRecyclable: true,
        description: "可循环使用",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingTypeApi/UpdatePackagingTypeData",
      body: {
        NeedUpdateFields: {
          Id: 1,
          TypeName: "循环箱",
          IsRecyclable: true,
          Description: "可循环使用",
        },
      },
      signal: undefined,
    });
  });

  it("deletes a single packaging type with the full dto", async () => {
    const result: DataResult<null> = {
      Success: true,
      Code: "",
      Message: "[MOM] 删除数据成功！",
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

    await expect(deletePackagingType(packagingTypeDto)).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingTypeApi/RemovePackagingTypeData",
      body: packagingTypeDeletePayload,
      signal: undefined,
    });
  });

  it("deletes packaging types in batch with full dto array", async () => {
    const result: DataResult<null> = {
      Success: true,
      Code: "",
      Message: "[MOM] 删除数据成功！",
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

    await expect(deletePackagingTypes([packagingTypeDto])).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingTypeApi/RemoveBatchPackagingTypeDatas",
      body: [packagingTypeDeletePayload],
      signal: undefined,
    });
  });
});
