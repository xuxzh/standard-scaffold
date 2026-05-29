export type PackagingLevelApiDto = {
  Id: number;
  LevelCode: string;
  LevelSequence: number;
  LevelName: string;
  ParentLevelCode?: string | null;
  ParentLevelName?: string | null;
  Description?: string | null;
  Remark?: string | null;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
};

export type PackagingLevelRecord = {
  id: number;
  levelCode: string;
  levelSequence: number;
  levelName: string;
  parentLevelCode: string;
  parentLevelName: string;
  description: string;
  remark: string;
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

export type PackagingLevelFilters = {
  levelCode: string;
  levelName: string;
  parentLevelCode: string;
};

export type PackagingLevelListQuery = {
  LevelCode?: string;
  LevelName?: string;
  ParentLevelCode?: string;
  IsPaged: boolean;
  PageIndex: number;
  PageSize: number;
};

export type PackagingLevelOption = {
  id: number;
  levelCode: string;
  levelSequence: number;
  levelName: string;
};

export type PackagingLevelFormValues = {
  levelCode: string;
  levelSequence: string;
  levelName: string;
  parentLevelCode: string;
  description: string;
};

export type CreatePackagingLevelInput = PackagingLevelFormValues & {
  parentLevelName?: string;
};

export type UpdatePackagingLevelInput = PackagingLevelFormValues & {
  id: number;
  parentLevelName?: string;
};

export type PackagingLevelTreeDto = {
  Id: number;
  LevelCode: string;
  LevelSequence: number;
  LevelName: string;
  ParentLevelCode?: string | null;
  ParentLevelName?: string | null;
  Description?: string | null;
  Children?: PackagingLevelTreeDto[];
};

export type PackagingLevelTreeNode = {
  id: number;
  levelCode: string;
  levelSequence: number;
  levelName: string;
  parentLevelCode: string;
  parentLevelName: string;
  description: string;
  children: PackagingLevelTreeNode[];
};

export const packagingLevelPageSize = 20;

export const packagingLevelDefaultFilters: PackagingLevelFilters = {
  levelCode: "",
  levelName: "",
  parentLevelCode: "",
};

export function mapPackagingLevelDtoToRecord(
  dto: PackagingLevelApiDto,
): PackagingLevelRecord {
  return {
    id: dto.Id,
    levelCode: dto.LevelCode,
    levelSequence: dto.LevelSequence,
    levelName: dto.LevelName,
    parentLevelCode: dto.ParentLevelCode ?? "",
    parentLevelName: dto.ParentLevelName ?? "",
    description: dto.Description ?? "",
    remark: dto.Remark ?? "",
    creationTime: dto.CreationTime,
    lastModificationTime: dto.LastModificationTime,
  };
}

export function mapPackagingLevelDtoToOption(
  dto: PackagingLevelApiDto,
): PackagingLevelOption {
  return {
    id: dto.Id,
    levelCode: dto.LevelCode,
    levelSequence: dto.LevelSequence,
    levelName: dto.LevelName,
  };
}

export function mapPackagingLevelTreeDtoToNode(
  dto: PackagingLevelTreeDto,
): PackagingLevelTreeNode {
  return {
    id: dto.Id,
    levelCode: dto.LevelCode,
    levelSequence: dto.LevelSequence,
    levelName: dto.LevelName,
    parentLevelCode: dto.ParentLevelCode ?? "",
    parentLevelName: dto.ParentLevelName ?? "",
    description: dto.Description ?? "",
    children: (dto.Children ?? []).map(mapPackagingLevelTreeDtoToNode),
  };
}
