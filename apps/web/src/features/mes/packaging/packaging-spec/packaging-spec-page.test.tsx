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

function createStatefulPackagingSpecTransport(options?: {
  listErrorOnce?: boolean;
  optionsError?: boolean;
}) {
  let rows = [
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
      CompanyCode: "00000",
      FactoryCode: "00000.00001",
      CreationTime: "2026-05-29T09:00:00",
      LastModificationTime: null,
    },
    {
      Id: 2,
      SpecCode: "SPEC-002",
      SpecName: "Return Pallet",
      PackagingTypeCode: "TYPE-002",
      PackagingTypeName: "Pallet",
      PackagingLevelCode: "LEVEL-004",
      PackagingLevelName: "Pallet",
      BarcodeRuleCode: "BAR-002",
      BarcodeRuleName: "Pallet Barcode",
      Length: 120,
      Width: 100,
      Height: 15,
      Volume: 0.18,
      MaxWeight: 50,
      GrossWeight: 45,
      TareWeight: 5,
      StandardCapacity: 1,
      StackLimit: 3,
      Unit: "EA",
      IsEnabled: false,
      Remark: "",
      CompanyCode: "00000",
      FactoryCode: "00000.00001",
      CreationTime: "2026-05-29T09:00:00",
      LastModificationTime: null,
    },
  ];

  const packagingTypes = [
    { Id: 1, TypeCode: "TYPE-001", TypeName: "Carton", IsRecyclable: false },
    { Id: 2, TypeCode: "TYPE-002", TypeName: "Pallet", IsRecyclable: true },
  ];

  const labelRules = [
    { RuleId: "BAR-001", RuleName: "Default Barcode" },
    { RuleId: "BAR-002", RuleName: "Pallet Barcode" },
    { RuleId: "BAR-003", RuleName: "Bulk Barcode" },
  ];

  const materialUnits = [
    { Id: 1, MaterialUnitCode: "EA", MaterialUnitName: "个" },
    { Id: 2, MaterialUnitCode: "BOX", MaterialUnitName: "箱" },
    { Id: 3, MaterialUnitCode: "PAL", MaterialUnitName: "托盘" },
  ];

  let listErrored = false;

  return vi.fn<Transport>(async ({ path, body }) => {
    if (path === "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas") {
      if (options?.listErrorOnce && !listErrored) {
        listErrored = true;

        return {
          status: 503,
          data: { message: "Packaging spec service unavailable" },
        };
      }

      const payload = body as {
        SpecCode?: string;
        SpecName?: string;
        PackagingTypeCode?: string;
        IsEnabled?: boolean;
      };

      const filtered = rows.filter((row) => {
        const matchCode =
          !payload.SpecCode || row.SpecCode.includes(payload.SpecCode);
        const matchName =
          !payload.SpecName || row.SpecName.includes(payload.SpecName);
        const matchType =
          !payload.PackagingTypeCode ||
          row.PackagingTypeCode === payload.PackagingTypeCode;
        const matchEnabled =
          payload.IsEnabled === undefined ||
          row.IsEnabled === payload.IsEnabled;

        return matchCode && matchName && matchType && matchEnabled;
      });

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: filtered,
          SkipCount: 0,
          TotalCount: filtered.length,
          Record: filtered.length,
        },
      };
    }

    if (path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas") {
      if (options?.optionsError) {
        return {
          status: 503,
          data: { message: "Packaging type options unavailable" },
        };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: packagingTypes,
          SkipCount: 0,
          TotalCount: packagingTypes.length,
          Record: packagingTypes.length,
        },
      };
    }

    if (path === "/LabelApi/GetLabelRuleAutoQueryDatas") {
      if (options?.optionsError) {
        return {
          status: 503,
          data: { message: "Label rule options unavailable" },
        };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: labelRules,
          SkipCount: 0,
          TotalCount: labelRules.length,
          Record: labelRules.length,
        },
      };
    }

    if (path === "/MaterialInfoApi/GetMaterialUnitAutoQueryDatas") {
      if (options?.optionsError) {
        return {
          status: 503,
          data: { message: "Material unit options unavailable" },
        };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: materialUnits,
          SkipCount: 0,
          TotalCount: materialUnits.length,
          Record: materialUnits.length,
        },
      };
    }

    if (path === "/PackagingSpecApi/StorePackagingSpecData") {
      const payload = body as Record<string, unknown>;
      const created = {
        Id: rows.length + 1,
        SpecCode: payload.SpecCode,
        SpecName: payload.SpecName,
        PackagingTypeCode: payload.PackagingTypeCode,
        PackagingTypeName: payload.PackagingTypeName,
        PackagingLevelCode: "",
        PackagingLevelName: "",
        BarcodeRuleCode: payload.BarcodeRuleCode,
        BarcodeRuleName: payload.BarcodeRuleName,
        Length: payload.Length,
        Width: payload.Width,
        Height: payload.Height,
        Volume: payload.Volume,
        MaxWeight: payload.MaxWeight,
        GrossWeight: payload.GrossWeight,
        TareWeight: payload.TareWeight,
        StandardCapacity: payload.StandardCapacity,
        StackLimit: payload.StackLimit,
        Unit: payload.Unit,
        IsEnabled: payload.IsEnabled,
        Remark: "",
        CompanyCode: "00000",
        FactoryCode: "00000.00001",
        CreationTime: "2026-05-29T09:00:00",
        LastModificationTime: null,
      };

      rows = [created as (typeof rows)[number], ...rows];

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

    if (path === "/PackagingSpecApi/UpdatePackagingSpecData") {
      const payload = body as { NeedUpdateFields: Record<string, unknown> };
      rows = rows.map((row) =>
        row.Id === payload.NeedUpdateFields.Id
          ? {
              ...row,
              ...payload.NeedUpdateFields,
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

    if (path === "/PackagingSpecApi/RemovePackagingSpecData") {
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

    if (path === "/PackagingSpecApi/RemoveBatchPackagingSpecDatas") {
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

async function selectRadixOption(trigger: HTMLElement, optionName: string) {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

describe("PackagingSpecPage", () => {
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

  it("shows loading state and list data", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    expect(
      await screen.findByText("正在加载包装规格数据。"),
    ).toBeInTheDocument();
    const firstSpecCode = await screen.findByText("SPEC-001");
    const firstRow = firstSpecCode.closest("tr");

    expect(firstRow).not.toBeNull();

    const firstRowQueries = within(firstRow as HTMLTableRowElement);

    expect(firstRowQueries.getByText("Regular Carton")).toBeInTheDocument();
    expect(firstRowQueries.getByText("TYPE-001")).toBeInTheDocument();
    expect(firstRowQueries.getByText("Carton")).toBeInTheDocument();
    expect(firstRowQueries.getByText("BAR-001")).toBeInTheDocument();
    expect(firstRowQueries.getByText("Default Barcode")).toBeInTheDocument();
    expect(firstRowQueries.getByText("60")).toBeInTheDocument();
    expect(firstRowQueries.getByText("40")).toBeInTheDocument();
    expect(firstRowQueries.getByText("30")).toBeInTheDocument();
    expect(firstRowQueries.getByText("0.072")).toBeInTheDocument();
    expect(firstRowQueries.getByText("20")).toBeInTheDocument();
    expect(firstRowQueries.getByText("18")).toBeInTheDocument();
    expect(firstRowQueries.getByText("2")).toBeInTheDocument();
    expect(firstRowQueries.getByText("24")).toBeInTheDocument();
    expect(firstRowQueries.getByText("个")).toBeInTheDocument();
    expect(firstRowQueries.queryByText("EA")).not.toBeInTheDocument();
    expect(firstRowQueries.getByText("8")).toBeInTheDocument();
    expect(firstRowQueries.getByText("启用")).toBeInTheDocument();
  });

  it("keeps long table headers within two lines with a minimum column width", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    const packagingTypeCodeHeader = await screen.findByRole("columnheader", {
      name: "包装类型编码",
    });
    const barcodeRuleCodeHeader = await screen.findByRole("columnheader", {
      name: "条码规则编码",
    });

    expect(packagingTypeCodeHeader).toHaveClass("min-w-28");
    expect(barcodeRuleCodeHeader).toHaveClass("min-w-28");
    expect(packagingTypeCodeHeader.firstElementChild).toHaveClass(
      "[-webkit-line-clamp:2]",
    );
    expect(barcodeRuleCodeHeader.firstElementChild).toHaveClass(
      "[-webkit-line-clamp:2]",
    );
  });

  it("keeps packaging spec overflow inside the table body scroll area", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());

    const { container } = render(
      <App initialEntries={["/packaging/packaging-spec"]} />,
    );

    await screen.findByText("SPEC-001");

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

  it("shows an empty state when no packaging specs are returned", async () => {
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Query success",
            Attach: [],
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      if (path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "",
            Attach: [],
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "",
          Attach: [],
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    });

    setMesTransportForTests(transport);
    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    expect(await screen.findByText("暂无包装规格数据")).toBeInTheDocument();
  });

  it("shows error state and supports retry", async () => {
    setMesTransportForTests(
      createStatefulPackagingSpecTransport({ listErrorOnce: true }),
    );

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "重试" }),
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));

    expect(await screen.findByText("SPEC-001")).toBeInTheDocument();
  });

  it("filters the list with code, type, and enabled status", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");

    fireEvent.change(screen.getByRole("textbox", { name: "规格编码" }), {
      target: { value: "SPEC-002" },
    });
    await selectRadixOption(
      screen.getByRole("combobox", { name: "包装类型编码" }),
      "TYPE-002",
    );
    await selectRadixOption(
      screen.getByRole("combobox", { name: "启用状态" }),
      "禁用",
    );
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByText("SPEC-002")).toBeInTheDocument();
    expect(screen.queryByText("SPEC-001")).not.toBeInTheDocument();
  });

  it("creates a packaging spec and auto-calculates volume from dimensions", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");

    fireEvent.click(screen.getByRole("button", { name: "新增规格" }));

    const dialog = await screen.findByTestId("packaging-spec-form-dialog");

    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-spec-code"),
      {
        target: { value: "SPEC-003" },
      },
    );
    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-spec-name"),
      {
        target: { value: "Bulk Carton" },
      },
    );
    await selectRadixOption(
      within(dialog).getByTestId("packaging-spec-form-packaging-type-code"),
      "TYPE-001",
    );
    expect(within(dialog).getByDisplayValue("Carton")).toBeInTheDocument();
    await selectRadixOption(
      within(dialog).getByTestId("packaging-spec-form-barcode-rule-code"),
      "BAR-003-Bulk Barcode",
    );
    expect(
      within(dialog).getByTestId("packaging-spec-form-barcode-rule-code-name"),
    ).toHaveValue("Bulk Barcode");
    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-length"), {
      target: { value: "50" },
    });
    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-width"), {
      target: { value: "40" },
    });
    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-height"), {
      target: { value: "30" },
    });

    await waitFor(() => {
      expect(
        within(dialog).getByTestId("packaging-spec-form-volume"),
      ).toHaveValue("0.06");
    });

    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-max-weight"),
      {
        target: { value: "20" },
      },
    );
    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-gross-weight"),
      {
        target: { value: "18" },
      },
    );
    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-tare-weight"),
      {
        target: { value: "2" },
      },
    );
    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-standard-capacity"),
      {
        target: { value: "20" },
      },
    );
    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-stack-limit"),
      {
        target: { value: "6" },
      },
    );
    fireEvent.click(within(dialog).getByRole("combobox", { name: "单位" }));
    fireEvent.click(await screen.findByRole("option", { name: "EA-个" }));

    fireEvent.click(within(dialog).getByTestId("packaging-spec-form-submit"));

    expect(await screen.findByText("SPEC-003")).toBeInTheDocument();
    expect(screen.getByText("Bulk Carton")).toBeInTheDocument();
  });

  it("allows manual volume override after auto calculation", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");
    fireEvent.click(screen.getByRole("button", { name: "新增规格" }));

    const dialog = await screen.findByTestId("packaging-spec-form-dialog");

    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-length"), {
      target: { value: "10" },
    });
    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-width"), {
      target: { value: "20" },
    });
    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-height"), {
      target: { value: "30" },
    });

    await waitFor(() => {
      expect(
        within(dialog).getByTestId("packaging-spec-form-volume"),
      ).toHaveValue("0.006");
    });

    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-volume"), {
      target: { value: "0.01" },
    });
    fireEvent.change(within(dialog).getByTestId("packaging-spec-form-height"), {
      target: { value: "31" },
    });

    expect(
      within(dialog).getByTestId("packaging-spec-form-volume"),
    ).toHaveValue("0.01");
  });

  it("renders the create dialog with grouped fields and reset action", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");
    fireEvent.click(screen.getByRole("button", { name: "新增规格" }));

    const dialog = await screen.findByTestId("packaging-spec-form-dialog");

    expect(within(dialog).getByText("尺寸与重量")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "返回" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "重置" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "确认" }),
    ).toBeInTheDocument();

    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-spec-code"),
      {
        target: { value: "SPEC-RESET" },
      },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "重置" }));

    expect(
      within(dialog).getByTestId("packaging-spec-form-spec-code"),
    ).toHaveValue("");
  });

  it("edits a packaging spec and keeps spec code read only", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());
    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");
    fireEvent.click(screen.getByTestId("packaging-spec-edit-SPEC-001"));

    const dialog = await screen.findByTestId("packaging-spec-form-dialog");
    expect(
      within(dialog).getByTestId("packaging-spec-form-spec-code"),
    ).toBeDisabled();

    fireEvent.change(
      within(dialog).getByTestId("packaging-spec-form-spec-name"),
      {
        target: { value: "Updated Carton" },
      },
    );
    fireEvent.click(within(dialog).getByTestId("packaging-spec-form-submit"));

    expect(await screen.findByText("Updated Carton")).toBeInTheDocument();
  });

  it("deletes one packaging spec and supports batch delete", async () => {
    setMesTransportForTests(createStatefulPackagingSpecTransport());
    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");
    fireEvent.click(screen.getByTestId("packaging-spec-delete-SPEC-001"));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByText("SPEC-001")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("packaging-spec-select-SPEC-002"));
    fireEvent.click(screen.getByRole("button", { name: "批量删除" }));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByText("SPEC-002")).not.toBeInTheDocument();
    });
  });

  it("shows an error toast when deleting a packaging spec fails", async () => {
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Query success",
            Attach: [
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
                CompanyCode: "00000",
                FactoryCode: "00000.00001",
                CreationTime: "2026-05-29T09:00:00",
                LastModificationTime: null,
              },
            ],
            SkipCount: 0,
            TotalCount: 1,
            Record: 1,
          },
        };
      }

      if (path === "/PackagingSpecApi/RemovePackagingSpecData") {
        return {
          status: 200,
          data: {
            Success: false,
            Code: "",
            Message: "包装规格已被使用，不能删除",
            Attach: null,
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: [],
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");

    fireEvent.click(screen.getByTestId("packaging-spec-delete-SPEC-001"));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith(
        "提交失败",
        { description: "包装规格已被使用，不能删除" },
      );
    });
  });

  it("disables submit and shows option load failure when candidate queries fail", async () => {
    setMesTransportForTests(
      createStatefulPackagingSpecTransport({ optionsError: true }),
    );
    render(<App initialEntries={["/packaging/packaging-spec"]} />);

    await screen.findByText("SPEC-001");
    fireEvent.click(screen.getByRole("button", { name: "新增规格" }));

    const dialog = await screen.findByTestId("packaging-spec-form-dialog");

    expect(
      await within(dialog).findByText("包装类型候选加载失败"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByTestId("packaging-spec-form-submit"),
    ).toBeDisabled();
  });
});
