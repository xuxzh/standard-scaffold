import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/root-app";
import { i18n } from "@/i18n/config";
import type { Transport, TransportResponse } from "@/lib/api/http-client";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
import { setNavigatorLanguage } from "@/test/setup";

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
        PackagingMethod: "\u81ea\u52a8",
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
        PackagingMethod: "\u624b\u52a8",
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
    Message: "[WMS] Query success",
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
        (payload.IsEnabled === undefined || row.IsEnabled === payload.IsEnabled) &&
        (payload.IsDefault === undefined || row.IsDefault === payload.IsDefault),
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
          Message: "[WMS] Query success",
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
          Message: "[WMS] Query success",
          Attach: specRows,
          SkipCount: 0,
          TotalCount: specRows.length,
          Record: specRows.length,
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
            levelRows.find((level) => level.LevelCode === detail.PackagingLevelCode)?.LevelName ?? "",
          LevelSequence:
            levelRows.find((level) => level.LevelCode === detail.PackagingLevelCode)?.LevelSequence ?? null,
          SpecName:
            specRows.find((spec) => spec.SpecCode === detail.SpecCode)?.SpecName ?? "",
          Unit: specRows.find((spec) => spec.SpecCode === detail.SpecCode)?.Unit ?? "",
          PackagingTypeName:
            specRows.find((spec) => spec.SpecCode === detail.SpecCode)?.PackagingTypeName ?? "",
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
          Message: "[WMS] Save success",
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
                  levelRows.find((level) => level.LevelCode === detail.PackagingLevelCode)?.LevelName ?? "",
                LevelSequence:
                  levelRows.find((level) => level.LevelCode === detail.PackagingLevelCode)?.LevelSequence ?? null,
                SpecName:
                  specRows.find((spec) => spec.SpecCode === detail.SpecCode)?.SpecName ?? "",
                Unit: specRows.find((spec) => spec.SpecCode === detail.SpecCode)?.Unit ?? "",
                PackagingTypeName:
                  specRows.find((spec) => spec.SpecCode === detail.SpecCode)?.PackagingTypeName ?? "",
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
          Message: "[WMS] Update success",
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
          Message: "[WMS] Delete success",
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
          Message: "[WMS] Delete success",
          Attach: null,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        },
      };
    }

    if (path === "/PackagingRuleApi/GetPackagingRuleConfigByRuleCode") {
      if (failConfigOnce) {
        failConfigOnce = false;
        return {
          status: 503,
          data: { message: "Config request failed" },
        };
      }

      const payload = body as { RuleCode: string };
      const config = configs.filter((item) => item.RuleCode === payload.RuleCode);

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[WMS] Query success",
          Attach: config,
          SkipCount: 0,
          TotalCount: config.length,
          Record: config.length,
        },
      };
    }

    if (path === "/PackagingRuleApi/StorePackagingRuleConfig") {
      if (failConfigSaveOnce) {
        failConfigSaveOnce = false;
        return {
          status: 500,
          data: { message: "Save config failed" },
        };
      }

      const payload = body as RuleConfigRow;
      configs = [...configs.filter((item) => item.RuleCode !== payload.RuleCode), payload];

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "[WMS] Save success",
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
  };
}

describe("PackagingRulePage", () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("accessToken", "access-1");
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
    resetWmsTransportForTests();
    vi.restoreAllMocks();
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
            Message: "[WMS] Query success",
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
            Message: "[WMS] Query success",
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

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    expect(await screen.findByText("正在加载包装规则数据。"))
      .toBeInTheDocument();

    resolveRequest({ status: 200, data: createListResult(baseRows) });

    expect(await screen.findByText("RULE_001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("暂无包装规则数据")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(await screen.findByText("暂时无法加载包装规则列表")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("renders the list and submits filters", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    expect(await screen.findByRole("button", { name: "新增规则" })).toBeInTheDocument();
    expect(await screen.findByText("RULE_001")).toBeInTheDocument();
    expect(await screen.findByTestId("packaging-rule-config-RULE_001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量删除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "查询" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置" })).toBeInTheDocument();
    expect(screen.getByText("Default packaging rule")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("规则编码"), {
      target: { value: "RULE_002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByText("Manual packaging rule")).toBeInTheDocument();
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

  it("creates a rule, edits it, maintains details, and validates quantity ordering", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-code"), {
      target: { value: "RULE_010" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-name"), {
      target: { value: "Created rule" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加包装明细" }));

    fireEvent.change(screen.getByTestId("packaging-rule-detail-level-code-0"), {
      target: { value: "LV002" },
    });
    expect(screen.getByDisplayValue("Box")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-rule-detail-spec-code-0"), {
      target: { value: "SP002" },
    });
    expect(screen.getByDisplayValue("Large spec")).toBeInTheDocument();
    expect(screen.getByDisplayValue("pcs")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-rule-detail-standard-quantity-0"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-detail-max-quantity-0"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    expect(await screen.findByText("最大包装数量不能小于标准包装数量"))
      .toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-rule-detail-max-quantity-0"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-detail-method-0"), {
      target: { value: "manual" },
    });
    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    expect(await screen.findByText("Created rule")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-rule-edit-RULE_010"));
    expect(await screen.findByDisplayValue("RULE_010")).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "删除明细" }));
    expect(await screen.findByText("当前没有包装关系明细，可以直接保存主信息。")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));
    fireEvent.click(await screen.findByRole("button", { name: "继续保存" }));

    expect(await screen.findByText("Created rule")).toBeInTheDocument();
    const updateRequest = transport.mock.calls.find(
      ([request]) =>
        request.path === "/PackagingRuleApi/UpdatePackagingRuleData" &&
        Array.isArray((request.body as { Details?: unknown[] }).Details) &&
        ((request.body as { Details: unknown[] }).Details).length === 0,
    );
    expect(updateRequest).toBeTruthy();
  });

  it("shows in-form option load errors and disables submit when options fail to load", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failLevelOptionsRequests();
    setWmsTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("RULE_001");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));

    expect(await screen.findByText("包装层级候选加载失败")).toBeInTheDocument();
    expect(screen.getByText("Load level options failed")).toBeInTheDocument();
    expect(screen.getByTestId("packaging-rule-form-submit")).toBeDisabled();
  });

  it("requires in-form confirmation before saving a rule without relation details", async () => {
    const { transport } = createStatefulPackagingRuleTransport();

    setWmsTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
    fireEvent.change(await screen.findByTestId("packaging-rule-form-rule-code"), {
      target: { value: "RULE_011" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-name"), {
      target: { value: "Weak confirm rule" },
    });

    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    expect(await screen.findByText("空明细保存确认")).toBeInTheDocument();
    expect(screen.getByText("当前规则没有包装关系明细，将仅保存主信息。")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      transport.mock.calls.filter(
        ([request]) => request.path === "/PackagingRuleApi/StorePackagingRuleData",
      ),
    ).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "继续保存" }));

    expect(await screen.findByText("Weak confirm rule")).toBeInTheDocument();
    expect(
      transport.mock.calls.filter(
        ([request]) => request.path === "/PackagingRuleApi/StorePackagingRuleData",
      ),
    ).toHaveLength(1);
  });

  it("keeps form input and shows backend error when rule submit fails", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failNextRuleSave("Save rule failed");
    setWmsTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");

    fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
    fireEvent.change(await screen.findByTestId("packaging-rule-form-rule-code"), {
      target: { value: "RULE_012" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-form-rule-name"), {
      target: { value: "Failed save rule" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加包装明细" }));
    fireEvent.change(screen.getByTestId("packaging-rule-detail-level-code-0"), {
      target: { value: "LV001" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-detail-spec-code-0"), {
      target: { value: "SP001" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-detail-standard-quantity-0"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByTestId("packaging-rule-detail-max-quantity-0"), {
      target: { value: "12" },
    });

    fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

    expect(await screen.findByText("Save rule failed")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("RULE_012")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Failed save rule")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
  });

  it("opens the config dialog, retries failed loading, resets mixing rules, and saves", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failNextConfigRequest();
    setWmsTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("RULE_001");
    fireEvent.click(await screen.findByTestId("packaging-rule-config-RULE_001"));

    expect(await screen.findByText("正在加载规则配置。"))
      .toBeInTheDocument();
    expect(await screen.findByText("暂时无法加载规则配置")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    fireEvent.click(await screen.findByRole("button", { name: "标签打印规则" }));
    expect(await screen.findByDisplayValue("TPL-A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "混箱规则" }));
    fireEvent.click(screen.getByRole("button", { name: "一键清空" }));
    const productMix = screen.getByTestId("packaging-rule-config-forbid-different-product");
    expect(productMix).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "一键全选" }));
    expect(productMix).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "标签打印规则" }));
    fireEvent.change(screen.getByTestId("packaging-rule-config-reprint-limit"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByTestId("packaging-rule-config-reset"));
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-rule-config-reprint-limit"), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByTestId("packaging-rule-config-submit"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("keeps config input when save fails", async () => {
    const state = createStatefulPackagingRuleTransport();
    state.failNextConfigSave();
    setWmsTransportForTests(state.transport);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Default packaging rule");
    fireEvent.click(screen.getByTestId("packaging-rule-config-RULE_001"));

    fireEvent.click(await screen.findByRole("button", { name: "标签打印规则" }));
    expect(await screen.findByDisplayValue("TPL-A")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("packaging-rule-config-default-template"), {
      target: { value: "TPL-Z" },
    });
    fireEvent.click(screen.getByTestId("packaging-rule-config-submit"));

    expect(await screen.findByText("Save config failed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("TPL-Z")).toBeInTheDocument();
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

    setWmsTransportForTests(transport);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App initialEntries={["/packaging/packaging-rule"]} />);

    await screen.findByText("Rule 1");

    const batchDeleteButton = screen.getByRole("button", { name: "批量删除" });
    expect(batchDeleteButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(await screen.findByText("Rule 21")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-rule-delete-RULE_021"));
    expect(await screen.findByText("Rule 1")).toBeInTheDocument();
    expect(screen.queryByText("Rule 21")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("packaging-rule-select-RULE_001"));
    fireEvent.click(screen.getByTestId("packaging-rule-select-RULE_002"));
    expect(batchDeleteButton).not.toBeDisabled();
    fireEvent.click(batchDeleteButton);

    await waitFor(() => {
      expect(screen.queryByText("Rule 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Rule 2")).not.toBeInTheDocument();
    });

    const batchDeleteRequest = transport.mock.calls.find(
      ([request]) => request.path === "/PackagingRuleApi/RemoveBatchPackagingRuleDatas",
    );
    expect(batchDeleteRequest?.[0].body).toEqual([
      expect.objectContaining({ Id: 1, RuleCode: "RULE_001" }),
      expect.objectContaining({ Id: 2, RuleCode: "RULE_002" }),
    ]);
  });
});