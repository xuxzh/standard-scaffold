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
import type { Transport, TransportResponse } from "@/lib/api/http-client";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import {
  resetPrintTransportForTests,
  setPrintTransportForTests,
} from "@/lib/api/print-client";
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

type RuleRow = {
  Id: number;
  RuleCode: string;
  RuleName: string;
  IsEnabled: boolean;
  IsDefault: boolean;
  Details: Array<{
    Id?: number;
    PackagingLevelCode: string;
    PackagingLevelName?: string | null;
    LevelSequence?: number | null;
    SpecCode: string;
    SpecName?: string | null;
    StandardQuantity: number;
    MaxQuantity: number;
    PackagingMethod: string;
    Unit?: string | null;
    PackagingTypeName?: string | null;
  }>;
  Remark: string;
  CompanyCode?: string;
  FactoryCode?: string;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
};

type RuleConfigRow = {
  RuleCode: string;
  MixingRule?: {
    ForbidDifferentProduct?: boolean;
    ForbidDifferentBatch?: boolean;
    ForbidDifferentWorkOrder?: boolean;
    ForbidDifferentProductionTask?: boolean;
    ForbidCrossQualityStatus?: boolean;
  };
  LabelPrintRule?: {
    ReprintLimit?: number;
    DefaultTemplate?: string;
  };
  SealingRule?: {
    TimeoutAlert?: number;
    AutoSealOnWorkOrderComplete?: boolean;
    AutoSealOnTaskComplete?: boolean;
    AutoSealOnFullBox?: boolean;
  };
  ExceptionRule?: {
    ForceClearOnCycleTool?: boolean;
  };
};

const levelRows = [
  { Id: 1, LevelCode: "LV001", LevelName: "Unit", LevelSequence: 1 },
  { Id: 2, LevelCode: "LV002", LevelName: "Box", LevelSequence: 2 },
  { Id: 3, LevelCode: "LV003", LevelName: "Carton", LevelSequence: 3 },
];

const specRows = [
  {
    Id: 1,
    SpecCode: "SP001",
    SpecName: "Standard spec",
    Unit: "pcs",
    PackagingTypeName: "Carton",
  },
  {
    Id: 2,
    SpecCode: "SP002",
    SpecName: "Large spec",
    Unit: "pcs",
    PackagingTypeName: "Tray",
  },
  {
    Id: 3,
    SpecCode: "SP003",
    SpecName: "Bulk spec",
    Unit: "kg",
    PackagingTypeName: "Bag",
  },
];

const printTemplateRows = [
  { TemplateCode: "TPL-A", TemplateName: "Standard Box Label" },
  { TemplateCode: "TPL-Z", TemplateName: "Fallback Template" },
];

const baseRows: RuleRow[] = [
  {
    Id: 1,
    RuleCode: "RULE_001",
    RuleName: "Default packaging rule",
    IsEnabled: true,
    IsDefault: true,
    Details: [
      {
        Id: 11,
        PackagingLevelCode: "LV001",
        PackagingLevelName: "Unit",
        LevelSequence: 1,
        SpecCode: "SP001",
        SpecName: "Standard spec",
        StandardQuantity: 10,
        MaxQuantity: 12,
        PackagingMethod: "auto",
        Unit: "pcs",
        PackagingTypeName: "Carton",
      },
    ],
    Remark: "default",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T10:00:00",
    LastModificationTime: null,
  },
  {
    Id: 2,
    RuleCode: "RULE_002",
    RuleName: "Manual packaging rule",
    IsEnabled: false,
    IsDefault: false,
    Details: [
      {
        Id: 12,
        PackagingLevelCode: "LV002",
        PackagingLevelName: "Box",
        LevelSequence: 2,
        SpecCode: "SP002",
        SpecName: "Large spec",
        StandardQuantity: 20,
        MaxQuantity: 24,
        PackagingMethod: "manual",
        Unit: "pcs",
        PackagingTypeName: "Tray",
      },
    ],
    Remark: "manual",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T11:00:00",
    LastModificationTime: null,
  },
  {
    Id: 3,
    RuleCode: "RULE_003",
    RuleName: "Fallback packaging rule",
    IsEnabled: true,
    IsDefault: false,
    Details: [],
    Remark: "fallback",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-29T12:00:00",
    LastModificationTime: null,
  },
];

const baseConfigs: RuleConfigRow[] = [
  {
    RuleCode: "RULE_001",
    MixingRule: {
      ForbidDifferentProduct: true,
      ForbidDifferentBatch: false,
      ForbidDifferentWorkOrder: true,
      ForbidDifferentProductionTask: false,
      ForbidCrossQualityStatus: true,
    },
    LabelPrintRule: {
      ReprintLimit: 3,
      DefaultTemplate: "TPL-A",
    },
    SealingRule: {
      TimeoutAlert: 15,
      AutoSealOnWorkOrderComplete: true,
      AutoSealOnTaskComplete: false,
      AutoSealOnFullBox: true,
    },
    ExceptionRule: {
      ForceClearOnCycleTool: true,
    },
  },
];

function createListResult(rows: RuleRow[], totalCount = rows.length) {
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

function createStatefulPackagingRuleTransport(seedRows: RuleRow[] = baseRows) {
  let rows = structuredClone(seedRows);
  let configs = structuredClone(baseConfigs);
  let failConfigOnce = false;
  let failConfigSaveOnce = false;
  let failLevelOptions = false;
  let failSpecOptions = false;
  let failLevelChain = false;
  let levelChainFailureMessage = "Load level chain failed";
  let failRuleSaveOnce = false;
  let ruleSaveFailureMessage = "Rule save failed";

  function filterRows(payload: {
    RuleCode?: string;
    RuleName?: string;
    IsEnabled?: boolean;
    IsDefault?: boolean;
    PageIndex: number;
    PageSize: number;
  }) {
    const filtered = rows.filter(
      (row) =>
        (!payload.RuleCode || row.RuleCode.includes(payload.RuleCode)) &&
        (!payload.RuleName || row.RuleName.includes(payload.RuleName)) &&
        (payload.IsEnabled === undefined ||
          row.IsEnabled === payload.IsEnabled) &&
        (payload.IsDefault === undefined ||
          row.IsDefault === payload.IsDefault),
    );

    const startIndex = (payload.PageIndex - 1) * payload.PageSize;
    const pageRows = filtered.slice(startIndex, startIndex + payload.PageSize);

    return createListResult(pageRows, filtered.length);
  }

  const transport = vi.fn<Transport>(async ({ path, body }) => {
    if (path === "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas") {
      return {
        status: 200,
        data: filterRows(
          body as {
            RuleCode?: string;
            RuleName?: string;
            IsEnabled?: boolean;
            IsDefault?: boolean;
            PageIndex: number;
            PageSize: number;
          },
        ),
      };
    }

    if (path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas") {
      if (failLevelOptions) {
        return {
          status: 503,
          data: { message: "Load level options failed" },
        };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: levelRows,
          SkipCount: 0,
          TotalCount: levelRows.length,
          Record: levelRows.length,
        },
      };
    }

    if (path === "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas") {
      if (failSpecOptions) {
        return {
          status: 503,
          data: { message: "Load spec options failed" },
        };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: specRows,
          SkipCount: 0,
          TotalCount: specRows.length,
          Record: specRows.length,
        },
      };
    }

    if (path === "/PackagingLevelApi/GetLevelChain") {
      if (failLevelChain) {
        return {
          status: 503,
          data: { message: levelChainFailureMessage },
        };
      }

      const payload = body as { InnerLevelCode?: string };
      const innerIndex = levelRows.findIndex(
        (row) => row.LevelCode === payload?.InnerLevelCode,
      );
      const chainAttach =
        innerIndex >= 0
          ? levelRows.slice(0, innerIndex + 1).map((row) => ({
              Id: row.Id,
              LevelSequence: row.LevelSequence,
              LevelCode: row.LevelCode,
              LevelName: row.LevelName,
              ParentLevelCode:
                innerIndex > 0
                  ? levelRows[innerIndex - 1]?.LevelCode ?? null
                  : null,
              ParentLevelName:
                innerIndex > 0
                  ? levelRows[innerIndex - 1]?.LevelName ?? null
                  : null,
              Description: `${row.LevelName} chain`,
            }))
          : [];

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: chainAttach,
          SkipCount: 0,
          TotalCount: chainAttach.length,
          Record: chainAttach.length,
        },
      };
    }

    if (path === "/PackagingRuleApi/StorePackagingRuleData") {
      if (failRuleSaveOnce) {
        failRuleSaveOnce = false;
        return {
          status: 500,
          data: { message: ruleSaveFailureMessage },
        };
      }

      const payload = body as {
        RuleCode: string;
        RuleName: string;
        IsEnabled: boolean;
        IsDefault: boolean;
        Details: RuleRow["Details"];
        Remark: string;
      };
      const created: RuleRow = {
        Id: Math.max(...rows.map((row) => row.Id), 0) + 1,
        RuleCode: payload.RuleCode,
        RuleName: payload.RuleName,
        IsEnabled: payload.IsEnabled,
        IsDefault: payload.IsDefault,
        Details: payload.Details.map((detail, index) => ({
          ...detail,
          Id: 100 + index,
          PackagingLevelName:
            levelRows.find(
              (level) => level.LevelCode === detail.PackagingLevelCode,
            )?.LevelName ?? "",
          LevelSequence:
            levelRows.find(
              (level) => level.LevelCode === detail.PackagingLevelCode,
            )?.LevelSequence ?? null,
          SpecName:
            specRows.find((spec) => spec.SpecCode === detail.SpecCode)
              ?.SpecName ?? "",
          Unit:
            specRows.find((spec) => spec.SpecCode === detail.SpecCode)?.Unit ??
            "",
          PackagingTypeName:
            specRows.find((spec) => spec.SpecCode === detail.SpecCode)
              ?.PackagingTypeName ?? "",
        })),
        Remark: payload.Remark,
        CompanyCode: "RUIHUI",
        FactoryCode: "DEFAULT",
        CreationTime: "2026-05-29T15:00:00",
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

    if (path === "/PackagingRuleApi/UpdatePackagingRuleData") {
      if (failRuleSaveOnce) {
        failRuleSaveOnce = false;
        return {
          status: 500,
          data: { message: ruleSaveFailureMessage },
        };
      }

      const payload = body as {
        Id: number;
        RuleCode: string;
        RuleName: string;
        IsEnabled: boolean;
        IsDefault: boolean;
        Details: RuleRow["Details"];
        Remark: string;
      };

      rows = rows.map((row) =>
        row.Id === payload.Id
          ? {
              ...row,
              RuleName: payload.RuleName,
              IsEnabled: payload.IsEnabled,
              IsDefault: payload.IsDefault,
              Details: payload.Details.map((detail, index) => ({
                ...detail,
                Id: detail.Id ?? 200 + index,
                PackagingLevelName:
                  levelRows.find(
                    (level) => level.LevelCode === detail.PackagingLevelCode,
                  )?.LevelName ?? "",
                LevelSequence:
                  levelRows.find(
                    (level) => level.LevelCode === detail.PackagingLevelCode,
                  )?.LevelSequence ?? null,
                SpecName:
                  specRows.find((spec) => spec.SpecCode === detail.SpecCode)
                    ?.SpecName ?? "",
                Unit:
                  specRows.find((spec) => spec.SpecCode === detail.SpecCode)
                    ?.Unit ?? "",
                PackagingTypeName:
                  specRows.find((spec) => spec.SpecCode === detail.SpecCode)
                    ?.PackagingTypeName ?? "",
              })),
              Remark: payload.Remark,
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

    if (path === "/PackagingRuleApi/RemovePackagingRuleData") {
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

    if (path === "/PackagingRuleApi/RemoveBatchPackagingRuleDatas") {
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

    if (path === "/PackagingRuleApi/GetPackagingRuleConfigAutoQueryDatas") {
      if (failConfigOnce) {
        failConfigOnce = false;
        return {
          status: 503,
          data: { message: "Config request failed" },
        };
      }

      const payload = body as { RuleCode: string };
      const config = configs.filter(
        (item) => item.RuleCode === payload.RuleCode,
      );

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Query success",
          Attach: config,
          SkipCount: 0,
          TotalCount: config.length,
          Record: config.length,
        },
      };
    }

    if (path === "/PackagingRuleApi/StorePackagingRuleConfigData") {
      if (failConfigSaveOnce) {
        failConfigSaveOnce = false;
        return {
          status: 500,
          data: { message: "Save config failed" },
        };
      }

      const payload = body as RuleConfigRow;
      configs = [
        ...configs.filter((item) => item.RuleCode !== payload.RuleCode),
        payload,
      ];

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[MES] Save success",
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

  return {
    transport,
    failLevelOptionsRequests() {
      failLevelOptions = true;
    },
    failSpecOptionsRequests() {
      failSpecOptions = true;
    },
    failNextConfigRequest() {
      failConfigOnce = true;
    },
    failNextConfigSave() {
      failConfigSaveOnce = true;
    },
    failNextRuleSave(message = "Rule save failed") {
      failRuleSaveOnce = true;
      ruleSaveFailureMessage = message;
    },
    failNextLevelChain(message = "Load level chain failed") {
      failLevelChain = true;
      levelChainFailureMessage = message;
    },
  };
}

async function selectRadixOption(trigger: HTMLElement, optionName: string) {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

/**
 * Locate the `<tr>` that owns the per-row action button (`edit-{index}` or
 * `delete-{index}`). Used to anchor row-scoped assertions after the table
 * migrated to `DataTable`, which no longer applies a row-scoped `data-testid`.
 */
function getDetailRow(index: number): HTMLTableRowElement {
  const cell = screen.getByTestId(`packaging-rule-detail-edit-${index}`);
  const row = cell.closest("tr");
  if (!row) {
    throw new Error(`Detail row ${index} not found`);
  }
  return row as HTMLTableRowElement;
}

describe("PackagingRulePage", () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("accessToken", "access-1");
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
    resetMesTransportForTests();
    resetPrintTransportForTests();
    resetMesTransportForTests();
    vi.restoreAllMocks();
    notifyError.mockReset();
    notifyApiSuccess.mockReset();
    notifySuccess.mockReset();
    setPrintTransportForTests(
      vi.fn<Transport>(async ({ path }) => {
        if (path === "/LabelTemplateFile/findLabelTemplateFileWithSimple") {
          return {
            status: 200,
            data: {
              Success: true,
              Code: "",
              Message: "[PRINT] Query success",
              Attach: printTemplateRows,
              SkipCount: 0,
              TotalCount: printTemplateRows.length,
              Record: printTemplateRows.length,
            },
          };
        }

        return {
          status: 404,
          data: { message: `Unhandled path: ${path}` },
        };
      }),
    );
  });

  it("shows loading, empty, and error states for the list", async () => {
    let resolveRequest!: (response: TransportResponse) => void;
    let listRequestCount = 0;
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Query success",
            Attach: levelRows,
            SkipCount: 0,
            TotalCount: levelRows.length,
            Record: levelRows.length,
          },
        };
      }

      if (path === "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Query success",
            Attach: specRows,
            SkipCount: 0,
            TotalCount: specRows.length,
            Record: specRows.length,
          },
        };
      }

      listRequestCount += 1;

      if (listRequestCount === 1) {
        return await new Promise((resolve) => {
          resolveRequest = resolve;
        });
      }

      if (listRequestCount === 2) {
        return {
          status: 200,
          data: createListResult([]),
        };
      }

      return {
        status: 503,
        data: { message: "Rule query failed" },
      };
    });

    setMesTransportForTests(transport);
    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    expect(
      await screen.findByText("正在加载包装规则数据。"),
    ).toBeInTheDocument();

    resolveRequest({ status: 200, data: createListResult(baseRows) });

    expect(await screen.findByText("RULE_001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("暂无包装规则数据")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(
      await screen.findByText("[F] 加载失败"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("renders the list and submits filters", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    expect(
      await screen.findByRole("button", { name: "新增规则" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("RULE_001")).toBeInTheDocument();
    expect(
      await screen.findByTestId("packaging-rule-config-RULE_001"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量删除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "搜索" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置" })).toBeInTheDocument();
    expect(screen.getByText("Default packaging rule")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("规则编码"), {
      target: { value: "RULE_002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));

    expect(
      await screen.findByText("Manual packaging rule"),
    ).toBeInTheDocument();
    expect(transport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas",
        body: expect.objectContaining({
          RuleCode: "RULE_002",
          IsPaged: true,
          PageIndex: 1,
          PageSize: 20,
        }),
      }),
    );
  });

  it("keeps packaging rule overflow inside the table body scroll area", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setMesTransportForTests(transport);

    const { container } = render(
      <App initialEntries={["/packaging/packaging-rule"]} />,
    );

    await screen.findByText("RULE_001");

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

  it("expands a packaging rule row to show detail records inline", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    expect(
      await screen.findByText("Default packaging rule"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("packaging-rule-details-RULE_001"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开 RULE_001" }));

    const expandedRow = await screen.findByTestId(
      "packaging-rule-details-RULE_001",
    );

    expect(within(expandedRow).getByText("1")).toBeInTheDocument();
    expect(within(expandedRow).getByText("LV001")).toBeInTheDocument();
    expect(within(expandedRow).getByText("Unit")).toBeInTheDocument();
    expect(within(expandedRow).getByText("SP001")).toBeInTheDocument();
    expect(within(expandedRow).getByText("Standard spec")).toBeInTheDocument();
    expect(within(expandedRow).getByText("10")).toBeInTheDocument();
    expect(within(expandedRow).getByText("12")).toBeInTheDocument();
    expect(within(expandedRow).getByText("自动包装")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "展开 RULE_003" }),
    ).not.toBeInTheDocument();
  });

  it("creates a rule with details generated from the level chain, edits a row, and allows deleting all details", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
    expect(
      await screen.findByTestId("packaging-rule-form-dialog"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-code"), {
      target: { value: "RULE_010" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-name"), {
      target: { value: "Created rule" },
    });

    // 「选择层级明细」先选层级，再触发 GetLevelChain 生成明细。
    expect(
      screen.queryByRole("button", { name: "添加层级明细" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "选择层级明细" }));
    expect(
      await screen.findByTestId("packaging-rule-level-dialog"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-rule-level-row-LV003"));
    fireEvent.click(screen.getByTestId("packaging-rule-level-confirm"));

    await waitFor(() => {
      const chainRequest = transport.mock.calls.find(
        ([request]) =>
          request.path === "/PackagingLevelApi/GetLevelChain" &&
          (request.body as { InnerLevelCode: string }).InnerLevelCode ===
            "LV003",
      );
      expect(chainRequest).toBeTruthy();
    });

    // 链路上会按 LevelSequence 升序生成 3 行明细，等待 mutation → 表格更新。
    await waitFor(() => {
      expect(
        getDetailRow(0).querySelector('[data-testid="packaging-rule-detail-edit-0"]'),
      ).toBeInTheDocument();
      expect(
        getDetailRow(2).querySelector('[data-testid="packaging-rule-detail-edit-2"]'),
      ).toBeInTheDocument();
    });

    const row0 = getDetailRow(0);
    expect(within(row0).getByText("LV001")).toBeInTheDocument();
    expect(within(row0).getByText("Unit")).toBeInTheDocument();
    // 链路返回的 LevelSequence 会回填到表格，sequence 列不再空白。
    expect(within(row0).getByText("1")).toBeInTheDocument();
    expect(within(getDetailRow(1)).getByText("2")).toBeInTheDocument();
    expect(within(getDetailRow(2)).getByText("3")).toBeInTheDocument();
    expect(getDetailRow(1)).toHaveTextContent("LV002");
    expect(getDetailRow(2)).toHaveTextContent("LV003");

    // 点行级编辑仍走原明细弹窗，由用户补齐规格/数量/方式。
    fireEvent.click(screen.getByTestId("packaging-rule-detail-edit-0"));
    expect(
      await screen.findByTestId("packaging-rule-detail-dialog"),
    ).toBeInTheDocument();

    // 层级编码只读，沿用链路下行来源；只补齐规格/数量/方式。
    expect(
      screen.getByTestId("packaging-rule-detail-level-code"),
    ).toHaveAttribute("readonly");
    expect(
      screen.getByTestId("packaging-rule-detail-level-name"),
    ).toHaveAttribute("readonly");
    expect(
      screen.queryByTestId("packaging-rule-detail-level-sequence"),
    ).not.toBeInTheDocument();

    await selectRadixOption(
      screen.getByTestId("packaging-rule-detail-spec-code"),
      "SP001",
    );

    fireEvent.change(
      screen.getByTestId("packaging-rule-detail-standard-quantity"),
      {
        target: { value: "8" },
      },
    );
    fireEvent.change(
      screen.getByTestId("packaging-rule-detail-max-quantity"),
      {
        target: { value: "12" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));

    await waitFor(() => {
      expect(within(getDetailRow(0)).getByText("SP001")).toBeInTheDocument();
    });

    // 再补齐余下两行，否则提交时仍受表单校验拦截。
    for (const rowSpec of [
      { index: 1, specCode: "SP002", quantity: "16", maxQuantity: "20" },
      { index: 2, specCode: "SP003", quantity: "24", maxQuantity: "30" },
    ]) {
      fireEvent.click(screen.getByTestId(`packaging-rule-detail-edit-${rowSpec.index}`));
      expect(
        await screen.findByTestId("packaging-rule-detail-dialog"),
      ).toBeInTheDocument();
      await selectRadixOption(
        screen.getByTestId("packaging-rule-detail-spec-code"),
        rowSpec.specCode,
      );
      fireEvent.change(
        screen.getByTestId("packaging-rule-detail-standard-quantity"),
        {
          target: { value: rowSpec.quantity },
        },
      );
      fireEvent.change(
        screen.getByTestId("packaging-rule-detail-max-quantity"),
        {
          target: { value: rowSpec.maxQuantity },
        },
      );
      fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));
      await waitFor(() => {
        expect(
          screen.queryByTestId("packaging-rule-detail-dialog"),
        ).not.toBeInTheDocument();
      });
    }

    // 新建规则时不再提供行级删除：行内不应出现 delete 按钮。
    expect(
      screen.queryByTestId("packaging-rule-detail-delete-0"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    expect(await screen.findByText("Created rule")).toBeInTheDocument();
    const createRequest = transport.mock.calls.find(
      ([request]) =>
        request.path === "/PackagingRuleApi/StorePackagingRuleData" &&
        Array.isArray((request.body as { Details?: unknown[] }).Details) &&
        (request.body as { Details: unknown[] }).Details.length === 3,
    );
    expect(createRequest).toBeTruthy();

    // 链路返回的 LevelSequence 应跟随 details 一并传给后端，
    // 杜绝后端接收不到序号、退化成 0 的问题。
    const sentDetails = (
      createRequest?.[0].body as {
        Details: Array<{
          PackagingLevelCode: string;
          LevelSequence: number;
        }>;
      }
    ).Details;
    expect(sentDetails.map((d) => d.PackagingLevelCode)).toEqual([
      "LV001",
      "LV002",
      "LV003",
    ]);
    expect(sentDetails.map((d) => d.LevelSequence)).toEqual([1, 2, 3]);
  });

  it("shows existing details in the summary table and edits them through the nested dialog", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByTestId("packaging-rule-edit-RULE_001"));
    expect(
      await screen.findByTestId("packaging-rule-form-dialog"),
    ).toBeInTheDocument();

    expect(getDetailRow(0)).toBeInTheDocument();
    expect(within(getDetailRow(0)).getByText("LV001")).toBeInTheDocument();
    expect(within(getDetailRow(0)).getByText("SP001")).toBeInTheDocument();
    expect(
      screen.queryByTestId("packaging-rule-detail-delete-0"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-rule-detail-edit-0"));
    expect(
      await screen.findByTestId("packaging-rule-detail-dialog"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();

    fireEvent.change(
      screen.getByTestId("packaging-rule-detail-max-quantity"),
      {
        target: { value: "15" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("packaging-rule-detail-dialog"),
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("packaging-rule-form-dialog"),
      ).not.toBeInTheDocument();
    });

    const updateRequest = transport.mock.calls.find(
      ([request]) =>
        request.path === "/PackagingRuleApi/UpdatePackagingRuleData" &&
        Array.isArray(
          (request.body as { Details?: Array<{ MaxQuantity: number }> })
            .Details,
        ) &&
        (request.body as { Details: Array<{ MaxQuantity: number }> })
          .Details[0]?.MaxQuantity === 15,
    );

    expect(updateRequest).toBeTruthy();
  });

  it("shows in-form option load errors and disables submit when options fail to load", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failLevelOptionsRequests();
    setMesTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("RULE_001");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));

    expect(await screen.findByText("包装层级候选加载失败")).toBeInTheDocument();
    expect(screen.getByText("Load level options failed")).toBeInTheDocument();
    expect(screen.getByTestId("packaging-rule-form-submit")).toBeDisabled();
  });

  it("requires in-form confirmation before saving a rule without relation details", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
    fireEvent.change(
      await screen.findByTestId("packaging-rule-form-rule-code"),
      {
        target: { value: "RULE_011" },
      },
    );
    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-name"), {
      target: { value: "Weak confirm rule" },
    });

    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    expect(
      await screen.findByText("当前未添加任何层级明细"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "保存后可在列表页通过「配置」按钮继续配置层级明细，确定要继续吗？",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      transport.mock.calls.filter(
        ([request]) =>
          request.path === "/PackagingRuleApi/StorePackagingRuleData",
      ),
    ).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "仍然保存" }));

    expect(await screen.findByText("Weak confirm rule")).toBeInTheDocument();
    expect(
      transport.mock.calls.filter(
        ([request]) =>
          request.path === "/PackagingRuleApi/StorePackagingRuleData",
      ),
    ).toHaveLength(1);
  });

  it("keeps form input and shows backend error when rule submit fails", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failNextRuleSave("Save rule failed");
    setMesTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
    fireEvent.change(
      await screen.findByTestId("packaging-rule-form-rule-code"),
      {
        target: { value: "RULE_012" },
      },
    );
    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-name"), {
      target: { value: "Failed save rule" },
    });
    fireEvent.click(screen.getByRole("button", { name: "选择层级明细" }));
    expect(
      await screen.findByTestId("packaging-rule-level-dialog"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("packaging-rule-level-row-LV001"));
    fireEvent.click(screen.getByTestId("packaging-rule-level-confirm"));

    await waitFor(() => {
      expect(getDetailRow(0)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("packaging-rule-detail-edit-0"));
    expect(
      await screen.findByTestId("packaging-rule-detail-dialog"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("packaging-rule-detail-level-code"),
    ).toHaveAttribute("readonly");
    await selectRadixOption(
      screen.getByTestId("packaging-rule-detail-spec-code"),
      "SP001",
    );
    fireEvent.change(
      screen.getByTestId("packaging-rule-detail-standard-quantity"),
      {
        target: { value: "10" },
      },
    );
    fireEvent.change(
      screen.getByTestId("packaging-rule-detail-max-quantity"),
      {
        target: { value: "12" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("packaging-rule-detail-dialog"),
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    // Verify the form dialog stays open and preserved input values
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("RULE_012")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Failed save rule")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("opens the config dialog, retries failed loading, resets mixing rules, and saves", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failNextConfigRequest();
    setMesTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("RULE_001");
    fireEvent.click(
      await screen.findByTestId("packaging-rule-config-RULE_001"),
    );

    expect(await screen.findByText("正在加载配置数据。")).toBeInTheDocument();
    expect(await screen.findByText("配置数据加载失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    fireEvent.mouseDown(
      await screen.findByRole("tab", { name: "标签打印规则" }),
    );
    expect(
      await screen.findByRole("combobox", { name: "默认打印模板" }),
    ).toHaveTextContent("TPL-A-Standard Box Label");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "混料规则" }));
    fireEvent.click(screen.getByRole("button", { name: "清空" }));
    const productMix = screen.getByTestId(
      "packaging-rule-config-forbid-different-product",
    );
    expect(productMix).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "全选" }));
    expect(productMix).toBeChecked();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "标签打印规则" }));
    fireEvent.change(
      screen.getByTestId("packaging-rule-config-reprint-limit"),
      {
        target: { value: "5" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-config-reset"));
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();

    fireEvent.change(
      screen.getByTestId("packaging-rule-config-reprint-limit"),
      {
        target: { value: "6" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-config-submit"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("keeps config input when save fails", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failNextConfigSave();
    setMesTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");
    fireEvent.click(screen.getByTestId("packaging-rule-config-RULE_001"));

    fireEvent.mouseDown(
      await screen.findByRole("tab", { name: "标签打印规则" }),
    );
    expect(
      await screen.findByRole("combobox", { name: "默认打印模板" }),
    ).toHaveTextContent("TPL-A-Standard Box Label");
    await selectRadixOption(
      screen.getByTestId("packaging-rule-config-print-template"),
      "TPL-Z-Fallback Template",
    );
    fireEvent.click(screen.getByTestId("packaging-rule-config-submit"));

    expect(await screen.findByText("Save config failed")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "默认打印模板" }),
    ).toHaveTextContent("TPL-Z-Fallback Template");
  });

  it("deletes single and batch rows and falls back to the previous page", async () => {
    const rows = Array.from({ length: 21 }, (_, index) => ({
      Id: index + 1,
      RuleCode: `RULE_${String(index + 1).padStart(3, "0")}`,
      RuleName: `Rule ${index + 1}`,
      IsEnabled: true,
      IsDefault: index === 0,
      Details: [],
      Remark: "",
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
      CreationTime: "2026-05-29T10:00:00",
      LastModificationTime: null,
    }));
    const { transport } = createStatefulPackagingRuleTransport(rows);

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Rule 1");

    const batchDeleteButton = screen.getByRole("button", { name: "批量删除" });
    expect(batchDeleteButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(await screen.findByText("Rule 21")).toBeInTheDocument();

    // Single delete via AlertDialog
    fireEvent.click(screen.getByTestId("packaging-rule-delete-RULE_021"));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));
    expect(await screen.findByText("Rule 1")).toBeInTheDocument();
    expect(screen.queryByText("Rule 21")).not.toBeInTheDocument();

    // Batch delete via AlertDialog
    fireEvent.click(screen.getByTestId("packaging-rule-select-RULE_001"));
    fireEvent.click(screen.getByTestId("packaging-rule-select-RULE_002"));
    expect(batchDeleteButton).not.toBeDisabled();
    fireEvent.click(batchDeleteButton);
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByText("Rule 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Rule 2")).not.toBeInTheDocument();
    });

    const batchDeleteRequest = transport.mock.calls.find(
      ([request]) =>
        request.path === "/PackagingRuleApi/RemoveBatchPackagingRuleDatas",
    );
    expect(batchDeleteRequest?.[0].body).toEqual([
      expect.objectContaining({ Id: 1, RuleCode: "RULE_001" }),
      expect.objectContaining({ Id: 2, RuleCode: "RULE_002" }),
    ]);
  });

  it("shows an error toast when deleting a packaging rule fails", async () => {
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(baseRows),
        };
      }

      if (path === "/PackagingRuleApi/RemovePackagingRuleData") {
        return {
          status: 200,
          data: {
            Success: false,
            Code: "",
            Message: "包装规则已被使用，不能删除",
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

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByTestId("packaging-rule-delete-RULE_001"));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith(
        "提交失败",
        { description: "包装规则已被使用，不能删除" },
      );
    });
    expect(notifyApiSuccess).not.toHaveBeenCalledWith("包装规则已删除");
  });

  it("keeps the level dialog open with an error banner when GetLevelChain fails", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failNextLevelChain("Level chain unavailable");
    setMesTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
    fireEvent.change(
      await screen.findByTestId("packaging-rule-form-rule-code"),
      {
        target: { value: "RULE_020" },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "选择层级明细" }));
    expect(
      await screen.findByTestId("packaging-rule-level-dialog"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-rule-level-row-LV002"));
    fireEvent.click(screen.getByTestId("packaging-rule-level-confirm"));

    expect(
      await screen.findByTestId("packaging-rule-level-error"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("packaging-rule-level-error").textContent,
    ).toContain("Level chain unavailable");

    // 失败时弹窗仍可见，主表单的 details 表未替换为空或旧值。
    expect(
      screen.getByTestId("packaging-rule-level-dialog"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("packaging-rule-detail-edit-0"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("暂无层级明细，请点击「选择层级明细」按钮选择。"),
    ).toBeInTheDocument();
  });
});
