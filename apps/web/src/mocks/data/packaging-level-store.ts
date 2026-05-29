import type { DataResult } from "@/lib/api/http-client";
import type {
  PackagingLevelApiDto,
  PackagingLevelListQuery,
  PackagingLevelTreeDto,
} from "@/features/wms/packaging/packaging-level/packaging-level-contract";

type PackagingLevelMockRecord = PackagingLevelApiDto & {
  CompanyCode?: string;
  FactoryCode?: string;
};

export type CreatePackagingLevelPayload = {
  LevelCode: string;
  LevelSequence: number;
  LevelName: string;
  ParentLevelCode?: string | null;
  ParentLevelName?: string | null;
  Description?: string | null;
  Remark?: string | null;
};

export type UpdatePackagingLevelPayload = {
  NeedUpdateFields: {
    Id: number;
    LevelSequence?: number;
    LevelName?: string;
    ParentLevelCode?: string | null;
    ParentLevelName?: string | null;
    Description?: string | null;
  };
};

export const packagingLevelMockRecords: PackagingLevelMockRecord[] = [
  {
    Id: 1,
    LevelCode: "LV001",
    LevelSequence: 1,
    LevelName: "UNIT",
    ParentLevelCode: null,
    ParentLevelName: null,
    Description: "Smallest packaging unit",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-01T08:00:00Z",
    LastModificationTime: "2026-05-01T08:00:00Z",
  },
  {
    Id: 2,
    LevelCode: "LV002",
    LevelSequence: 2,
    LevelName: "BOX",
    ParentLevelCode: "LV001",
    ParentLevelName: "UNIT",
    Description: "Six units per box",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-02T08:00:00Z",
    LastModificationTime: "2026-05-02T08:00:00Z",
  },
  {
    Id: 3,
    LevelCode: "LV003",
    LevelSequence: 3,
    LevelName: "CARTON",
    ParentLevelCode: "LV002",
    ParentLevelName: "BOX",
    Description: "Four boxes per carton",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-03T08:00:00Z",
    LastModificationTime: "2026-05-03T08:00:00Z",
  },
  {
    Id: 4,
    LevelCode: "LV004",
    LevelSequence: 2,
    LevelName: "BAG",
    ParentLevelCode: "LV001",
    ParentLevelName: "UNIT",
    Description: "Twelve units per bag",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-04T08:00:00Z",
    LastModificationTime: "2026-05-04T08:00:00Z",
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

function includesText(value: string | null | undefined, query: string | undefined) {
  if (!query) {
    return true;
  }

  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function cloneRecords(records: PackagingLevelMockRecord[]) {
  return records.map((record) => ({ ...record }));
}

function compareTreeNodes(a: PackagingLevelTreeDto, b: PackagingLevelTreeDto) {
  if (a.LevelSequence !== b.LevelSequence) {
    return a.LevelSequence - b.LevelSequence;
  }

  return a.LevelCode.localeCompare(b.LevelCode);
}

function buildTree(records: PackagingLevelApiDto[]) {
  const nodeMap = new Map<number, PackagingLevelTreeDto>();

  for (const record of records) {
    nodeMap.set(record.Id, {
      Id: record.Id,
      LevelCode: record.LevelCode,
      LevelSequence: record.LevelSequence,
      LevelName: record.LevelName,
      ParentLevelCode: record.ParentLevelCode ?? null,
      ParentLevelName: record.ParentLevelName ?? null,
      Description: record.Description ?? "",
      Children: [],
    });
  }

  const roots: PackagingLevelTreeDto[] = [];

  for (const record of records) {
    const node = nodeMap.get(record.Id);

    if (!node) {
      continue;
    }

    const parent = records.find(
      (candidate) => candidate.LevelCode === (record.ParentLevelCode ?? ""),
    );

    if (!parent) {
      roots.push(node);
      continue;
    }

    nodeMap.get(parent.Id)?.Children?.push(node);
  }

  const sortNodes = (nodes: PackagingLevelTreeDto[]) => {
    nodes.sort(compareTreeNodes);
    nodes.forEach((node) => sortNodes(node.Children ?? []));
  };

  sortNodes(roots);

  return roots;
}

export function createPackagingLevelMockStore(
  initialRecords: PackagingLevelMockRecord[] = packagingLevelMockRecords,
) {
  const seedRecords = cloneRecords(initialRecords);
  let records = cloneRecords(seedRecords);
  let nextId = Math.max(...records.map((record) => record.Id), 0) + 1;

  function reset() {
    records = cloneRecords(seedRecords);
    nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
  }

  return {
    query(query: Partial<PackagingLevelListQuery>) {
      const filteredRecords = records.filter(
        (record) =>
          includesText(record.LevelCode, query.LevelCode) &&
          includesText(record.LevelName, query.LevelName) &&
          includesText(record.ParentLevelCode, query.ParentLevelCode),
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

    tree() {
      return createDataResult(buildTree(records), records.length);
    },

    create(payload: CreatePackagingLevelPayload) {
      const now = new Date().toISOString();
      const record: PackagingLevelMockRecord = {
        Id: nextId,
        LevelCode: payload.LevelCode,
        LevelSequence: payload.LevelSequence,
        LevelName: payload.LevelName,
        ParentLevelCode: payload.ParentLevelCode ?? null,
        ParentLevelName: payload.ParentLevelName ?? null,
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

    update(payload: UpdatePackagingLevelPayload) {
      const fields = payload.NeedUpdateFields;

      records = records.map((record) =>
        record.Id === fields.Id
          ? {
              ...record,
              LevelSequence: fields.LevelSequence ?? record.LevelSequence,
              LevelName: fields.LevelName ?? record.LevelName,
              ParentLevelCode:
                fields.ParentLevelCode === undefined
                  ? record.ParentLevelCode
                  : fields.ParentLevelCode,
              ParentLevelName:
                fields.ParentLevelName === undefined
                  ? record.ParentLevelName
                  : fields.ParentLevelName,
              Description: fields.Description ?? record.Description,
              LastModificationTime: new Date().toISOString(),
            }
          : record,
      );

      return createDataResult(null, 0);
    },

    remove(dto: Pick<PackagingLevelApiDto, "Id">) {
      records = records.filter((record) => record.Id !== dto.Id);

      return createDataResult(null, 0);
    },

    removeBatch(dtos: Array<Pick<PackagingLevelApiDto, "Id">>) {
      const ids = new Set(dtos.map((dto) => dto.Id));
      records = records.filter((record) => !ids.has(record.Id));

      return createDataResult(null, 0);
    },

    reset,
  };
}
