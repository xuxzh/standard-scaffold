import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataResult } from "@/lib/api/http-client";
import {
  createPackagingKitMockStore,
  packagingKitMockRecords,
} from "@/mocks/data/packaging-kit-store";

function expectDataResult<T>(result: DataResult<T>) {
  expect(result).toMatchObject({
    Success: true,
    Code: "",
  });
}

describe("packaging kit mock store", () => {
  let store: ReturnType<typeof createPackagingKitMockStore>;

  beforeEach(() => {
    store = createPackagingKitMockStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured mock record count for generated packaging kits and materials", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_MOCK_RECORD_COUNT", "12");

    const { createPackagingKitMockStore } = await import(
      "@/mocks/data/packaging-kit-store"
    );
    const configuredStore = createPackagingKitMockStore();
    const kits = configuredStore.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });
    const materials = configuredStore.queryMaterials({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(kits.Attach).toHaveLength(12);
    expect(kits.TotalCount).toBe(12);
    expect(materials.Attach).toHaveLength(12);
    expect(materials.TotalCount).toBe(12);
  });

  it("returns paged packaging kits with basic filters", () => {
    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 1,
      KitCode: "KIT00",
      KitName: "Starter",
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0]).toMatchObject({
      KitCode: "KIT001",
      KitName: "Starter Kit",
    });
    expect(result.TotalCount).toBe(1);
  });

  it("creates updates and deletes packaging kits while keeping child count in sync", () => {
    const created = store.create({
      KitCode: "KIT010",
      KitName: "Fresh Kit",
      MainMaterialCode: "MAT003",
      MainMaterialName: "Fresh Main",
      Unit: "set",
      IsVirtualMain: true,
      Children: [
        { Code: "CH010", Name: "Child X", Quantity: 1, Unit: "pcs" },
        { Code: "CH011", Name: "Child Y", Quantity: 2, Unit: "pcs" },
      ],
      Remark: "fresh",
    });

    expectDataResult(created);
    expect(created.Attach).toMatchObject({
      KitCode: "KIT010",
      ChildCount: 2,
    });

    const updated = store.update({
      NeedUpdateFields: {
        Id: created.Attach.Id,
        KitName: "Updated Fresh Kit",
        MainMaterialCode: "MAT004",
        MainMaterialName: "Updated Main",
        Unit: "box",
        IsVirtualMain: false,
        Children: [
          { Code: "CH099", Name: "Only Child", Quantity: 5, Unit: "pcs" },
        ],
        Remark: "updated",
      },
    });

    expectDataResult(updated);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        KitCode: "KIT010",
      }).Attach[0],
    ).toMatchObject({
      KitName: "Updated Fresh Kit",
      ChildCount: 1,
      MainMaterialCode: "MAT004",
    });

    const removed = store.remove(created.Attach);
    expectDataResult(removed);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        KitCode: "KIT010",
      }).Attach,
    ).toHaveLength(0);
  });

  it("supports batch delete and reset", () => {
    const batchTargets = packagingKitMockRecords.slice(0, 2);
    const removed = store.removeBatch(batchTargets);

    expectDataResult(removed);

    const remainingIds = store
      .query({ IsPaged: true, PageIndex: 1, PageSize: 20 })
      .Attach.map((record) => record.Id);

    expect(remainingIds).not.toContain(batchTargets[0]?.Id);
    expect(remainingIds).not.toContain(batchTargets[1]?.Id);

    store.reset();

    const resetResult = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(resetResult.Attach).toHaveLength(20);
    expect(resetResult.TotalCount).toBe(packagingKitMockRecords.length);
  });

  it("queries material options and preserves default child unit fallback source data", () => {
    const fallbackStore = createPackagingKitMockStore(undefined, [
      {
        Id: 99,
        MaterialCode: "MAT099",
        MaterialName: "Fallback Material",
        Unit: "",
        MaterialTypeName: "RM",
      },
    ]);
    const result = fallbackStore.queryMaterials({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 10,
      MaterialCode: "MAT",
      MaterialName: "Material",
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0]).toMatchObject({
      MaterialCode: "MAT099",
      Unit: "",
    });

    const created = fallbackStore.create({
      KitCode: "KIT099",
      KitName: "Fallback Kit",
      MainMaterialCode: "MAT001",
      MainMaterialName: "Main Material",
      Unit: "set",
      IsVirtualMain: false,
      Children: [
        {
          Code: "MAT099",
          Name: "Fallback Material",
          Quantity: 1,
          Unit: result.Attach[0]?.Unit || "set",
        },
      ],
      Remark: "",
    });

    expectDataResult(created);
    expect(created.Attach.Children).toEqual([
      expect.objectContaining({
        Code: "MAT099",
        Unit: "set",
      }),
    ]);
  });
});
