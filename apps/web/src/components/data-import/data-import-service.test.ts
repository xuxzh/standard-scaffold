import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
import {
  cancelImportTask,
  dataImportWithProgress,
  downloadTemplateExcel,
  exportErrorExcelDatas,
  getMetadataDatas,
  storeMetaDatas,
} from "@/components/data-import/data-import-service";
import type {
  CancelRequestDto,
  CommonDataImportDto,
  DataImportQueryDto,
  DataImportRowData,
  DataImportTemplateMetadata,
  DataImportWithProgressResult,
  DownloadTemplateExcelQueryDto,
} from "@/components/data-import/data-import-contract";

afterEach(() => {
  resetMesTransportForTests();
  resetWmsTransportForTests();
  resetAppTransportForTests();
});

function createDataResult<T>(attach: T): DataResult<T> {
  return {
    Success: true,
    Code: "",
    Message: "[MES] 获取数据成功！",
    Attach: attach,
    SkipCount: 0,
    TotalCount: 0,
    Record: 0,
  };
}

describe("getMetadataDatas", () => {
  it("queries metadata via MES transport for MOM module", async () => {
    const metadata: DataImportTemplateMetadata[] = [
      {
        Id: "1",
        FieldName: "TypeCode",
        FieldDisplayName: "类型编码",
        IsUse: true,
        IsRequired: true,
        IsSystemRequired: true,
        SortId: 1,
      },
    ];
    const result = createDataResult(metadata);
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    const dto: DataImportQueryDto = {
      ModuleKey: "MOM",
      BusinessKey: "PackagingType",
    };

    await expect(getMetadataDatas(dto, "MOM")).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/DataImportApi/GetMetadataDatas",
      body: dto,
      signal: undefined,
    });
  });
});

describe("storeMetaDatas", () => {
  it("saves metadata with moduleKey and businessKey query string", async () => {
    const result = createDataResult<null>(null);
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    const payload: DataImportTemplateMetadata[] = [
      {
        Id: "1",
        FieldName: "TypeCode",
        FieldDisplayName: "类型编码",
        IsUse: true,
        IsRequired: true,
        IsSystemRequired: true,
        SortId: 1,
      },
    ];

    await expect(
      storeMetaDatas(payload, "MOM", "PackagingType"),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/TemplateManagementApi/StoreMetaDatas?moduleKey=MOM&businessKey=PackagingType",
      body: payload,
      signal: undefined,
    });
  });
});

describe("downloadTemplateExcel", () => {
  it("downloads template Excel via MES transport", async () => {
    const result = createDataResult<string>("BASE64CONTENT");
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    const dto: DownloadTemplateExcelQueryDto = {
      IsConfigureImportTemplateExcel: false,
      ModuleKey: "MOM",
      BusinessKey: "PackagingType",
      ErrorDatas: [],
    };

    await expect(downloadTemplateExcel(dto, "MOM")).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/DataImportApi/DownloadTemplateExcel",
      body: dto,
      signal: undefined,
    });
  });
});

describe("exportErrorExcelDatas", () => {
  it("exports error rows via MES transport", async () => {
    const errorRows: DataImportRowData[] = [
      { Success: false, Message: "类型编码重复" },
    ];
    const result = createDataResult<string>("BASE64ERR");
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(
      exportErrorExcelDatas(
        { ModuleKey: "MOM", BusinessKey: "PackagingType", ErrorDatas: errorRows },
        "MOM",
      ),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/DataImportApi/ExportErrorExcelDatas",
      body: {
        ModuleKey: "MOM",
        BusinessKey: "PackagingType",
        ErrorDatas: errorRows,
      },
      signal: undefined,
    });
  });
});

describe("dataImportWithProgress", () => {
  it("returns the raw result without throwing for Success=false", async () => {
    const payload: DataImportWithProgressResult<DataImportRowData> = {
      Success: false,
      Code: "IMPORT_PARTIAL",
      Message: "部分导入失败",
      Attach: {
        Status: "ImportFail",
        ErrorDatas: [{ Success: false, Message: "类型编码为空" }],
      },
      DataHeadFields: [],
      SkipCount: 0,
      TotalCount: 10,
      Record: 3,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: payload,
    }));

    setMesTransportForTests(transport);

    const dto: CommonDataImportDto = {
      ModuleKey: "MOM",
      BusinessKey: "PackagingType",
      FileStreamString: "BASE64",
    };

    await expect(dataImportWithProgress(dto, "MOM")).resolves.toEqual(payload);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/DataImportApi/DataImportWithProgress",
      body: dto,
      signal: undefined,
    });
  });
});

describe("cancelImportTask", () => {
  it("cancels the task by request id", async () => {
    const result = createDataResult<null>(null);
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    const dto: CancelRequestDto = { RequestId: "REQ-001" };

    await expect(cancelImportTask(dto, "MOM")).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/ImportTask/CancelTask",
      body: dto,
      signal: undefined,
    });
  });
});

describe("module client selection", () => {
  it("routes PlatformV2 protocol through MOM transport", async () => {
    const result = createDataResult<null>(null);
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));
    setMesTransportForTests(transport);

    await expect(
      storeMetaDatas([], "PlatformV2", "PackagingType", {
        serviceRoute: "MOM",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/TemplateManagementApi/StoreMetaDatas?moduleKey=PlatformV2&businessKey=PackagingType",
      body: [],
      signal: undefined,
    });
  });

  it("uses WMS client for WMS module", async () => {
    const result = createDataResult<null>(null);
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

    await expect(
      cancelImportTask({ RequestId: "REQ-002" }, "WMS"),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", path: "/ImportTask/CancelTask" }),
    );
  });

  it("uses App client for PlatformV2 module", async () => {
    const result = createDataResult<null>(null);
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setAppTransportForTests(transport);

    await expect(
      cancelImportTask({ RequestId: "REQ-003" }, "PlatformV2"),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", path: "/ImportTask/CancelTask" }),
    );
  });

  it("rejects IOT module with unsupported error", async () => {
    await expect(
      Promise.resolve().then(() =>
        cancelImportTask({ RequestId: "REQ-004" }, "IOT"),
      ),
    ).rejects.toThrow("Unsupported import module: IOT");
  });
});
