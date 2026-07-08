import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataResult } from "@/lib/api/http-client";
import {
  createPackagingSpecMockStore,
  packagingSpecMockRecords,
} from "@/mocks/data/packaging-spec-store";

function expectDataResult<T>(result: DataResult<T>) {
  expect(result).toMatchObject({
    Success: true,
    Code: "",
  });
}

describe("packaging spec mock store", () => {
  let store: ReturnType<typeof createPackagingSpecMockStore>;

  beforeEach(() => {
    store = createPackagingSpecMockStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured mock record count for generated packaging specs", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_MOCK_RECORD_COUNT", "12");

    const { createPackagingSpecMockStore } = await import(
      "@/mocks/data/packaging-spec-store"
    );
    const configuredStore = createPackagingSpecMockStore();
    const result = configuredStore.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach).toHaveLength(12);
    expect(result.TotalCount).toBe(12);
  });

  it("returns filtered and paged packaging specs", () => {
    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 1,
      SpecCode: "SPEC-00",
      SpecName: "Carton",
      PackagingTypeCode: "TYPE-001",
      IsEnabled: true,
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0]).toMatchObject({
      SpecCode: "SPEC-001",
      PackagingTypeCode: "TYPE-001",
      IsEnabled: true,
    });
    expect(result.TotalCount).toBe(1);
  });

  it("returns unpaged rows for option-driven reads", () => {
    const result = store.query({
      IsPaged: false,
      PageIndex: 1,
      PageSize: 1000,
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(packagingSpecMockRecords.length);
    expect(result.TotalCount).toBe(packagingSpecMockRecords.length);
  });

  it("supports create, update, single delete, and batch delete", () => {
    const created = store.create({
      SpecCode: "SPEC-999",
      SpecName: "New Spec",
      PackagingTypeCode: "TYPE-003",
      PackagingTypeName: "Bag",
      BarcodeRuleCode: "BAR-003",
      BarcodeRuleName: "Export Barcode",
      Length: 10,
      Width: 20,
      Height: 30,
      Volume: 0.006,
      MaxWeight: 8,
      GrossWeight: 7,
      TareWeight: 1,
      StandardCapacity: 12,
      StackLimit: 4,
      Unit: "EA",
      IsEnabled: true,
      Remark: "",
    });

    expectDataResult(created);
    expect(created.Attach).toMatchObject({
      SpecCode: "SPEC-999",
      PackagingTypeName: "Bag",
    });

    const updated = store.update({
      NeedUpdateFields: {
        Id: created.Attach.Id,
        SpecName: "Updated Spec",
        PackagingTypeCode: "TYPE-002",
        PackagingTypeName: "Pallet",
        BarcodeRuleCode: "BAR-004",
        BarcodeRuleName: "Updated Barcode",
        Length: 12,
        Width: 22,
        Height: 32,
        Volume: 0.008448,
        MaxWeight: 9,
        GrossWeight: 8,
        TareWeight: 1,
        StandardCapacity: 15,
        StackLimit: 5,
        Unit: "PCS",
        IsEnabled: false,
      },
    });

    expectDataResult(updated);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        SpecCode: "SPEC-999",
      }).Attach[0],
    ).toMatchObject({
      SpecName: "Updated Spec",
      PackagingTypeCode: "TYPE-002",
      Unit: "PCS",
      IsEnabled: false,
    });

    const removed = store.remove(created.Attach);

    expectDataResult(removed);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        SpecCode: "SPEC-999",
      }).Attach,
    ).toHaveLength(0);

    const batchRemoved = store.removeBatch(
      packagingSpecMockRecords.slice(0, 2),
    );

    expectDataResult(batchRemoved);

    const remainingIds = store
      .query({ IsPaged: true, PageIndex: 1, PageSize: 20 })
      .Attach.map((record) => record.Id);

    expect(remainingIds).not.toContain(packagingSpecMockRecords[0]?.Id);
    expect(remainingIds).not.toContain(packagingSpecMockRecords[1]?.Id);
  });

  it("resets the store back to seed records", () => {
    store.create({
      SpecCode: "SPEC-RESET",
      SpecName: "Reset Spec",
      PackagingTypeCode: "TYPE-003",
      PackagingTypeName: "Bag",
      BarcodeRuleCode: "BAR-003",
      BarcodeRuleName: "Export Barcode",
      Length: 10,
      Width: 20,
      Height: 30,
      Volume: 0.006,
      MaxWeight: 8,
      GrossWeight: 7,
      TareWeight: 1,
      StandardCapacity: 12,
      StackLimit: 4,
      Unit: "EA",
      IsEnabled: true,
      Remark: "",
    });

    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        SpecCode: "SPEC-RESET",
      }).Attach,
    ).toHaveLength(1);

    store.reset();

    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        SpecCode: "SPEC-RESET",
      }).Attach,
    ).toHaveLength(0);
    const resetResult = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(resetResult.Attach).toHaveLength(20);
    expect(resetResult.TotalCount).toBe(packagingSpecMockRecords.length);
  });
});
