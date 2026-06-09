import { BadRequestException } from "@nestjs/common";

export function createOrderBy<TAllowed extends string>(
  sortField: string | undefined,
  sortOrder: "asc" | "desc" | undefined,
  allowedFields: readonly TAllowed[],
  defaultOrderBy: Record<string, "asc" | "desc">,
) {
  if (!sortField) {
    return defaultOrderBy;
  }

  if (!allowedFields.includes(sortField as TAllowed)) {
    throw new BadRequestException({
      message: `Unsupported sort field: ${sortField}`,
      errorCode: "INVALID_SORT_FIELD",
    });
  }

  return { [sortField]: sortOrder ?? "asc" };
}
