import { describe, expect, it } from "vitest";
import { createMaterialPackagingRelationMockStore } from "@/mocks/data/material-packaging-relation-store";

describe("material packaging relation mock store", () => {
  it("queries with pagination", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 2,
    });

    expect(result.Success).toBe(true);
    expect(result.Attach).toHaveLength(2);
    expect(result.TotalCount).toBe(4);
  });

  it("filters by material code", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.query({
      MaterialCode: "MAT_001",
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach).toHaveLength(2);
    expect(result.Attach.every((r) => r.MaterialCode === "MAT_001")).toBe(true);
  });

  it("filters by packaging rule code", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.query({
      PackagingRuleCode: "RULE_001",
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach).toHaveLength(2);
  });

  it("creates a record", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.create({
      MaterialCode: "MAT_NEW",
      MaterialName: "New Material",
      PackagingRuleCode: "RULE_001",
      PackagingRuleName: "Default Rule",
      Details: [],
      Remark: "",
    });

    expect(result.Success).toBe(true);
    expect(result.Attach.Id).toBeGreaterThan(0);
    expect(result.Attach.MaterialCode).toBe("MAT_NEW");
  });

  it("updates a record via NeedUpdateFields", () => {
    const store = createMaterialPackagingRelationMockStore();
    store.update({
      NeedUpdateFields: {
        Id: 1,
        MaterialCode: "MAT_001",
        MaterialName: "Updated Material",
        PackagingRuleCode: "RULE_001",
        PackagingRuleName: "Default Rule",
        Details: [],
        Remark: "updated",
      },
    });

    const result = store.query({
      MaterialCode: "MAT_001",
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    const updated = result.Attach.find((r) => r.Id === 1);
    expect(updated?.MaterialName).toBe("Updated Material");
    expect(updated?.Remark).toBe("updated");
  });

  it("removes a single record", () => {
    const store = createMaterialPackagingRelationMockStore();
    store.remove({ Id: 1 });

    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach.find((r) => r.Id === 1)).toBeUndefined();
    expect(result.TotalCount).toBe(3);
  });

  it("removes records in batch", () => {
    const store = createMaterialPackagingRelationMockStore();
    store.removeBatch([{ Id: 1 }, { Id: 2 }]);

    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.TotalCount).toBe(2);
  });

  it("resets to seed data", () => {
    const store = createMaterialPackagingRelationMockStore();
    store.remove({ Id: 1 });
    store.remove({ Id: 2 });
    store.reset();

    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.TotalCount).toBe(4);
  });

  it("queries materials with filtering", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.queryMaterials({
      MaterialCode: "MAT_001",
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0].MaterialCode).toBe("MAT_001");
  });

  it("queries packaging rules with filtering", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.queryPackagingRules({
      RuleCode: "RULE",
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach.length).toBeGreaterThan(0);
  });

  it("handles records with details for flattening", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.query({
      MaterialCode: "MAT_001",
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    // Record 1 has 1 detail, Record 3 has 2 details
    const detailCounts = result.Attach.map((r) => r.Details.length);
    expect(detailCounts).toContain(1);
    expect(detailCounts).toContain(2);
  });

  it("handles records with empty details", () => {
    const store = createMaterialPackagingRelationMockStore();
    const result = store.query({
      MaterialCode: "MAT_003",
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0].Details).toHaveLength(0);
  });
});
