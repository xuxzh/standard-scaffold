import type { DataResult } from "@/lib/api/http-client";
import { getPrintClient } from "@/lib/api/print-client";
import type {
  PrintTemplateApiDto,
  PrintTemplateQueryDto,
} from "@/features/mes/packaging/print-template/print-template-contract";

const PRINT_TEMPLATE_QUERY_PATH =
  "/LabelTemplateFile/findLabelTemplateFileWithSimple";

/**
 * Fetch print template options from the print service.
 * Returns a DataResult containing the matched templates.
 */
export function getPrintTemplateOptions(
  query: PrintTemplateQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<PrintTemplateApiDto[]>> {
  return getPrintClient().postDataResult<PrintTemplateApiDto[]>(
    PRINT_TEMPLATE_QUERY_PATH,
    query,
    options,
  );
}

export type { PrintTemplateApiDto };
