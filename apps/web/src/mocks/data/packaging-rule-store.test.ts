import { beforeEach, describe, expect, it } from "vitest";
import type { DataResult } from "@/lib/api/http-client";
import {
  createPackagingRuleMockStore,
  packagingRuleMockRecords,
} from "@/mocks/data/packaging-rule-store";

function expectDataResult<T>(result: DataResult<T>) {
  expect(result).toMatchObject({
    Success: true,
    Code: "",
  });
}

describe("packaging rule mock store", () => {
  let store: ReturnType<typeof createPackagingRuleMockStore>;

  beforeEach(() => {
    store = createPackagingRuleMockStore();
  });

  it("returns paged packaging rules with basic filters", () => {
    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 1,
      RuleCode: "RULE_00",
      IsEnabled: true,
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0]).toMatchObject({
      RuleCode: "RULE_001",
      IsEnabled: true,
    });
    expect(result.TotalCount).toBe(2);
    expect(result.Record).toBe(1);
  });

  it("returns stable unpaged level and spec options", () => {
    const levelOptions = store.levelOptions();
    const specOptions = store.specOptions();

    expectDataResult(levelOptions);
    expectDataResult(specOptions);
    expect(levelOptions.Attach).toHaveLength(3);
    expect(specOptions.Attach).toHaveLength(3);
  });

  it("updates session data for create, update, delete, and batch delete", () => {
    const created = store.create({
      RuleCode: "RULE_999",
      RuleName: "Created rule",
      IsEnabled: true,
      IsDefault: false,
      Details: [
        {
          PackagingLevelCode: "LV003",
          SpecCode: "SP003",
          StandardQuantity: 5,
          MaxQuantity: 6,
          PackagingMethod: "manual",
        },
      ],
      Remark: "created",
    });

    expectDataResult(created);
    expect(created.Attach).toMatchObject({
      RuleCode: "RULE_999",
      Details: [
        expect.objectContaining({
          PackagingLevelName: "Carton",
          SpecName: "Bulk spec",
          Unit: "kg",
        }),
      ],
    });

    const updated = store.update({
      Id: created.Attach.Id,
      RuleCode: "RULE_999",
      RuleName: "Updated rule",
      IsEnabled: false,
      IsDefault: true,
      Details: [],
      Remark: "updated",
    });

    expectDataResult(updated);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        RuleCode: "RULE_999",
      }).Attach[0],
    ).toMatchObject({
      RuleName: "Updated rule",
      IsEnabled: false,
      IsDefault: true,
      Details: [],
      Remark: "updated",
    });

    const removed = store.remove(created.Attach);
    expectDataResult(removed);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        RuleCode: "RULE_999",
      }).Attach,
    ).toHaveLength(0);

    const batchTargets = packagingRuleMockRecords.slice(0, 2);
    const batchRemoved = store.removeBatch(batchTargets);
    expectDataResult(batchRemoved);

    const remainingIds = store
      .query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
      })
      .Attach.map((record) => record.Id);

    expect(remainingIds).not.toContain(batchTargets[0]?.Id);
    expect(remainingIds).not.toContain(batchTargets[1]?.Id);
  });

  it("reads and overwrites packaging rule config by rule code", () => {
    const queried = store.getConfig({ RuleCode: "RULE_001" });

    expectDataResult(queried);
    expect(queried.Attach).toHaveLength(1);
    expect(queried.Attach[0]).toMatchObject({
      RuleCode: "RULE_001",
      LabelPrintRule: {
        ReprintLimit: 3,
      },
    });

    const saved = store.saveConfig({
      RuleCode: "RULE_001",
      MixingRule: {
        ForbidDifferentProduct: false,
        ForbidDifferentBatch: false,
        ForbidDifferentWorkOrder: false,
        ForbidDifferentProductionTask: false,
        ForbidCrossQualityStatus: false,
      },
      LabelPrintRule: {
        ReprintLimit: 9,
        DefaultTemplate: "TPL-Z",
      },
      SealingRule: {
        TimeoutAlert: 45,
        AutoSealOnWorkOrderComplete: true,
        AutoSealOnTaskComplete: true,
        AutoSealOnFullBox: true,
      },
      ExceptionRule: {
        ForceClearOnCycleTool: true,
      },
    });

    expectDataResult(saved);
    expect(store.getConfig({ RuleCode: "RULE_001" }).Attach[0]).toMatchObject({
      LabelPrintRule: {
        ReprintLimit: 9,
        DefaultTemplate: "TPL-Z",
      },
      SealingRule: {
        TimeoutAlert: 45,
      },
    });
  });

  it("resets the session data back to the initial records and configs", () => {
    store.create({
      RuleCode: "RULE_RESET",
      RuleName: "Reset rule",
      IsEnabled: true,
      IsDefault: false,
      Details: [],
      Remark: "reset",
    });
    store.saveConfig({
      RuleCode: "RULE_RESET",
      MixingRule: {
        ForbidDifferentProduct: true,
      },
    });

    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        RuleCode: "RULE_RESET",
      }).Attach,
    ).toHaveLength(1);
    expect(store.getConfig({ RuleCode: "RULE_RESET" }).Attach).toHaveLength(1);

    store.reset();

    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        RuleCode: "RULE_RESET",
      }).Attach,
    ).toHaveLength(0);
    expect(store.getConfig({ RuleCode: "RULE_RESET" }).Attach).toHaveLength(0);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
      }).Attach,
    ).toHaveLength(packagingRuleMockRecords.length);
  });
});
