import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  resetWmsTransportForTests,
  setWmsTransportForTests,
} from "@/lib/api/wms-client";
import type { MaterialPackagingRelationApiDto } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import {
  createMaterialPackagingRelation,
  deleteMaterialPackagingRelation,
  deleteMaterialPackagingRelations,
  getMaterialOptions,
  getMaterialPackagingRelations,
  getPackagingRuleOptions,
  updateMaterialPackagingRelation,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-service";

const materialPackagingRelationDto: MaterialPackagingRelationApiDto = {
  Id: 1,
  MaterialCode: "MAT_001",
  MaterialName: "Test Material",
  PackagingRuleCode: "RULE_001",
  PackagingRuleName: "Default Rule",
  Details: [
    {
      LevelSequence: 1,
      PackagingLevelCode: "LV001",
      PackagingLevelName: "Unit",
      SpecCode: "SP001",
      SpecName: "Standard spec",
      Quantity: 10,
      Unit: "pcs",
      PackagingTypeName: "Carton",
      BoxLabelPrintTemplate: "TPL_A",
      PackingListPrintTemplate: "",
    },
  ],
  Remark: "test",
  CreatorUserName: "admin",
  CompanyCode: "RUIHUI",
  FactoryCode: "DEFAULT",
  CreationTime: "2026-05-29T10:00:00",
  LastModificationTime: null,
};

const deletePayload = {
  Id: 1,
  MaterialCode: "MAT_001",
  MaterialName: "Test Material",
  PackagingRuleCode: "RULE_001",
  PackagingRuleName: "Default Rule",
  Details: [
    {
      LevelSequence: 1,
      PackagingLevelCode: "LV001",
      PackagingLevelName: "Unit",
      SpecCode: "SP001",
      SpecName: "Standard spec",
      Quantity: 10,
      Unit: "pcs",
      PackagingTypeName: "Carton",
      BoxLabelPrintTemplate: "TPL_A",
      PackingListPrintTemplate: "",
    },
  ],
  Remark: "test",
  CreatorUserName: "admin",
  CreationTime: "2026-05-29T10:00:00",
  LastModificationTime: null,
};

afterEach(() => {
  resetWmsTransportForTests();
});

describe("material packaging relation service", () => {
  it("queries material packaging relations with pagination", async () => {
    const result: DataResult<MaterialPackagingRelationApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [materialPackagingRelationDto],
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
      getMaterialPackagingRelations({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        MaterialCode: "MAT",
        MaterialName: "Test",
        PackagingRuleCode: "RULE",
        PackagingRuleName: "Default",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        MaterialCode: "MAT",
        MaterialName: "Test",
        PackagingRuleCode: "RULE",
        PackagingRuleName: "Default",
      },
      signal: undefined,
    });
  });

  it("queries material options with pagination", async () => {
    const result: DataResult<
      Array<{ MaterialCode: string; MaterialName: string; Unit?: string | null; MaterialTypeName?: string | null }>
    > = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [
        {
          MaterialCode: "MAT_001",
          MaterialName: "Test Material",
          Unit: "pcs",
          MaterialTypeName: "Raw",
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
      getMaterialOptions({
        MaterialCode: "MAT",
        MaterialName: "Test",
        IsPaged: true,
        PageIndex: 1,
        PageSize: 50,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
      body: {
        MaterialCode: "MAT",
        MaterialName: "Test",
        IsPaged: true,
        PageIndex: 1,
        PageSize: 50,
      },
      signal: undefined,
    });
  });

  it("queries packaging rule options with pagination", async () => {
    const result: DataResult<
      Array<{
        RuleCode: string;
        RuleName: string;
        Details?: Array<{
          PackagingLevelCode: string;
          PackagingLevelName?: string | null;
          LevelSequence?: number | null;
          SpecCode: string;
          SpecName?: string | null;
          StandardQuantity: number;
          Unit?: string | null;
          PackagingTypeName?: string | null;
        }> | null;
      }>
    > = {
      Success: true,
      Code: "",
      Message: "[WMS] Query success",
      Attach: [
        {
          RuleCode: "RULE_001",
          RuleName: "Default Rule",
          Details: [
            {
              PackagingLevelCode: "LV001",
              PackagingLevelName: "Unit",
              LevelSequence: 1,
              SpecCode: "SP001",
              SpecName: "Standard spec",
              StandardQuantity: 10,
              Unit: "pcs",
              PackagingTypeName: "Carton",
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
      getPackagingRuleOptions({
        RuleCode: "RULE",
        RuleName: "Default",
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas",
      body: {
        RuleCode: "RULE",
        RuleName: "Default",
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
      },
      signal: undefined,
    });
  });

  it("creates a material packaging relation", async () => {
    const result: DataResult<MaterialPackagingRelationApiDto> = {
      Success: true,
      Code: "",
      Message: "[WMS] Save success",
      Attach: materialPackagingRelationDto,
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
      createMaterialPackagingRelation({
        materialCode: "MAT_001",
        materialName: "Test Material",
        packagingRuleCode: "RULE_001",
        packagingRuleName: "Default Rule",
        remark: "test",
        details: [
          {
            levelSequence: "1",
            packagingLevelCode: "LV001",
            packagingLevelName: "Unit",
            specCode: "SP001",
            specName: "Standard spec",
            quantity: "10",
            unit: "pcs",
            packagingTypeName: "Carton",
            boxLabelPrintTemplate: "TPL_A",
            packingListPrintTemplate: "",
          },
        ],
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialPackagingRelationApi/StoreMaterialPackagingRelationData",
      body: {
        MaterialCode: "MAT_001",
        MaterialName: "Test Material",
        PackagingRuleCode: "RULE_001",
        PackagingRuleName: "Default Rule",
        Remark: "test",
        Details: [
          {
            LevelSequence: 1,
            PackagingLevelCode: "LV001",
            PackagingLevelName: "Unit",
            SpecCode: "SP001",
            SpecName: "Standard spec",
            Quantity: 10,
            Unit: "pcs",
            PackagingTypeName: "Carton",
            BoxLabelPrintTemplate: "TPL_A",
            PackingListPrintTemplate: "",
          },
        ],
      },
      signal: undefined,
    });
  });

  it("updates a material packaging relation with NeedUpdateFields wrapper", async () => {
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
      updateMaterialPackagingRelation({
        id: 1,
        materialCode: "MAT_001",
        materialName: "Updated Material",
        packagingRuleCode: "RULE_001",
        packagingRuleName: "Default Rule",
        remark: "updated",
        details: [
          {
            levelSequence: "1",
            packagingLevelCode: "LV001",
            packagingLevelName: "Unit",
            specCode: "SP001",
            specName: "Standard spec",
            quantity: "20",
            unit: "pcs",
            packagingTypeName: "Carton",
            boxLabelPrintTemplate: "TPL_B",
            packingListPrintTemplate: "TPL_PACK",
          },
        ],
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialPackagingRelationApi/UpdateMaterialPackagingRelationData",
      body: {
        NeedUpdateFields: {
          Id: 1,
          MaterialCode: "MAT_001",
          MaterialName: "Updated Material",
          PackagingRuleCode: "RULE_001",
          PackagingRuleName: "Default Rule",
          Remark: "updated",
          Details: [
            {
              LevelSequence: 1,
              PackagingLevelCode: "LV001",
              PackagingLevelName: "Unit",
              SpecCode: "SP001",
              SpecName: "Standard spec",
              Quantity: 20,
              Unit: "pcs",
              PackagingTypeName: "Carton",
              BoxLabelPrintTemplate: "TPL_B",
              PackingListPrintTemplate: "TPL_PACK",
            },
          ],
        },
      },
      signal: undefined,
    });
  });

  it("deletes a single material packaging relation after stripping company scope fields", async () => {
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

    await expect(
      deleteMaterialPackagingRelation(materialPackagingRelationDto),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData",
      body: deletePayload,
      signal: undefined,
    });
  });

  it("deletes material packaging relations in batch after stripping company scope fields", async () => {
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

    await expect(
      deleteMaterialPackagingRelations([materialPackagingRelationDto]),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas",
      body: [deletePayload],
      signal: undefined,
    });
  });
});
