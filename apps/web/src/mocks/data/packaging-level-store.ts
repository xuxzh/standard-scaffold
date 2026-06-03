import type {
  PackagingLevelApiDto,
  PackagingLevelListQuery,
  PackagingLevelTreeDto,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";
import { getMockRecordCount } from "@/mocks/config";
import {
  buildRecords,
  cloneRecords,
  createDataResult,
  includesText,
  padNumber,
  paginateRecords,
} from "@/mocks/data/mock-store-utils";

type PackagingLevelMockRecord = PackagingLevelApiDto & {
  CompanyCode?: string;
  FactoryCode?: string;
};

export type CreatePackagingLevelPayload = {
  LevelCode: string;
  LevelName: string;
  ParentLevelCode?: string | null;
  ParentLevelName?: string | null;
  Description?: string | null;
  Remark?: string | null;
};

export type UpdatePackagingLevelPayload = {
  NeedUpdateFields: {
    Id: number;
    LevelName?: string;
    ParentLevelCode?: string | null;
    ParentLevelName?: string | null;
    Description?: string | null;
  };
};

const packagingLevelSeedRecords: PackagingLevelMockRecord[] = [
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

function createPackagingLevelRecord(index: number): PackagingLevelMockRecord {
  const day = padNumber(((index - 1) % 28) + 1, 2);

  return {
    Id: index,
    LevelCode: `LV-GEN-${padNumber(index)}`,
    LevelSequence: (index % 4) + 1,
    LevelName: `Generated Level ${padNumber(index)}`,
    ParentLevelCode: "LV003",
    ParentLevelName: "CARTON",
    Description: `Generated packaging level ${padNumber(index)}`,
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: `2026-05-${day}T08:00:00Z`,
    LastModificationTime: `2026-05-${day}T08:00:00Z`,
  };
}

export const packagingLevelMockRecords: PackagingLevelMockRecord[] =
  buildRecords(
    packagingLevelSeedRecords,
    getMockRecordCount(),
    createPackagingLevelRecord,
  );

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

function calculateSequence(
  records: PackagingLevelMockRecord[],
  parentLevelCode: string | null | undefined,
) {
  if (!parentLevelCode) {
    return 1;
  }

  const parent = records.find((record) => record.LevelCode === parentLevelCode);

  return parent ? parent.LevelSequence + 1 : 1;
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

      const pageRecords = paginateRecords(filteredRecords, query);

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
        LevelSequence: calculateSequence(records, payload.ParentLevelCode),
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
              LevelSequence:
                fields.ParentLevelCode === undefined
                  ? record.LevelSequence
                  : calculateSequence(records, fields.ParentLevelCode),
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
