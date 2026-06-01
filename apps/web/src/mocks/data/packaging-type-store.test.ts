import { beforeEach, describe, expect, it } from "vitest";
import type { DataResult } from "@/lib/api/http-client";
import {
  createPackagingTypeMockStore,
  packagingTypeMockRecords,
} from "@/mocks/data/packaging-type-store";
import type { PackagingTypeApiDto } from "@/features/mes/packaging/packaging-type/packaging-contract";

function expectDataResult<T>(result: DataResult<T>) {
  expect(result).toMatchObject({
    Success: true,
    Code: "",
    Message: "[MES] 获取数据成功！",
  });
}

describe("packaging type mock store", () => {
  let store: ReturnType<typeof createPackagingTypeMockStore>;

  beforeEach(() => {
    store = createPackagingTypeMockStore();
  });

  it("returns paged packaging types with basic filters", () => {
    const result = store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 1,
      TypeCode: "PKG_TYPE_001",
      IsRecyclable: true,
    });

    expectDataResult(result);
    expect(result.Attach).toHaveLength(1);
    expect(result.Attach[0]).toMatchObject({
      TypeCode: "PKG_TYPE_001",
      IsRecyclable: true,
    });
    expect(result.TotalCount).toBe(1);
    expect(result.Record).toBe(1);
  });

  it("updates the session data for create, update, single delete, and batch delete", () => {
    const created = store.create({
      TypeCode: "PKG_TYPE_NEW",
      TypeName: "周转箱",
      IsRecyclable: true,
      Description: "新增 mock 包装类型",
      Remark: "",
    });

    expectDataResult(created);
    expect(created.Attach).toMatchObject({
      TypeCode: "PKG_TYPE_NEW",
      TypeName: "周转箱",
    });

    const updated = store.update({
      NeedUpdateFields: {
        Id: created.Attach.Id,
        TypeName: "可循环周转箱",
        IsRecyclable: false,
        Description: "已更新",
      },
    });

    expectDataResult(updated);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        TypeCode: "PKG_TYPE_NEW",
      }).Attach[0],
    ).toMatchObject({
      TypeName: "可循环周转箱",
      IsRecyclable: false,
      Description: "已更新",
    });

    const removed = store.remove(created.Attach);
    expectDataResult(removed);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        TypeCode: "PKG_TYPE_NEW",
      }).Attach,
    ).toHaveLength(0);

    const batchTargets = packagingTypeMockRecords.slice(0, 2);
    const batchRemoved = store.removeBatch(batchTargets);
    expectDataResult(batchRemoved);

    const remainingIds = store
      .query({ IsPaged: true, PageIndex: 1, PageSize: 20 })
      .Attach.map((record: PackagingTypeApiDto) => record.Id);

    expect(remainingIds).not.toContain(batchTargets[0]?.Id);
    expect(remainingIds).not.toContain(batchTargets[1]?.Id);
  });

  it("resets the session data back to the initial packaging type records", () => {
    const created = store.create({
      TypeCode: "PKG_TYPE_RESET",
      TypeName: "待重置包装",
      IsRecyclable: true,
      Description: "reset me",
      Remark: "",
    });

    expect(created.Attach.TypeCode).toBe("PKG_TYPE_RESET");
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        TypeCode: "PKG_TYPE_RESET",
      }).Attach,
    ).toHaveLength(1);

    store.reset();

    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
        TypeCode: "PKG_TYPE_RESET",
      }).Attach,
    ).toHaveLength(0);
    expect(
      store.query({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 20,
      }).Attach,
    ).toHaveLength(packagingTypeMockRecords.length);
  });
});
