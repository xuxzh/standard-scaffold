import type { DataResult } from "@/lib/api/http-client";
import type {
  PackagingSpecApiDto,
  PackagingSpecListQuery,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";

export type CreatePackagingSpecPayload = {
  SpecCode: string;
  SpecName: string;
  PackagingTypeCode: string;
  PackagingTypeName: string;
  PackagingLevelCode: string;
  PackagingLevelName: string;
  BarcodeRuleCode: string;
  BarcodeRuleName: string;
  Length: number;
  Width: number;
  Height: number;
  Volume: number;
  MaxWeight: number;
  GrossWeight: number;
  TareWeight: number;
  StandardCapacity: number;
  StackLimit: number;
  Unit: string;
  IsEnabled: boolean;
  Remark?: string | null;
};

export type UpdatePackagingSpecPayload = {
  NeedUpdateFields: {
    Id: number;
    SpecName?: string;
    PackagingTypeCode?: string;
    PackagingTypeName?: string;
    PackagingLevelCode?: string;
    PackagingLevelName?: string;
    BarcodeRuleCode?: string;
    BarcodeRuleName?: string;
    Length?: number;
    Width?: number;
    Height?: number;
    Volume?: number;
    MaxWeight?: number;
    GrossWeight?: number;
    TareWeight?: number;
    StandardCapacity?: number;
    StackLimit?: number;
    Unit?: string;
    IsEnabled?: boolean;
  };
};

export const packagingSpecMockRecords: PackagingSpecApiDto[] = [
  {
    Id: 1,
    SpecCode: "SPEC-001",
    SpecName: "Regular Carton",
    PackagingTypeCode: "TYPE-001",
    PackagingTypeName: "Carton",
    PackagingLevelCode: "LEVEL-002",
    PackagingLevelName: "Box",
    BarcodeRuleCode: "BAR-001",
    BarcodeRuleName: "Default Barcode",
    Length: 60,
    Width: 40,
    Height: 30,
    Volume: 0.072,
    MaxWeight: 20,
    GrossWeight: 18,
    TareWeight: 2,
    StandardCapacity: 24,
    StackLimit: 8,
    Unit: "EA",
    IsEnabled: true,
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-01T08:00:00Z",
    LastModificationTime: "2026-05-01T08:00:00Z",
  },
  {
    Id: 2,
    SpecCode: "SPEC-002",
    SpecName: "Return Pallet",
    PackagingTypeCode: "TYPE-002",
    PackagingTypeName: "Pallet",
    PackagingLevelCode: "LEVEL-004",
    PackagingLevelName: "Pallet",
    BarcodeRuleCode: "BAR-002",
    BarcodeRuleName: "Heavy Barcode",
    Length: 120,
    Width: 100,
    Height: 15,
    Volume: 0.18,
    MaxWeight: 500,
    GrossWeight: 520,
    TareWeight: 20,
    StandardCapacity: 1,
    StackLimit: 3,
    Unit: "PLT",
    IsEnabled: false,
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-02T08:00:00Z",
    LastModificationTime: "2026-05-02T08:00:00Z",
  },
  {
    Id: 3,
    SpecCode: "SPEC-003",
    SpecName: "Export Bag",
    PackagingTypeCode: "TYPE-003",
    PackagingTypeName: "Bag",
    PackagingLevelCode: "LEVEL-001",
    PackagingLevelName: "Unit",
    BarcodeRuleCode: "BAR-003",
    BarcodeRuleName: "Bag Barcode",
    Length: 30,
    Width: 20,
    Height: 5,
    Volume: 0.003,
    MaxWeight: 5,
    GrossWeight: 4,
    TareWeight: 0.5,
    StandardCapacity: 6,
    StackLimit: 10,
    Unit: "EA",
    IsEnabled: true,
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
    Message: "[MOM] Query success",
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

function cloneRecords(records: PackagingSpecApiDto[]) {
  return records.map((record) => ({ ...record }));
}

export function createPackagingSpecMockStore(
  initialRecords: PackagingSpecApiDto[] = packagingSpecMockRecords,
) {
  const seedRecords = cloneRecords(initialRecords);
  let records = cloneRecords(seedRecords);
  let nextId = Math.max(...records.map((record) => record.Id), 0) + 1;

  function reset() {
    records = cloneRecords(seedRecords);
    nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
  }

  return {
    query(query: Partial<PackagingSpecListQuery>) {
      const filteredRecords = records.filter(
        (record) =>
          includesText(record.SpecCode, query.SpecCode) &&
          includesText(record.SpecName, query.SpecName) &&
          includesText(record.PackagingTypeCode, query.PackagingTypeCode) &&
          (query.IsEnabled === undefined ||
            record.IsEnabled === query.IsEnabled),
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

    create(payload: CreatePackagingSpecPayload) {
      const now = new Date().toISOString();
      const record: PackagingSpecApiDto = {
        Id: nextId,
        SpecCode: payload.SpecCode,
        SpecName: payload.SpecName,
        PackagingTypeCode: payload.PackagingTypeCode,
        PackagingTypeName: payload.PackagingTypeName,
        PackagingLevelCode: payload.PackagingLevelCode,
        PackagingLevelName: payload.PackagingLevelName,
        BarcodeRuleCode: payload.BarcodeRuleCode,
        BarcodeRuleName: payload.BarcodeRuleName,
        Length: payload.Length,
        Width: payload.Width,
        Height: payload.Height,
        Volume: payload.Volume,
        MaxWeight: payload.MaxWeight,
        GrossWeight: payload.GrossWeight,
        TareWeight: payload.TareWeight,
        StandardCapacity: payload.StandardCapacity,
        StackLimit: payload.StackLimit,
        Unit: payload.Unit,
        IsEnabled: payload.IsEnabled,
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

    update(payload: UpdatePackagingSpecPayload) {
      const fields = payload.NeedUpdateFields;

      records = records.map((record) =>
        record.Id === fields.Id
          ? {
              ...record,
              SpecName: fields.SpecName ?? record.SpecName,
              PackagingTypeCode:
                fields.PackagingTypeCode ?? record.PackagingTypeCode,
              PackagingTypeName:
                fields.PackagingTypeName ?? record.PackagingTypeName,
              PackagingLevelCode:
                fields.PackagingLevelCode ?? record.PackagingLevelCode,
              PackagingLevelName:
                fields.PackagingLevelName ?? record.PackagingLevelName,
              BarcodeRuleCode: fields.BarcodeRuleCode ?? record.BarcodeRuleCode,
              BarcodeRuleName: fields.BarcodeRuleName ?? record.BarcodeRuleName,
              Length: fields.Length ?? record.Length,
              Width: fields.Width ?? record.Width,
              Height: fields.Height ?? record.Height,
              Volume: fields.Volume ?? record.Volume,
              MaxWeight: fields.MaxWeight ?? record.MaxWeight,
              GrossWeight: fields.GrossWeight ?? record.GrossWeight,
              TareWeight: fields.TareWeight ?? record.TareWeight,
              StandardCapacity:
                fields.StandardCapacity ?? record.StandardCapacity,
              StackLimit: fields.StackLimit ?? record.StackLimit,
              Unit: fields.Unit ?? record.Unit,
              IsEnabled: fields.IsEnabled ?? record.IsEnabled,
              LastModificationTime: new Date().toISOString(),
            }
          : record,
      );

      return createDataResult(null, 0);
    },

    remove(dto: Pick<PackagingSpecApiDto, "Id">) {
      records = records.filter((record) => record.Id !== dto.Id);

      return createDataResult(null, 0);
    },

    removeBatch(dtos: Array<Pick<PackagingSpecApiDto, "Id">>) {
      const ids = new Set(dtos.map((dto) => dto.Id));
      records = records.filter((record) => !ids.has(record.Id));

      return createDataResult(null, 0);
    },

    reset,
  };
}
