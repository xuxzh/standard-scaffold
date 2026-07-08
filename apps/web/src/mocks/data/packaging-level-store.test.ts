import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataResult } from "@/lib/api/http-client";
import {
  createPackagingLevelMockStore,
  packagingLevelMockRecords,
} from "@/mocks/data/packaging-level-store";
import type {
  PackagingLevelApiDto,
  PackagingLevelTreeDto,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";

function expectDataResult<T>(result: DataResult<T>) {
  expect(result).toMatchObject({
    Success: true,
    Code: "",
  });
}

describe("packaging level mock store", () => {
  let store: ReturnType<typeof createPackagingLevelMockStore>;

  beforeEach(() => {
    store = createPackagingLevelMockStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured mock record count for generated packaging levels", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_MOCK_RECORD_COUNT", "12");

    const { createPackagingLevelMockStore } = await import(
      "@/mocks/data/packaging-level-store"
    );
    const configuredStore = createPackagingLevelMockStore();
    const result = configuredStore.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(result.Attach).toHaveLength(12);
    expect(result.TotalCount).toBe(12);
  });

  it("returns paged packaging levels with basic filters", () => {
    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 1,
      LevelCode: "LV00",
      ParentLevelCode: "LV001",
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0]).toMatchObject({
      LevelCode: "LV002",
      ParentLevelCode: "LV001",
    });
    expect(result.TotalCount).toBe(2);
    expect(result.Record).toBe(1);
  });

  it("returns unpaged options for current store data", () => {
    const result = store.query({
      IsPaged: false,
      PageIndex: 1,
      PageSize: 1000,
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(packagingLevelMockRecords.length);
    expect(result.TotalCount).toBe(packagingLevelMockRecords.length);
  });

  it("updates the session data for create, update, single delete, and batch delete", () => {
    const created = store.create({
      LevelCode: "LV999",
      LevelName: "PALLET",
      ParentLevelCode: "LV003",
      ParentLevelName: "CARTON",
      Description: "New outer packaging",
      Remark: "",
    });

    expectDataResult(created);
    expect(created.Attach).toMatchObject({
      LevelCode: "LV999",
      ParentLevelName: "CARTON",
    });

    const updated = store.update({
      NeedUpdateFields: {
        Id: created.Attach.Id,
        LevelName: "UPDATED PALLET",
        ParentLevelCode: "LV004",
        ParentLevelName: "BAG",
        Description: "Updated description",
      },
    });

    expectDataResult(updated);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        LevelCode: "LV999",
      }).Attach[0],
    ).toMatchObject({
      LevelName: "UPDATED PALLET",
      ParentLevelCode: "LV004",
      ParentLevelName: "BAG",
      Description: "Updated description",
    });

    const removed = store.remove(created.Attach);
    expectDataResult(removed);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        LevelCode: "LV999",
      }).Attach,
    ).toHaveLength(0);

    const batchTargets = packagingLevelMockRecords.slice(0, 2);
    const batchRemoved = store.removeBatch(batchTargets);
    expectDataResult(batchRemoved);

    const remainingIds = store
      .query({ IsPaged: true, PageIndex: 1, PageSize: 20 })
      .Attach.map((record: PackagingLevelApiDto) => record.Id);

    expect(remainingIds).not.toContain(batchTargets[0]?.Id);
    expect(remainingIds).not.toContain(batchTargets[1]?.Id);
  });

  it("builds packaging level tree from parent relations", () => {
    const result = store.tree();

    expectDataResult(result);
    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0]).toMatchObject({
      LevelCode: "LV001",
      Children: [
        expect.objectContaining({
          LevelCode: "LV002",
        }),
        expect.objectContaining({
          LevelCode: "LV004",
        }),
      ],
    });

    const root = result.Attach[0];

    expect(root).toBeDefined();

    const carton = (root?.Children ?? []).find(
      (node: PackagingLevelTreeDto) => node.LevelCode === "LV002",
    );

    expect(carton?.Children).toEqual([
      expect.objectContaining({
        LevelCode: "LV003",
      }),
    ]);
  });

  it("resets the session data back to the initial packaging level records", () => {
    const created = store.create({
      LevelCode: "LV_RESET",
      LevelName: "RESET NODE",
      ParentLevelCode: "LV003",
      ParentLevelName: "CARTON",
      Description: "reset me",
      Remark: "",
    });

    expect(created.Attach.LevelCode).toBe("LV_RESET");
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        LevelCode: "LV_RESET",
      }).Attach,
    ).toHaveLength(1);

    store.reset();

    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        LevelCode: "LV_RESET",
      }).Attach,
    ).toHaveLength(0);
    const resetResult = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    });

    expect(resetResult.Attach).toHaveLength(20);
    expect(resetResult.TotalCount).toBe(packagingLevelMockRecords.length);
  });
});
