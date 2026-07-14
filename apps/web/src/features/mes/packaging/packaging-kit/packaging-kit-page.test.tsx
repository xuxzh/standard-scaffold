import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/root-app";
import { i18n } from "@/i18n/config";
import type { Transport } from "@/lib/api/http-client";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import { packagingKitMaterialPageSize } from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import { packagingKitMaterialOptionsQueryKey as buildPackagingKitMaterialOptionsQueryKey } from "@/features/mes/packaging/packaging-kit/packaging-kit-queries";
import { setNavigatorLanguage } from "@/test/setup";

const { notifyError, notifyApiSuccess, notifySuccess } = vi.hoisted(() => ({
  notifyError: vi.fn(),
  notifyApiSuccess: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/lib/notify", async () => {
  const actual = await vi.importActual<typeof import("@/lib/notify")>(
    "@/lib/notify",
  );

  return {
    notify: {
      success: (...args: Parameters<typeof actual.notify.success>) => {
        notifySuccess(...args);
        return actual.notify.success(...args);
      },
      error: (...args: Parameters<typeof actual.notify.error>) => {
        notifyError(...args);
        return actual.notify.error(...args);
      },
      apiSuccess: (...args: Parameters<typeof actual.notify.apiSuccess>) => {
        notifyApiSuccess(...args);
        return actual.notify.apiSuccess(...args);
      },
      fromHttpClientError: (
        ...args: Parameters<typeof actual.notify.fromHttpClientError>
      ) => {
        notifyError(args[1] ?? "");
        return actual.notify.fromHttpClientError(...args);
      },
    },
  };
});

type KitRow = {
  Id: number;
  KitCode: string;
  KitName: string;
  MainMaterialCode: string;
  MainMaterialName: string;
  Unit: string;
  IsVirtualMain: boolean;
  ChildCount: number;
  Children: Array<{
    Code: string;
    Name: string;
    Quantity: number;
    Unit: string;
  }>;
  Remark: string;
  CompanyCode?: string;
  FactoryCode?: string;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
};

const baseRows: KitRow[] = [
  {
    Id: 1,
    KitCode: "KIT001",
    KitName: "Starter Kit",
    MainMaterialCode: "MAT001",
    MainMaterialName: "Main Material",
    Unit: "set",
    IsVirtualMain: false,
    ChildCount: 2,
    Children: [
      { Code: "MAT002", Name: "Accessory Material", Quantity: 2, Unit: "pcs" },
      { Code: "MAT003", Name: "Packaging Material", Quantity: 1, Unit: "box" },
    ],
    Remark: "starter",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T10:00:00",
    LastModificationTime: null,
  },
  {
    Id: 2,
    KitCode: "KIT002",
    KitName: "Virtual Kit",
    MainMaterialCode: "MAT004",
    MainMaterialName: "Virtual Main",
    Unit: "set",
    IsVirtualMain: true,
    ChildCount: 1,
    Children: [
      { Code: "MAT005", Name: "Virtual Child", Quantity: 3, Unit: "pcs" },
    ],
    Remark: "virtual",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T10:00:00",
    LastModificationTime: null,
  },
];

const materialRows = [
  {
    Id: 1,
    MaterialCode: "MAT001",
    MaterialName: "Main Material",
    Unit: "set",
    MaterialTypeName: "FG",
  },
  {
    Id: 2,
    MaterialCode: "MAT002",
    MaterialName: "Accessory Material",
    Unit: "pcs",
    MaterialTypeName: "RM",
  },
  {
    Id: 3,
    MaterialCode: "MAT003",
    MaterialName: "Packaging Material",
    Unit: "box",
    MaterialTypeName: "PKG",
  },
  {
    Id: 4,
    MaterialCode: "MAT006",
    MaterialName: "Spare Material",
    Unit: "pcs",
    MaterialTypeName: "RM",
  },
];

const materialUnitRows = [
  { Id: 1, MaterialUnitCode: "set", MaterialUnitName: "套" },
  { Id: 2, MaterialUnitCode: "pcs", MaterialUnitName: "件" },
  { Id: 3, MaterialUnitCode: "box", MaterialUnitName: "箱" },
];

function createMaterialResult(
  rows: typeof materialRows,
  totalCount = rows.length,
) {
  return {
    Success: true,
    Code: "",
    Message: "[MES] Query success",
    Attach: rows,
    SkipCount: 0,
    TotalCount: totalCount,
    Record: rows.length,
  };
}

function createListResult(rows: KitRow[], totalCount = rows.length) {
  return {
    Success: true,
    Code: "",
    Message: "[MES] Query success",
    Attach: rows,
    SkipCount: 0,
    TotalCount: totalCount,
    Record: rows.length,
  };
}

async function selectMainMaterial(materialCode = "MAT001") {
  fireEvent.click(screen.getByRole("button", { name: "选择物料" }));
  const materialRow = await screen.findByRole("row", {
    name: new RegExp(materialCode),
  });
  fireEvent.click(within(materialRow).getByRole("button", { name: "选择" }));
}

function createMaterialUnitResult(rows = materialUnitRows) {
  return {
    Success: true,
    Code: "",
    Message: "[MES] Query success",
    Attach: rows,
    SkipCount: 0,
    TotalCount: rows.length,
    Record: rows.length,
  };
}

function createStatefulPackagingKitTransport(seedRows: KitRow[] = baseRows) {
  let rows = structuredClone(seedRows) as KitRow[];

  return vi.fn<Transport>(async ({ path, body }) => {
    if (path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas") {
      const payload = body as {
        KitCode?: string;
        KitName?: string;
        PageIndex: number;
        PageSize: number;
      };
      const filtered = rows.filter(
        (row) =>
          (!payload.KitCode || row.KitCode.includes(payload.KitCode)) &&
          (!payload.KitName || row.KitName.includes(payload.KitName)),
      );
      const startIndex = (payload.PageIndex - 1) * payload.PageSize;
      const pageRows = filtered.slice(
        startIndex,
        startIndex + payload.PageSize,
      );

      return {
        status: 200,
        data: createListResult(pageRows, filtered.length),
      };
    }

    if (path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
      const payload = body as {
        MaterialCode?: string;
        MaterialName?: string;
        PageIndex: number;
        PageSize: number;
      };
      const filtered = materialRows.filter(
        (row) =>
          (!payload.MaterialCode ||
            row.MaterialCode.includes(payload.MaterialCode)) &&
          (!payload.MaterialName ||
            row.MaterialName.includes(payload.MaterialName)),
      );
      const startIndex = (payload.PageIndex - 1) * payload.PageSize;
      const pageRows = filtered.slice(
        startIndex,
        startIndex + payload.PageSize,
      );

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: pageRows,
          SkipCount: 0,
          TotalCount: filtered.length,
          Record: pageRows.length,
        },
      };
    }

    if (path === "/MaterialInfoApi/GetMaterialUnitAutoQueryDatas") {
      return {
        status: 200,
        data: createMaterialUnitResult(),
      };
    }

    if (path === "/PackagingKitApi/StorePackagingKitData") {
      const payload = body as {
        KitCode: string;
        KitName: string;
        MainMaterialCode: string;
        MainMaterialName: string;
        Unit: string;
        IsVirtualMain: boolean;
        Children: KitRow["Children"];
        Remark: string;
      };
      const created: KitRow = {
        Id: Math.max(...rows.map((row) => row.Id), 0) + 1,
        KitCode: payload.KitCode,
        KitName: payload.KitName,
        MainMaterialCode: payload.MainMaterialCode,
        MainMaterialName: payload.MainMaterialName,
        Unit: payload.Unit,
        IsVirtualMain: payload.IsVirtualMain,
        ChildCount: payload.Children.length,
        Children: payload.Children,
        Remark: payload.Remark,
        CompanyCode: "RUIHUI",
        FactoryCode: "DEFAULT",
        CreationTime: "2026-05-29T10:00:00",
        LastModificationTime: null,
      };

      rows = [created, ...rows];

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Save success",
          Attach: created,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    if (path === "/PackagingKitApi/UpdatePackagingKitData") {
      const payload = body as {
        NeedUpdateFields: {
          Id: number;
          KitName: string;
          MainMaterialCode: string;
          MainMaterialName: string;
          Unit: string;
          IsVirtualMain: boolean;
          Children: KitRow["Children"];
          Remark: string;
        };
      };

      rows = rows.map((row) =>
        row.Id === payload.NeedUpdateFields.Id
          ? {
              ...row,
              KitName: payload.NeedUpdateFields.KitName,
              MainMaterialCode: payload.NeedUpdateFields.MainMaterialCode,
              MainMaterialName: payload.NeedUpdateFields.MainMaterialName,
              Unit: payload.NeedUpdateFields.Unit,
              IsVirtualMain: payload.NeedUpdateFields.IsVirtualMain,
              Children: payload.NeedUpdateFields.Children,
              ChildCount: payload.NeedUpdateFields.Children.length,
              Remark: payload.NeedUpdateFields.Remark,
            }
          : row,
      );

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Update success",
          Attach: null,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    if (path === "/PackagingKitApi/RemovePackagingKitData") {
      const payload = body as { Id: number };
      rows = rows.filter((row) => row.Id !== payload.Id);

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Delete success",
          Attach: null,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    if (path === "/PackagingKitApi/RemoveBatchPackagingKitDatas") {
      const payload = body as Array<{ Id: number }>;
      const ids = new Set(payload.map((item) => item.Id));
      rows = rows.filter((row) => !ids.has(row.Id));

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Delete success",
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

describe("PackagingKitPage", () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("accessToken", "access-1");
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
    resetMesTransportForTests();
    resetMesTransportForTests();
    vi.restoreAllMocks();
    notifyError.mockReset();
    notifyApiSuccess.mockReset();
    notifySuccess.mockReset();
  });

  it("shows loading state while the packaging kit request is pending", async () => {
    let resolveRequest!: (value: Awaited<ReturnType<Transport>>) => void;

    const transport: Transport = ({ path }) => {
      if (path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
        return Promise.resolve({
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Query success",
            Attach: materialRows,
            SkipCount: 0,
            TotalCount: materialRows.length,
            Record: materialRows.length,
          },
        });
      }

      if (typeof resolveRequest === "function") {
        return Promise.resolve({
          status: 200,
          data: createListResult(baseRows),
        });
      }

      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    };

    setMesTransportForTests(transport);
    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    expect(await screen.findByText("正在加载套包数据。")).toBeInTheDocument();

    resolveRequest({
      status: 200,
      data: createListResult(baseRows),
    });

    expect(
      await screen.findByTestId("packaging-kit-edit-KIT001"),
    ).toBeInTheDocument();
  });

  it("uses different material option query keys for main and children dialogs", () => {
    const filters = {
      materialCode: "MAT",
      materialName: "Main",
    };

    expect(
      buildPackagingKitMaterialOptionsQueryKey(filters, 1, "main"),
    ).not.toEqual(
      buildPackagingKitMaterialOptionsQueryKey(filters, 1, "children"),
    );
  });

  it("shows empty and error states for packaging kit list", async () => {
    let listRequestCount = 0;
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas") {
        listRequestCount += 1;

        if (listRequestCount === 1) {
          return {
            status: 200,
            data: createListResult([], 0),
          };
        }

        return {
          status: 503,
          data: {
            message: "Packaging kit service unavailable",
          },
        };
      }

      return {
        status: 200,
        data: createMaterialUnitResult(),
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    expect(
      await screen.findByText("暂无套包数据"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "重试" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("暂无套包数据"),
      ).toBeInTheDocument();
    });
  });

  it("renders translated packaging kit actions instead of raw i18n keys in both locales", async () => {
    setMesTransportForTests(createStatefulPackagingKitTransport());

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    expect(
      await screen.findByRole("button", { name: "查询" }),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole("button", { name: "编辑" })).toHaveLength(
      2,
    );
    expect(
      screen.queryByText("pages.packagingKit.actions.search"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("pages.packagingKit.actions.viewChildren"),
    ).not.toBeInTheDocument();

    await i18n.changeLanguage("en-US");
    setNavigatorLanguage("en-US");

    expect(
      await screen.findByRole("button", { name: "Search" }),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole("button", { name: "Edit" })).toHaveLength(
      2,
    );
    expect(
      screen.queryByText("pages.packagingKit.actions.search"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("pages.packagingKit.actions.viewChildren"),
    ).not.toBeInTheDocument();
  });

  it("expands a packaging kit row to show child records inline", async () => {
    setMesTransportForTests(createStatefulPackagingKitTransport());

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    expect(await screen.findByText("Starter Kit")).toBeInTheDocument();
    expect(screen.queryByText("Accessory Material")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开 KIT001" }));

    const expandedRow = await screen.findByTestId(
      "packaging-kit-children-KIT001",
    );
    const scrollContainer = within(expandedRow).getByTestId(
      "packaging-kit-children-scroll-KIT001",
    );

    expect(
      within(expandedRow).getByRole("columnheader", { name: "子件编码" }),
    ).toBeInTheDocument();
    expect(scrollContainer.className).toContain("overflow-x-auto");
    expect(
      within(expandedRow).getByText("Accessory Material"),
    ).toBeInTheDocument();
    expect(
      within(expandedRow).getByText("Packaging Material"),
    ).toBeInTheDocument();
  });

  it("renders packaging kits, submits filters, and shows child details", async () => {
    const transport = createStatefulPackagingKitTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    expect(
      await screen.findByRole("button", { name: "新增套包" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查询" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置" })).toBeInTheDocument();
    expect(await screen.findByText("Starter Kit")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("套包编码"), {
      target: { value: "KIT002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByText("Virtual Kit")).toBeInTheDocument();

    const listRequests = transport.mock.calls
      .map(([request]) => request)
      .filter(
        (request) =>
          request.path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas",
      );

    expect(listRequests.at(-1)?.body).toMatchObject({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
      KitCode: "KIT002",
    });

    fireEvent.click(screen.getByRole("button", { name: "展开 KIT002" }));

    expect(
      await screen.findByTestId("packaging-kit-children-KIT002"),
    ).toBeInTheDocument();
    expect(screen.getByText("Virtual Child")).toBeInTheDocument();
  });

  it("keeps packaging kit overflow inside the table body scroll area", async () => {
    setMesTransportForTests(createStatefulPackagingKitTransport());

    const { container } = render(
      <App initialEntries={["/packaging/packaging-kit"]} />,
    );

    await screen.findByText("Starter Kit");

    expect(screen.getByTestId("admin-shell")).toHaveClass(
      "min-h-0",
      "overflow-hidden",
    );
    expect(container.querySelector("section")).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-hidden",
    );
    expect(
      container.querySelector('[data-slot="data-table-scroll-area"]'),
    ).toHaveClass("min-h-0", "overflow-auto");
    expect(
      container.querySelector('[data-slot="data-table-scroll-area"]')
        ?.parentElement,
    ).toHaveClass("flex-1");
  });

  it("shows material dialog loading and search states", async () => {
    let resolveMaterialRequest!: (
      value: Awaited<ReturnType<Transport>>,
    ) => void;
    const transport = vi.fn<Transport>(async ({ path, body }) => {
      if (path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(baseRows),
        };
      }

      if (path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
        const payload = body as {
          MaterialName?: string;
          PageIndex: number;
          PageSize: number;
        };

        if (!payload.MaterialName) {
          return await new Promise((resolve) => {
            resolveMaterialRequest = resolve;
          });
        }

        const filtered = materialRows.filter((row) =>
          row.MaterialName.includes(payload.MaterialName ?? ""),
        );

        return {
          status: 200,
          data: createMaterialResult(filtered, filtered.length),
        };
      }

      return {
        status: 404,
        data: { message: `Unhandled path: ${path}` },
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));
    await screen.findByTestId("packaging-kit-form-dialog");

    fireEvent.click(screen.getByRole("button", { name: "选择物料" }));

    expect(await screen.findByText("正在加载物料数据。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择" })).not.toBeInTheDocument();

    resolveMaterialRequest({
      status: 200,
      data: createMaterialResult(materialRows, materialRows.length),
    });

    expect(await screen.findByRole("cell", { name: "MAT001" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("物料名称"), {
      target: { value: "Spare" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByText("Spare Material")).toBeInTheDocument();

    const materialRequests = transport.mock.calls
      .map(([request]) => request)
      .filter(
        (request) => request.path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
      );

    expect(materialRequests.at(-1)?.body).toMatchObject({
      IsPaged: true,
      PageIndex: 1,
      PageSize: packagingKitMaterialPageSize,
      MaterialName: "Spare",
    });
    expect(materialRequests.at(-1)?.body).not.toHaveProperty("CompanyCode");
    expect(materialRequests.at(-1)?.body).not.toHaveProperty("FactoryCode");
  });

  it("shows material dialog empty, error, and retry flows", async () => {
    let materialAttempt = 0;
    const transport = vi.fn<Transport>(async ({ path, body }) => {
      if (path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(baseRows),
        };
      }

      if (path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
        const payload = body as { MaterialName?: string };

        if (!payload.MaterialName) {
          return {
            status: 200,
            data: createMaterialResult([], 0),
          };
        }

        materialAttempt += 1;

        if (materialAttempt === 1) {
          return {
            status: 503,
            data: { message: "Material query unavailable" },
          };
        }

        return {
          status: 200,
          data: createMaterialResult(materialRows.slice(0, 1), 1),
        };
      }

      return {
        status: 404,
        data: { message: `Unhandled path: ${path}` },
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));
    await screen.findByTestId("packaging-kit-form-dialog");

    fireEvent.click(screen.getByRole("button", { name: "选择物料" }));

    expect(await screen.findByText("暂无物料数据")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("物料名称"), {
      target: { value: "Main" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByText("暂时无法加载物料列表")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByText("Main Material")).toBeInTheDocument();
  });

  it("creates and edits a packaging kit with material selection", async () => {
    const transport = createStatefulPackagingKitTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));

    expect(
      await screen.findByTestId("packaging-kit-form-dialog"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-code"), {
      target: { value: "KIT010" },
    });
    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-name"), {
      target: { value: "Created Kit" },
    });
    fireEvent.click(screen.getByTestId("packaging-kit-form-virtual-main"));

    await selectMainMaterial();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Main Material")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("textbox", { name: "主件物料编码" }),
    ).toHaveValue("MAT001");
    expect(screen.getByRole("combobox", { name: "单位" })).toHaveTextContent(
      "set-套",
    );

    fireEvent.click(screen.getByTestId("packaging-kit-form-add-children"));
    expect(
      await screen.findByTestId("packaging-kit-material-dialog"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("packaging-kit-material-select-MAT002"));
    fireEvent.click(screen.getByTestId("packaging-kit-material-select-MAT003"));
    fireEvent.click(screen.getByTestId("packaging-kit-material-confirm"));

    await waitFor(() => {
      expect(
        within(
          screen.getByTestId("packaging-kit-form-dialog"),
        ).getAllByPlaceholderText("请输入数量"),
      ).toHaveLength(2);
    });

    fireEvent.change(
      screen.getByTestId("packaging-kit-form-child-quantity-MAT002"),
      {
        target: { value: "2" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-kit-form-submit"));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/PackagingKitApi/StorePackagingKitData",
          body: expect.objectContaining({
            KitCode: "KIT010",
            MainMaterialCode: "MAT001",
            IsVirtualMain: true,
            Children: expect.arrayContaining([
              expect.objectContaining({ Code: "MAT002", Quantity: 2 }),
              expect.objectContaining({ Code: "MAT003", Quantity: 1 }),
            ]),
          }),
        }),
      );
    });

    fireEvent.click(await screen.findByTestId("packaging-kit-edit-KIT001"));

    expect(await screen.findByDisplayValue("KIT001")).toBeDisabled();
    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-name"), {
      target: { value: "Starter Kit Updated" },
    });
    fireEvent.click(screen.getByTestId("packaging-kit-form-submit"));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/PackagingKitApi/UpdatePackagingKitData",
          body: expect.objectContaining({
            NeedUpdateFields: expect.objectContaining({
              Id: 1,
              KitName: "Starter Kit Updated",
            }),
          }),
        }),
      );
    });
  });

  it("keeps the current unit when the selected main material has no unit", async () => {
    const baseTransport = createStatefulPackagingKitTransport();
    const transport = vi.fn<Transport>(async (request) => {
      if (request.path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
        return {
          status: 200,
          data: createMaterialResult([
            {
              ...materialRows[0],
              Unit: "",
            },
          ]),
        };
      }

      return await baseTransport(request);
    });

    setMesTransportForTests(transport);
    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");
    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));

    expect(
      await screen.findByRole("combobox", { name: "单位" }),
    ).toHaveTextContent("set-套");

    await selectMainMaterial();

    expect(screen.getByRole("combobox", { name: "单位" })).toHaveTextContent(
      "set-套",
    );
  });

  it("defaults unit in create mode and shows a visible processing state while submitting", async () => {
    let resolveCreate!: (value: Awaited<ReturnType<Transport>>) => void;
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(baseRows),
        };
      }

      if (path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
        return {
          status: 200,
          data: createMaterialResult(materialRows, materialRows.length),
        };
      }

      if (path === "/MaterialInfoApi/GetMaterialUnitAutoQueryDatas") {
        return {
          status: 200,
          data: createMaterialUnitResult(),
        };
      }

      if (path === "/PackagingKitApi/StorePackagingKitData") {
        return await new Promise((resolve) => {
          resolveCreate = resolve;
        });
      }

      return {
        status: 404,
        data: { message: `Unhandled path: ${path}` },
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));

    expect(
      await screen.findByRole("combobox", { name: "单位" }),
    ).toHaveTextContent("set-套");

    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-code"), {
      target: { value: "KIT011" },
    });
    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-name"), {
      target: { value: "Pending Kit" },
    });

    await selectMainMaterial();

    fireEvent.click(screen.getByTestId("packaging-kit-form-add-children"));
    fireEvent.click(
      await screen.findByTestId("packaging-kit-material-select-MAT002"),
    );
    fireEvent.click(screen.getByTestId("packaging-kit-material-confirm"));

    fireEvent.click(screen.getByTestId("packaging-kit-form-submit"));

    expect(
      await screen.findByRole("button", { name: "提交中" }),
    ).toBeDisabled();

    resolveCreate({
      status: 200,
      data: createListResult([], 0),
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("packaging-kit-form-dialog"),
      ).not.toBeInTheDocument();
    });
  });

  it("handles child de-duplication, main-child validation, quantity validation, and child deletion", async () => {
    const transport = createStatefulPackagingKitTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));

    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-code"), {
      target: { value: "KIT012" },
    });
    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-name"), {
      target: { value: "Validation Kit" },
    });

    await selectMainMaterial();

    fireEvent.click(screen.getByTestId("packaging-kit-form-add-children"));
    fireEvent.click(
      await screen.findByTestId("packaging-kit-material-select-MAT001"),
    );
    fireEvent.click(screen.getByTestId("packaging-kit-material-select-MAT002"));
    fireEvent.click(screen.getByTestId("packaging-kit-material-confirm"));

    fireEvent.click(screen.getByTestId("packaging-kit-form-add-children"));
    fireEvent.click(
      await screen.findByTestId("packaging-kit-material-select-MAT002"),
    );
    fireEvent.click(screen.getByTestId("packaging-kit-material-select-MAT006"));
    fireEvent.click(screen.getByTestId("packaging-kit-material-confirm"));

    await waitFor(() => {
      expect(
        within(
          screen.getByTestId("packaging-kit-form-dialog"),
        ).getAllByPlaceholderText("请输入数量"),
      ).toHaveLength(3);
    });
    expect(
      screen.getAllByTestId("packaging-kit-form-child-quantity-MAT002"),
    ).toHaveLength(1);

    fireEvent.change(
      screen.getByTestId("packaging-kit-form-child-quantity-MAT002"),
      {
        target: { value: "0" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-kit-form-submit"));

    expect(
      await screen.findByText("子件不能与主件物料相同"),
    ).toBeInTheDocument();
    expect(screen.getByText("子件数量必须大于等于 1")).toBeInTheDocument();

    const mainChildRow = screen
      .getByTestId("packaging-kit-form-child-quantity-MAT001")
      .closest("tr");
    expect(mainChildRow).not.toBeNull();

    fireEvent.click(
      within(mainChildRow as HTMLElement).getByRole("button", { name: "删除" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("子件不能与主件物料相同"),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("packaging-kit-form-child-quantity-MAT001"),
    ).not.toBeInTheDocument();
  });

  it("disables batch delete when no rows are selected", async () => {
    setMesTransportForTests(createStatefulPackagingKitTransport());

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    expect(screen.getByRole("button", { name: "批量删除" })).toBeDisabled();
  });

  it("deletes packaging kits and falls back to the previous page after removing the last row", async () => {

    const manyRows = Array.from({ length: 21 }, (_, index) => ({
      Id: index + 1,
      KitCode: `KIT${String(index + 1).padStart(3, "0")}`,
      KitName: `Kit ${index + 1}`,
      MainMaterialCode: `MAT${String(index + 1).padStart(3, "0")}`,
      MainMaterialName: `Material ${index + 1}`,
      Unit: "set",
      IsVirtualMain: index % 2 === 0,
      ChildCount: 1,
      Children: [
        {
          Code: `CH${index + 1}`,
          Name: `Child ${index + 1}`,
          Quantity: 1,
          Unit: "pcs",
        },
      ],
      Remark: "",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T10:00:00",
      LastModificationTime: null,
    }));
    const transport = createStatefulPackagingKitTransport(manyRows);

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    expect(
      await screen.findByTestId("packaging-kit-select-KIT021"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-kit-select-KIT021"));
    fireEvent.click(screen.getByRole("button", { name: "批量删除" }));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.getByText("第 1 / 1 页")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("packaging-kit-delete-KIT001"));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/PackagingKitApi/RemovePackagingKitData",
          body: expect.objectContaining({
            Id: 1,
          }),
        }),
      );
    });
  });

  it("shows an error toast when deleting a packaging kit fails", async () => {
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(baseRows),
        };
      }

      if (path === "/MaterialInfoApi/GetMaterialUnitAutoQueryDatas") {
        return {
          status: 200,
          data: createMaterialUnitResult(),
        };
      }

      if (path === "/PackagingKitApi/RemovePackagingKitData") {
        return {
          status: 200,
          data: {
            Success: false,
            Code: "",
            Message: "套包已被使用，不能删除",
            Attach: null,
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      return {
        status: 200,
        data: createMaterialResult(materialRows),
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByTestId("packaging-kit-delete-KIT001"));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith(
        "提交失败",
        { description: "套包已被使用，不能删除" },
      );
    });
    expect(notifyApiSuccess).not.toHaveBeenCalledWith("套包已删除");
  });

  it("clears batch selection after moving away from the selected page", async () => {
    const manyRows = Array.from({ length: 21 }, (_, index) => ({
      Id: index + 1,
      KitCode: `KIT${String(index + 1).padStart(3, "0")}`,
      KitName: `Kit ${index + 1}`,
      MainMaterialCode: `MAT${String(index + 1).padStart(3, "0")}`,
      MainMaterialName: `Material ${index + 1}`,
      Unit: "set",
      IsVirtualMain: index % 2 === 0,
      ChildCount: 1,
      Children: [
        {
          Code: `CH${index + 1}`,
          Name: `Child ${index + 1}`,
          Quantity: 1,
          Unit: "pcs",
        },
      ],
      Remark: "",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T10:00:00",
      LastModificationTime: null,
    }));
    const transport = createStatefulPackagingKitTransport(manyRows);

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    fireEvent.click(await screen.findByTestId("packaging-kit-select-KIT021"));

    expect(screen.getByRole("button", { name: "批量删除" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "上一页" }));

    await screen.findByTestId("packaging-kit-edit-KIT001");

    expect(screen.getByRole("button", { name: "批量删除" })).toBeDisabled();
    expect(
      transport.mock.calls.filter(
        ([request]) =>
          request.path === "/PackagingKitApi/RemoveBatchPackagingKitDatas",
      ),
    ).toHaveLength(0);
  });

  it("keeps material selections across dialog pages before confirm", async () => {
    const pagedMaterialRows = Array.from({ length: 21 }, (_, index) => ({
      Id: index + 1,
      MaterialCode: `MAT${String(index + 1).padStart(3, "0")}`,
      MaterialName: `Material ${index + 1}`,
      Unit: index % 2 === 0 ? "pcs" : "box",
      MaterialTypeName: "RM",
    }));
    const transport = vi.fn<Transport>(async ({ path, body }) => {
      if (path === "/PackagingKitApi/GetPackagingKitAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(baseRows),
        };
      }

      if (path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
        const payload = body as {
          MaterialCode?: string;
          MaterialName?: string;
          PageIndex: number;
          PageSize: number;
        };
        const filtered = pagedMaterialRows.filter(
          (row) =>
            (!payload.MaterialCode ||
              row.MaterialCode.includes(payload.MaterialCode)) &&
            (!payload.MaterialName ||
              row.MaterialName.includes(payload.MaterialName)),
        );
        const startIndex = (payload.PageIndex - 1) * payload.PageSize;
        const pageRows = filtered.slice(
          startIndex,
          startIndex + payload.PageSize,
        );

        return {
          status: 200,
          data: createMaterialResult(pageRows, filtered.length),
        };
      }

      return {
        status: 404,
        data: { message: `Unhandled path: ${path}` },
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));
    await screen.findByTestId("packaging-kit-form-dialog");

    fireEvent.click(screen.getByTestId("packaging-kit-form-add-children"));
    expect(
      await screen.findByTestId("packaging-kit-material-dialog"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-kit-material-select-MAT001"));
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    expect(
      await screen.findByTestId("packaging-kit-material-select-MAT021"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-kit-material-select-MAT021"));
    fireEvent.click(screen.getByTestId("packaging-kit-material-confirm"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("packaging-kit-material-dialog"),
      ).not.toBeInTheDocument();
    });

    expect(
      within(
        screen.getByTestId("packaging-kit-form-dialog"),
      ).getAllByPlaceholderText("请输入数量"),
    ).toHaveLength(2);
    expect(
      screen.getByTestId("packaging-kit-form-child-quantity-MAT001"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("packaging-kit-form-child-quantity-MAT021"),
    ).toBeInTheDocument();
  });

  it("disables next-page navigation on the actual last page", async () => {
    const manyRows = Array.from({ length: 21 }, (_, index) => ({
      Id: index + 1,
      KitCode: `KIT${String(index + 1).padStart(3, "0")}`,
      KitName: `Kit ${index + 1}`,
      MainMaterialCode: `MAT${String(index + 1).padStart(3, "0")}`,
      MainMaterialName: `Material ${index + 1}`,
      Unit: "set",
      IsVirtualMain: index % 2 === 0,
      ChildCount: 1,
      Children: [
        {
          Code: `CH${index + 1}`,
          Name: `Child ${index + 1}`,
          Quantity: 1,
          Unit: "pcs",
        },
      ],
      Remark: "",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T10:00:00",
      LastModificationTime: null,
    }));
    const transport = createStatefulPackagingKitTransport(manyRows);

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    expect(
      await screen.findByTestId("packaging-kit-select-KIT021"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
  });

  it("rejects malformed child quantity input before submit", async () => {
    const transport = createStatefulPackagingKitTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));
    await screen.findByTestId("packaging-kit-form-dialog");

    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-code"), {
      target: { value: "KIT999" },
    });
    fireEvent.change(screen.getByTestId("packaging-kit-form-kit-name"), {
      target: { value: "Validation Kit" },
    });

    await selectMainMaterial();

    fireEvent.click(screen.getByTestId("packaging-kit-form-add-children"));
    fireEvent.click(
      await screen.findByTestId("packaging-kit-material-select-MAT002"),
    );
    fireEvent.click(screen.getByTestId("packaging-kit-material-confirm"));

    fireEvent.change(
      screen.getByTestId("packaging-kit-form-child-quantity-MAT002"),
      {
        target: { value: "1e2" },
      },
    );

    fireEvent.click(screen.getByTestId("packaging-kit-form-submit"));

    expect(
      await screen.findByText("子件数量必须大于等于 1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("packaging-kit-form-dialog")).toBeInTheDocument();
    expect(
      transport.mock.calls.filter(
        ([request]) =>
          request.path === "/PackagingKitApi/StorePackagingKitData",
      ),
    ).toHaveLength(0);
  });

  it("renders the children section with a primary add action, empty table state, and destructive row delete action", async () => {
    setMesTransportForTests(createStatefulPackagingKitTransport());

    render(<App initialEntries={["/packaging/packaging-kit"]} />);

    await screen.findByTestId("packaging-kit-edit-KIT001");

    fireEvent.click(screen.getByRole("button", { name: "新增套包" }));

    const dialog = await screen.findByTestId("packaging-kit-form-dialog");
    const addChildrenButton = within(dialog).getByTestId(
      "packaging-kit-form-add-children",
    );

    expect(within(dialog).queryByLabelText("子件数")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("table")).toBeInTheDocument();
    expect(within(dialog).getByText("请先添加子件。")).toBeInTheDocument();
    expect(addChildrenButton).toHaveAttribute("data-variant", "default");
    expect(addChildrenButton.querySelector("svg")).not.toBeNull();

    fireEvent.click(addChildrenButton);
    fireEvent.click(
      await screen.findByTestId("packaging-kit-material-select-MAT002"),
    );
    fireEvent.click(screen.getByTestId("packaging-kit-material-confirm"));

    const childDeleteButton = within(dialog).getByRole("button", {
      name: "删除",
    });

    expect(childDeleteButton).toHaveAttribute("data-variant", "link");
    expect(childDeleteButton).toHaveClass("text-destructive");
    expect(childDeleteButton.querySelector("svg")).not.toBeNull();
  });
});
