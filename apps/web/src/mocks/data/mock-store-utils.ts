import type { DataResult } from "@/lib/api/http-client";
import {
  defaultMockRecordCount,
  maxMockRecordCount,
} from "@/mocks/config";

export { defaultMockRecordCount, maxMockRecordCount };

export type MockListQuery = {
  IsPaged?: boolean;
  PageIndex?: number;
  PageSize?: number;
};

export function createDataResult<T>(
  attach: T,
  totalCount: number,
  message = "[MES] Query success",
): DataResult<T> {
  return {
    Success: true,
    Code: "",
    Message: message,
    Attach: attach,
    SkipCount: 0,
    TotalCount: totalCount,
    Record: Array.isArray(attach) ? attach.length : totalCount,
  };
}

export function includesText(
  value: string | null | undefined,
  query: string | undefined,
) {
  if (!query) {
    return true;
  }

  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

export function paginateRecords<T>(records: T[], query: MockListQuery) {
  if (!query.IsPaged) {
    return records;
  }

  const pageIndex = Math.max(query.PageIndex ?? 1, 1);
  const pageSize = Math.max(query.PageSize ?? records.length, 1);
  const startIndex = (pageIndex - 1) * pageSize;

  return records.slice(startIndex, startIndex + pageSize);
}

export function cloneRecords<T>(records: T[]): T[] {
  return structuredClone(records);
}

export function padNumber(value: number, length = 3) {
  return String(value).padStart(length, "0");
}

export function buildRecords<T>(
  seedRecords: T[],
  count: number,
  createRecord: (index: number) => T,
) {
  const records = seedRecords.slice(0, count);

  for (let index = seedRecords.length + 1; records.length < count; index += 1) {
    records.push(createRecord(index));
  }

  return records;
}
