import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
import {
  createPackagingRule,
  deletePackagingRule,
  deletePackagingRules,
  getPackagingRuleConfig,
  getPackagingRuleLevelOptions,
  getPackagingRuleSpecOptions,
  getPackagingRules,
  savePackagingRuleConfig,
  updatePackagingRule,
  type PackagingRuleApiDto,
  type PackagingRuleConfigApiDto,
} from "@/features/wms/packaging/packaging-rule/packaging-rule-service";

type PackagingRuleDetailWithStringMethod = Omit<
  NonNullable<PackagingRuleApiDto["Details"]>[number],
  "PackagingMethod"
> & {
  PackagingMethod: string;
};

const packagingRuleDto: PackagingRuleApiDto = {
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
  Remark: "",
  CreatorUserName: "admin",
  CompanyCode: "RUIHUI",
  FactoryCode: "DEFAULT",
  CreationTime: "2026-05-29T10:00:00",
  LastModificationTime: null,
};

const packagingRuleDeletePayload = {
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
  Remark: "",
  CreatorUserName: "admin",
  CreationTime: "2026-05-29T10:00:00",
  LastModificationTime: null,
};

afterEach(() => {
  resetWmsTransportForTests();
});

describe("packaging rule service", () => {
  it("queries packaging rules with pagination and normalizes packaging method", async () => {
    const result: DataResult<
      Array<
        Omit<PackagingRuleApiDto, "Details"> & {
          Details: PackagingRuleDetailWithStringMethod[];
        }
      >
    > = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [
        {
          ...packagingRuleDto,
          Details: [
            {
              ...packagingRuleDto.Details![0],
              PackagingMethod: "\u81ea\u52a8",
            },
          ],
        },
      ],
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
      getPackagingRules({
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        RuleCode: "RULE",
        RuleName: "Default",
        IsDefault: true,
        IsEnabled: true,
      }),
    ).resolves.toMatchObject({
      Attach: [
        {
          Details: [
            {
              PackagingMethod: "auto",
            },
          ],
        },
      ],
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 2,
        PageSize: 20,
        RuleCode: "RULE",
        RuleName: "Default",
        IsDefault: true,
        IsEnabled: true,
      },
      signal: undefined,
    });
  });

  it("queries packaging level options with fixed unpaged parameters", async () => {
    const result = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [
        {
          Id: 1,
          LevelCode: "LV001",
          LevelName: "Unit",
          LevelSequence: 1,
        },
      ],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

    await expect(getPackagingRuleLevelOptions()).resolves.toEqual(result);

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

  it("queries packaging spec options with fixed unpaged parameters", async () => {
    const result = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [
        {
          Id: 1,
          SpecCode: "SP001",
          SpecName: "Standard spec",
          Unit: "pcs",
          PackagingTypeName: "Carton",
        },
      ],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setWmsTransportForTests(transport);

    await expect(getPackagingRuleSpecOptions()).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas",
      body: {
        IsPaged: false,
        PageIndex: 1,
        PageSize: 1000,
      },
      signal: undefined,
    });
  });

  it("creates a packaging rule and maps packaging method protocol values", async () => {
    const result: DataResult<PackagingRuleApiDto> = {
      Success: true,
      Code: "",
      Message: "[WMS] Save success",
      Attach: packagingRuleDto,
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
      createPackagingRule({
        ruleCode: "RULE_001",
        ruleName: "Default packaging rule",
        isEnabled: true,
        isDefault: false,
        remark: "note",
        details: [
          {
            packagingLevelCode: "LV001",
            specCode: "SP001",
            standardQuantity: "10",
            maxQuantity: "12",
            packagingMethod: "auto",
          },
        ],
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingRuleApi/StorePackagingRuleData",
      body: {
        RuleCode: "RULE_001",
        RuleName: "Default packaging rule",
        IsEnabled: true,
        IsDefault: false,
        Details: [
          {
            Id: undefined,
            PackagingLevelCode: "LV001",
            SpecCode: "SP001",
            StandardQuantity: 10,
            MaxQuantity: 12,
            PackagingMethod: "\u81ea\u52a8",
          },
        ],
        Remark: "note",
      },
      signal: undefined,
    });
  });

  it("updates a packaging rule with the full current details array", async () => {
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
      updatePackagingRule({
        id: 1,
        ruleCode: "RULE_001",
        ruleName: "Updated packaging rule",
        isEnabled: false,
        isDefault: true,
        remark: "changed",
        details: [
          {
            id: 11,
            packagingLevelCode: "LV001",
            specCode: "SP001",
            standardQuantity: "20",
            maxQuantity: "24",
            packagingMethod: "manual",
          },
        ],
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingRuleApi/UpdatePackagingRuleData",
      body: {
        Id: 1,
        RuleCode: "RULE_001",
        RuleName: "Updated packaging rule",
        IsEnabled: false,
        IsDefault: true,
        Details: [
          {
            Id: 11,
            PackagingLevelCode: "LV001",
            SpecCode: "SP001",
            StandardQuantity: 20,
            MaxQuantity: 24,
            PackagingMethod: "\u624b\u52a8",
          },
        ],
        Remark: "changed",
      },
      signal: undefined,
    });
  });

  it("deletes a single packaging rule after stripping company scope fields", async () => {
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

    await expect(deletePackagingRule(packagingRuleDto)).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingRuleApi/RemovePackagingRuleData",
      body: packagingRuleDeletePayload,
      signal: undefined,
    });
  });

  it("deletes packaging rules in batch after stripping company scope fields", async () => {
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

    await expect(deletePackagingRules([packagingRuleDto])).resolves.toEqual(
      result,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingRuleApi/RemoveBatchPackagingRuleDatas",
      body: [packagingRuleDeletePayload],
      signal: undefined,
    });
  });

  it("reads packaging rule config from the first attach record and falls back to defaults", async () => {
    const configResult: DataResult<PackagingRuleConfigApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [
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
      ],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const emptyResult: DataResult<PackagingRuleConfigApiDto[]> = {
      ...configResult,
      Attach: [],
      TotalCount: 0,
      Record: 0,
    };
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({ status: 200, data: configResult })
      .mockResolvedValueOnce({ status: 200, data: emptyResult });

    setWmsTransportForTests(transport);

    await expect(
      getPackagingRuleConfig({
        RuleCode: "RULE_001",
        IsPaged: false,
        PageIndex: 1,
        PageSize: 10,
      }),
    ).resolves.toEqual({
      ruleCode: "RULE_001",
      mixingRule: {
        forbidDifferentProduct: true,
        forbidDifferentBatch: false,
        forbidDifferentWorkOrder: true,
        forbidDifferentProductionTask: false,
        forbidCrossQualityStatus: true,
      },
      labelPrintRule: {
        reprintLimit: "3",
        defaultTemplate: "TPL-A",
      },
      sealingRule: {
        timeoutAlert: "15",
        autoSealOnWorkOrderComplete: true,
        autoSealOnTaskComplete: false,
        autoSealOnFullBox: true,
      },
      exceptionRule: {
        forceClearOnCycleTool: true,
      },
    });

    await expect(
      getPackagingRuleConfig({
        RuleCode: "RULE_EMPTY",
        IsPaged: false,
        PageIndex: 1,
        PageSize: 10,
      }),
    ).resolves.toEqual({
      ruleCode: "RULE_EMPTY",
      mixingRule: {
        forbidDifferentProduct: false,
        forbidDifferentBatch: false,
        forbidDifferentWorkOrder: false,
        forbidDifferentProductionTask: false,
        forbidCrossQualityStatus: false,
      },
      labelPrintRule: {
        reprintLimit: "0",
        defaultTemplate: "",
      },
      sealingRule: {
        timeoutAlert: "0",
        autoSealOnWorkOrderComplete: false,
        autoSealOnTaskComplete: false,
        autoSealOnFullBox: false,
      },
      exceptionRule: {
        forceClearOnCycleTool: false,
      },
    });

    expect(transport).toHaveBeenNthCalledWith(1, {
      method: "POST",
      path: "/PackagingRuleApi/GetPackagingRuleConfigByRuleCode",
      body: {
        RuleCode: "RULE_001",
        IsPaged: false,
        PageIndex: 1,
        PageSize: 10,
      },
      signal: undefined,
    });
  });

  it("saves packaging rule config as a full overwrite payload", async () => {
    const result: DataResult<null> = {
      Success: true,
      Code: "",
      Message: "[WMS] Save success",
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
      savePackagingRuleConfig({
        ruleCode: "RULE_001",
        mixingRule: {
          forbidDifferentProduct: true,
          forbidDifferentBatch: true,
          forbidDifferentWorkOrder: false,
          forbidDifferentProductionTask: true,
          forbidCrossQualityStatus: false,
        },
        labelPrintRule: {
          reprintLimit: "2",
          defaultTemplate: "TPL-B",
        },
        sealingRule: {
          timeoutAlert: "30",
          autoSealOnWorkOrderComplete: false,
          autoSealOnTaskComplete: true,
          autoSealOnFullBox: true,
        },
        exceptionRule: {
          forceClearOnCycleTool: true,
        },
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingRuleApi/StorePackagingRuleConfig",
      body: {
        RuleCode: "RULE_001",
        MixingRule: {
          ForbidDifferentProduct: true,
          ForbidDifferentBatch: true,
          ForbidDifferentWorkOrder: false,
          ForbidDifferentProductionTask: true,
          ForbidCrossQualityStatus: false,
        },
        LabelPrintRule: {
          ReprintLimit: 2,
          DefaultTemplate: "TPL-B",
        },
        SealingRule: {
          TimeoutAlert: 30,
          AutoSealOnWorkOrderComplete: false,
          AutoSealOnTaskComplete: true,
          AutoSealOnFullBox: true,
        },
        ExceptionRule: {
          ForceClearOnCycleTool: true,
        },
      },
      signal: undefined,
    });
  });
});
