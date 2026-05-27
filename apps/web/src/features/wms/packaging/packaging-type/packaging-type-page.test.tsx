import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exportRowsToExcel } = vi.hoisted(() => ({
  exportRowsToExcel: vi.fn(),
}));

vi.mock("@/components/data-export", async () => {
  const actual = await vi.importActual<typeof import("@/components/data-export")>(
    "@/components/data-export",
  );

  return {
    ...actual,
    exportRowsToExcel,
  };
});

import { App } from "@/root-app";
import type { Transport, TransportResponse } from "@/lib/api/http-client";
import { i18n } from "@/i18n/config";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
import { setNavigatorLanguage } from "@/test/setup";

const listResult = {
  Success: true,
  Code: "",
  Message: "[MOM] 获取数据成功！",
  Attach: [
    {
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
    },
  ],
  SkipCount: 0,
  TotalCount: 1,
  Record: 1,
};

function createStatefulPackagingTypeTransport() {
  let rows = [
    {
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
    },
    {
      Id: 2,
      TypeCode: "PKG_TYPE_002",
      TypeName: "托盘",
      IsRecyclable: true,
      Description: "木制托盘",
      Remark: "",
      CompanyCode: "00000",
      FactoryCode: "00000.00001",
      CreationTime: "2026-05-25T10:00:00",
      LastModificationTime: null,
    },
  ];

  return vi.fn<Transport>(async ({ path, body }) => {
    if (path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas") {
      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MOM] 获取数据成功！",
          Attach: rows,
          SkipCount: 0,
          TotalCount: rows.length,
          Record: rows.length,
        },
      };
    }

    if (path === "/PackagingTypeApi/StorePackagingTypeData") {
      const payload = body as {
        TypeCode: string;
        TypeName: string;
        IsRecyclable: boolean;
        Description: string;
      };
      const created = {
        Id: rows.length + 1,
        TypeCode: payload.TypeCode,
        TypeName: payload.TypeName,
        IsRecyclable: payload.IsRecyclable,
        Description: payload.Description,
        Remark: "",
        CompanyCode: "00000",
        FactoryCode: "00000.00001",
        CreationTime: "2026-05-25T10:00:00",
        LastModificationTime: null,
      };

      rows = [...rows, created];

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MOM] 保存数据成功！",
          Attach: created,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    if (path === "/PackagingTypeApi/UpdatePackagingTypeData") {
      const payload = body as {
        NeedUpdateFields: {
          Id: number;
          TypeName: string;
          IsRecyclable: boolean;
          Description: string;
        };
      };

      rows = rows.map((row) =>
        row.Id === payload.NeedUpdateFields.Id
          ? {
              ...row,
              TypeName: payload.NeedUpdateFields.TypeName,
              IsRecyclable: payload.NeedUpdateFields.IsRecyclable,
              Description: payload.NeedUpdateFields.Description,
            }
          : row,
      );

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MOM] 修改数据成功！",
          Attach: null,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    if (path === "/PackagingTypeApi/RemovePackagingTypeData") {
      const payload = body as { Id: number };
      rows = rows.filter((row) => row.Id !== payload.Id);

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MOM] 删除数据成功！",
          Attach: null,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    if (path === "/PackagingTypeApi/RemoveBatchPackagingTypeDatas") {
      const payload = body as Array<{ Id: number }>;
      const ids = new Set(payload.map((item) => item.Id));
      rows = rows.filter((row) => !ids.has(row.Id));

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MOM] 删除数据成功！",
          Attach: null,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    return {
      status: 404,
      data: { message: `Unhandled path: ${path}` },
    };
  });
}

describe("PackagingTypePage", () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("accessToken", "access-1");
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
    resetWmsTransportForTests();
    exportRowsToExcel.mockReset();
  });

  it("shows a loading state while the packaging type request is pending", async () => {
    let resolveRequest!: (response: TransportResponse) => void;

    const transport: Transport = () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      });

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    expect(await screen.findByText("正在加载包装类型数据。"))
      .toBeInTheDocument();

    resolveRequest({
      status: 200,
      data: listResult,
    });

    expect(await screen.findByText("PKG_TYPE_001")).toBeInTheDocument();
  });

  it("shows an empty state when no packaging types are returned", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: {
        ...listResult,
        Attach: [],
        TotalCount: 0,
        Record: 0,
      },
    }));

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    expect(await screen.findByText("暂无包装类型数据")).toBeInTheDocument();
  });

  it("shows an error notification when the packaging type request fails", async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({
        status: 503,
        data: {
          message: "包装类型服务暂时不可用",
        },
      });

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    expect(await screen.findByText("暂时无法加载包装类型列表")).toBeInTheDocument();
    expect(screen.getByText("暂无包装类型数据")).toBeInTheDocument();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("re-fetches packaging types when submitting the same filters after an error", async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({
        status: 503,
        data: {
          message: "包装类型服务暂时不可用",
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: listResult,
      });

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    expect(await screen.findByText("暂时无法加载包装类型列表")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByText("PKG_TYPE_001")).toBeInTheDocument();
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("shows the WMS client configuration error when the base URL is missing", async () => {
    vi.stubEnv("VITE_WMS_API_BASE_URL", "");
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    expect(await screen.findByText("暂时无法加载包装类型列表")).toBeInTheDocument();
    expect(
      await screen.findByText("VITE_WMS_API_BASE_URL is not configured"),
    ).toBeInTheDocument();
  });

  it("renders the packaging type filters and table data", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: listResult,
    }));

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    expect(await screen.findByRole("button", { name: "新增类型" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查询" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置" })).toBeInTheDocument();
    expect(screen.getAllByText("类型编码").length).toBeGreaterThan(0);
    expect(screen.getAllByText("类型名称").length).toBeGreaterThan(0);
    expect(screen.getAllByText("循环包装").length).toBeGreaterThan(0);
    expect(await screen.findByText("纸箱")).toBeInTheDocument();
    expect(screen.getByText("瓦楞纸箱")).toBeInTheDocument();
  });

  it("creates and edits a packaging type", async () => {
    const transport = createStatefulPackagingTypeTransport();

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    await screen.findByText("纸箱");

    fireEvent.click(screen.getByRole("button", { name: "新增类型" }));

    const createDialog = await screen.findByRole("dialog");

    fireEvent.change(within(createDialog).getByLabelText("类型编码"), {
      target: { value: "PKG_TYPE_003" },
    });
    fireEvent.change(within(createDialog).getByLabelText("类型名称"), {
      target: { value: "周转箱" },
    });
    fireEvent.click(within(createDialog).getByLabelText("循环包装"));
    fireEvent.change(within(createDialog).getByLabelText("描述"), {
      target: { value: "塑料周转箱" },
    });
    fireEvent.click(within(createDialog).getByRole("button", { name: "确认" }));

    expect(await screen.findByText("周转箱")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "编辑" })[0]);

    const editDialog = await screen.findByRole("dialog");

    fireEvent.change(within(editDialog).getByLabelText("类型名称"), {
      target: { value: "加固纸箱" },
    });
    fireEvent.change(within(editDialog).getByLabelText("描述"), {
      target: { value: "双层瓦楞纸箱" },
    });
    fireEvent.click(within(editDialog).getByRole("button", { name: "确认" }));

    expect(await screen.findByText("加固纸箱")).toBeInTheDocument();
    expect(screen.getByText("双层瓦楞纸箱")).toBeInTheDocument();
  });

  it("deletes a packaging type and supports batch delete", async () => {
    const transport = createStatefulPackagingTypeTransport();
    const confirmSpy = vi.spyOn(window, "confirm")
      .mockReturnValue(true);

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    await screen.findByText("纸箱");

    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]);

    expect(await screen.findByText("托盘")).toBeInTheDocument();
    expect(screen.queryByText("纸箱")).not.toBeInTheDocument();
    const singleDeleteRequest = transport.mock.calls
      .map(([request]) => request)
      .find((request) => request.path === "/PackagingTypeApi/RemovePackagingTypeData");

    expect(singleDeleteRequest?.body).not.toHaveProperty("CompanyCode");
    expect(singleDeleteRequest?.body).not.toHaveProperty("FactoryCode");

    const checkboxes = screen.getAllByRole("checkbox");

    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole("button", { name: "批量删除" }));

    expect(await screen.findByText("暂无包装类型数据")).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    const batchDeleteRequest = transport.mock.calls
      .map(([request]) => request)
      .find((request) => request.path === "/PackagingTypeApi/RemoveBatchPackagingTypeDatas");

    expect(batchDeleteRequest?.body).toEqual([
      expect.not.objectContaining({
        CompanyCode: expect.any(String),
        FactoryCode: expect.any(String),
      }),
    ]);

    confirmSpy.mockRestore();
  });

  it("exports the current page rows after selecting the current mode", async () => {
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: listResult,
    }));

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    await screen.findByText("纸箱");

    fireEvent.click(screen.getByRole("button", { name: "导出" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "当前" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "导出" }));

    await waitFor(() => {
      expect(exportRowsToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [
            expect.objectContaining({
              id: 1,
              typeCode: "PKG_TYPE_001",
              typeName: "纸箱",
            }),
          ],
        }),
      );
    });
  });

  it("exports only the selected current page rows", async () => {
    const transport = createStatefulPackagingTypeTransport();

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    await screen.findByText("纸箱");

    fireEvent.click(screen.getByRole("checkbox", { name: "选择 纸箱" }));
    fireEvent.click(screen.getByRole("button", { name: "导出" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "选中" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "导出" }));

    await waitFor(() => {
      expect(exportRowsToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [
            expect.objectContaining({
              id: 1,
              typeCode: "PKG_TYPE_001",
              typeName: "纸箱",
            }),
          ],
        }),
      );
    });
  });

  it("re-fetches all rows with the current filters when exporting all", async () => {
    const rows = [
      {
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
      },
      {
        Id: 2,
        TypeCode: "PKG_TYPE_002",
        TypeName: "托盘",
        IsRecyclable: false,
        Description: "木制托盘",
        Remark: "",
        CompanyCode: "00000",
        FactoryCode: "00000.00001",
        CreationTime: "2026-05-25T10:00:00",
        LastModificationTime: null,
      },
    ];
    let queryCallCount = 0;
    const transport = vi.fn<Transport>(async ({ path, body }) => {
      if (path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas") {
        queryCallCount += 1;
        const payload = body as {
          TypeCode?: string;
          IsRecyclable?: boolean;
          PageIndex: number;
          PageSize: number;
        };

        return {
          status: 200,
          data: {
            ...listResult,
            Attach: queryCallCount >= 3 || payload.PageSize === 2 ? rows : [rows[0]],
            TotalCount: queryCallCount >= 2 ? rows.length : 1,
            Record: queryCallCount >= 2 ? rows.length : 1,
          },
        };
      }

      return {
        status: 404,
        data: { message: `Unhandled path: ${path}` },
      };
    });

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    await screen.findByText("纸箱");

    fireEvent.change(screen.getByLabelText("类型编码"), {
      target: { value: "PKG_TYPE" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "循环包装" }), {
      target: { value: "false" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    await screen.findByText("共 2 项数据");

    fireEvent.click(screen.getByRole("button", { name: "导出" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "导出" }),
    );

    const listRequests = transport.mock.calls
      .map(([request]) => request)
      .filter((request) => request.path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas");

    expect(listRequests[2]?.body).toMatchObject({
      PageIndex: 1,
      PageSize: 2,
      TypeCode: "PKG_TYPE",
      IsRecyclable: false,
    });
    await waitFor(() => {
      expect(exportRowsToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 }),
          ],
        }),
      );
    });
  });

  it("blocks exporting all when the total count exceeds 5000", async () => {
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas") {
        return {
          status: 200,
          data: {
            ...listResult,
            TotalCount: 5001,
            Record: 5001,
          },
        };
      }

      return {
        status: 404,
        data: { message: `Unhandled path: ${path}` },
      };
    });

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-type"]} />);

    await screen.findByText("纸箱");

    fireEvent.click(screen.getByRole("button", { name: "导出" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "导出" }));

    expect(await screen.findByText("最多支持导出 5000 条数据")).toBeInTheDocument();
    expect(exportRowsToExcel).not.toHaveBeenCalled();

    const listRequests = transport.mock.calls
      .map(([request]) => request)
      .filter((request) => request.path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas");

    expect(listRequests).toHaveLength(1);
  });
});
