import type { DataResult } from "@/lib/api/http-client";
import type {
  PackagingTypeApiDto,
  PackagingTypeListQuery,
} from "@/features/mes/packaging/packaging-type/packaging-contract";

export type CreatePackagingTypePayload = {
  TypeCode: string;
  TypeName: string;
  IsRecyclable: boolean;
  Description?: string | null;
  Remark?: string | null;
};

export type UpdatePackagingTypePayload = {
  NeedUpdateFields: {
    Id: number;
    TypeName?: string;
    IsRecyclable?: boolean;
    Description?: string | null;
  };
};

export const packagingTypeMockRecords: PackagingTypeApiDto[] = [
  {
    Id: 1,
    TypeCode: "PKG_TYPE_001",
    TypeName: "纸箱",
    IsRecyclable: true,
    Description: "常规可回收纸箱",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-01T08:00:00Z",
    LastModificationTime: "2026-05-01T08:00:00Z",
  },
  {
    Id: 2,
    TypeCode: "PKG_TYPE_002",
    TypeName: "木托盘",
    IsRecyclable: true,
    Description: "仓储周转托盘",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-02T08:00:00Z",
    LastModificationTime: "2026-05-02T08:00:00Z",
  },
  {
    Id: 3,
    TypeCode: "PKG_TYPE_003",
    TypeName: "一次性防护袋",
    IsRecyclable: false,
    Description: "出库防尘包装",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-03T08:00:00Z",
    LastModificationTime: "2026-05-03T08:00:00Z",
  },
];

function createDataResult<T>(attach: T, totalCount: number): DataResult<T> {
  return {
    Success: true,
    Code: "",
    Message: "[MES] 获取数据成功！",
    Attach: attach,
    SkipCount: 0,
    TotalCount: totalCount,
    Record: Array.isArray(attach) ? attach.length : totalCount,
  };
}

function includesText(value: string | null | undefined, query: string | undefined) {
  if (!query) {
    return true;
  }

  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function cloneRecords(records: PackagingTypeApiDto[]) {
  return records.map((record) => ({ ...record }));
}

export function createPackagingTypeMockStore(
  initialRecords: PackagingTypeApiDto[] = packagingTypeMockRecords,
) {
  const seedRecords = cloneRecords(initialRecords);
  let records = cloneRecords(seedRecords);
  let nextId = Math.max(...records.map((record) => record.Id), 0) + 1;

  function reset() {
    records = cloneRecords(seedRecords);
    nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
  }

  return {
    query(query: Partial<PackagingTypeListQuery>) {
      const filteredRecords = records.filter(
        (record) =>
          includesText(record.TypeCode, query.TypeCode) &&
          includesText(record.TypeName, query.TypeName) &&
          (query.IsRecyclable === undefined ||
            record.IsRecyclable === query.IsRecyclable),
      );

      if (!query.IsPaged) {
        return createDataResult(filteredRecords, filteredRecords.length);
      }

      const pageIndex = Math.max(query.PageIndex ?? 1, 1);
      const pageSize = Math.max(query.PageSize ?? filteredRecords.length, 1);
      const startIndex = (pageIndex - 1) * pageSize;
      const pageRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

      return createDataResult(pageRecords, filteredRecords.length);
    },

    create(payload: CreatePackagingTypePayload) {
      const now = new Date().toISOString();
      const record: PackagingTypeApiDto = {
        Id: nextId,
        TypeCode: payload.TypeCode,
        TypeName: payload.TypeName,
        IsRecyclable: payload.IsRecyclable,
        Description: payload.Description ?? "",
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

    update(payload: UpdatePackagingTypePayload) {
      const fields = payload.NeedUpdateFields;

      records = records.map((record) =>
        record.Id === fields.Id
          ? {
              ...record,
              TypeName: fields.TypeName ?? record.TypeName,
              IsRecyclable: fields.IsRecyclable ?? record.IsRecyclable,
              Description: fields.Description ?? record.Description,
              LastModificationTime: new Date().toISOString(),
            }
          : record,
      );

      return createDataResult(null, 0);
    },

    remove(dto: Pick<PackagingTypeApiDto, "Id">) {
      records = records.filter((record) => record.Id !== dto.Id);

      return createDataResult(null, 0);
    },

    removeBatch(dtos: Array<Pick<PackagingTypeApiDto, "Id">>) {
      const ids = new Set(dtos.map((dto) => dto.Id));
      records = records.filter((record) => !ids.has(record.Id));

      return createDataResult(null, 0);
    },
    reset,
  };
}
