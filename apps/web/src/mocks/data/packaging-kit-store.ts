import type { DataResult } from "@/lib/api/http-client";
import type {
  PackagingKitApiDto,
  PackagingKitListQuery,
  PackagingKitMaterialApiDto,
  PackagingKitMaterialListQuery,
} from "@/features/wms/packaging/packaging-kit/packaging-kit-contract";

type PackagingKitMockRecord = PackagingKitApiDto & {
  CompanyCode?: string;
  FactoryCode?: string;
};

export type CreatePackagingKitPayload = {
  KitCode: string;
  KitName: string;
  MainMaterialCode: string;
  MainMaterialName: string;
  Unit: string;
  IsVirtualMain: boolean;
  Children: Array<{
    Code: string;
    Name: string;
    Quantity: number;
    Unit?: string | null;
  }>;
  Remark?: string | null;
};

export type UpdatePackagingKitPayload = {
  NeedUpdateFields: {
    Id: number;
    KitName?: string;
    MainMaterialCode?: string;
    MainMaterialName?: string;
    Unit?: string;
    IsVirtualMain?: boolean;
    Children?: Array<{
      Code: string;
      Name: string;
      Quantity: number;
      Unit?: string | null;
    }>;
    Remark?: string | null;
  };
};

export const packagingKitMaterialMockRecords: PackagingKitMaterialApiDto[] = [
  {
    Id: 1,
    MaterialCode: "MAT001",
    MaterialName: "Main Material",
    Unit: "set",
    MaterialTypeName: "FG",
  },
  {
    Id: 2,
    MaterialCode: "MAT002",
    MaterialName: "Accessory Material",
    Unit: "pcs",
    MaterialTypeName: "RM",
  },
  {
    Id: 3,
    MaterialCode: "MAT003",
    MaterialName: "Packaging Material",
    Unit: "box",
    MaterialTypeName: "PKG",
  },
];

export const packagingKitMockRecords: PackagingKitMockRecord[] = [
  {
    Id: 1,
    KitCode: "KIT001",
    KitName: "Starter Kit",
    MainMaterialCode: "MAT001",
    MainMaterialName: "Main Material",
    Unit: "set",
    IsVirtualMain: false,
    ChildCount: 2,
    Children: [
      { Code: "MAT002", Name: "Accessory Material", Quantity: 2, Unit: "pcs" },
      { Code: "MAT003", Name: "Packaging Material", Quantity: 1, Unit: "box" },
    ],
    Remark: "standard",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-01T08:00:00Z",
    LastModificationTime: "2026-05-01T08:00:00Z",
  },
  {
    Id: 2,
    KitCode: "KIT002",
    KitName: "Virtual Kit",
    MainMaterialCode: "MAT004",
    MainMaterialName: "Virtual Main",
    Unit: "set",
    IsVirtualMain: true,
    ChildCount: 1,
    Children: [
      { Code: "MAT005", Name: "Virtual Child", Quantity: 3, Unit: "pcs" },
    ],
    Remark: "virtual",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-02T08:00:00Z",
    LastModificationTime: "2026-05-02T08:00:00Z",
  },
];

function createDataResult<T>(attach: T, totalCount: number): DataResult<T> {
  return {
    Success: true,
    Code: "",
    Message: "[WMS] Query success",
    Attach: attach,
    SkipCount: 0,
    TotalCount: totalCount,
    Record: Array.isArray(attach) ? attach.length : totalCount,
  };
}

function includesText(
  value: string | null | undefined,
  query: string | undefined,
) {
  if (!query) {
    return true;
  }

  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function cloneRecords<T>(records: T[]): T[] {
  return records.map((record) => structuredClone(record));
}

function normalizeChildren(children: PackagingKitApiDto["Children"]) {
  const normalizedChildren = (children ?? []).map((child) => ({
    Code: child.Code,
    Name: child.Name,
    Quantity: child.Quantity,
    Unit: child.Unit ?? "",
  }));

  return {
    children: normalizedChildren,
    childCount: normalizedChildren.length,
  };
}

export function createPackagingKitMockStore(
  initialRecords: PackagingKitMockRecord[] = packagingKitMockRecords,
  initialMaterials: PackagingKitMaterialApiDto[] = packagingKitMaterialMockRecords,
) {
  const seedRecords = cloneRecords(initialRecords);
  const seedMaterials = cloneRecords(initialMaterials);
  let records = cloneRecords(seedRecords);
  let materials = cloneRecords(seedMaterials);
  let nextId = Math.max(...records.map((record) => record.Id), 0) + 1;

  function reset() {
    records = cloneRecords(seedRecords);
    materials = cloneRecords(seedMaterials);
    nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
  }

  return {
    query(query: Partial<PackagingKitListQuery>) {
      const filteredRecords = records.filter(
        (record) =>
          includesText(record.KitCode, query.KitCode) &&
          includesText(record.KitName, query.KitName),
      );

      if (!query.IsPaged) {
        return createDataResult(filteredRecords, filteredRecords.length);
      }

      const pageIndex = Math.max(query.PageIndex ?? 1, 1);
      const pageSize = Math.max(query.PageSize ?? filteredRecords.length, 1);
      const startIndex = (pageIndex - 1) * pageSize;
      const pageRecords = filteredRecords.slice(
        startIndex,
        startIndex + pageSize,
      );

      return createDataResult(pageRecords, filteredRecords.length);
    },

    queryMaterials(query: Partial<PackagingKitMaterialListQuery>) {
      const filteredRecords = materials.filter(
        (record) =>
          includesText(record.MaterialCode, query.MaterialCode) &&
          includesText(record.MaterialName, query.MaterialName),
      );

      if (!query.IsPaged) {
        return createDataResult(filteredRecords, filteredRecords.length);
      }

      const pageIndex = Math.max(query.PageIndex ?? 1, 1);
      const pageSize = Math.max(query.PageSize ?? filteredRecords.length, 1);
      const startIndex = (pageIndex - 1) * pageSize;
      const pageRecords = filteredRecords.slice(
        startIndex,
        startIndex + pageSize,
      );

      return createDataResult(pageRecords, filteredRecords.length);
    },

    create(payload: CreatePackagingKitPayload) {
      const now = new Date().toISOString();
      const normalized = normalizeChildren(payload.Children);
      const record: PackagingKitMockRecord = {
        Id: nextId,
        KitCode: payload.KitCode,
        KitName: payload.KitName,
        MainMaterialCode: payload.MainMaterialCode,
        MainMaterialName: payload.MainMaterialName,
        Unit: payload.Unit,
        IsVirtualMain: payload.IsVirtualMain,
        ChildCount: normalized.childCount,
        Children: normalized.children,
        Remark: payload.Remark ?? "",
        CompanyCode: "RUIHUI",
        FactoryCode: "DEFAULT",
        CreationTime: now,
        LastModificationTime: now,
      };

      nextId += 1;
      records = [record, ...records];

      return createDataResult(record, 1);
    },

    update(payload: UpdatePackagingKitPayload) {
      const fields = payload.NeedUpdateFields;

      records = records.map((record) => {
        if (record.Id !== fields.Id) {
          return record;
        }

        const normalized =
          fields.Children === undefined
            ? {
                children: record.Children ?? [],
                childCount: record.ChildCount ?? (record.Children ?? []).length,
              }
            : normalizeChildren(fields.Children);

        return {
          ...record,
          KitName: fields.KitName ?? record.KitName,
          MainMaterialCode: fields.MainMaterialCode ?? record.MainMaterialCode,
          MainMaterialName: fields.MainMaterialName ?? record.MainMaterialName,
          Unit: fields.Unit ?? record.Unit,
          IsVirtualMain: fields.IsVirtualMain ?? record.IsVirtualMain,
          ChildCount: normalized.childCount,
          Children: normalized.children,
          Remark: fields.Remark ?? record.Remark,
          LastModificationTime: new Date().toISOString(),
        };
      });

      return createDataResult(null, 0);
    },

    remove(dto: Pick<PackagingKitApiDto, "Id">) {
      records = records.filter((record) => record.Id !== dto.Id);
      return createDataResult(null, 0);
    },

    removeBatch(dtos: Array<Pick<PackagingKitApiDto, "Id">>) {
      const ids = new Set(dtos.map((dto) => dto.Id));
      records = records.filter((record) => !ids.has(record.Id));
      return createDataResult(null, 0);
    },

    reset,
  };
}
