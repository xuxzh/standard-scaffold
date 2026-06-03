import { useQuery } from "@tanstack/react-query";
import {
  defaultPrintTemplateQuery,
  mapPrintTemplateDtoToOption,
} from "@/features/mes/packaging/print-template/print-template-contract";
import { getPrintTemplateOptions } from "@/features/mes/packaging/print-template/print-template-service";

export const printTemplateOptionsQueryKey = [
  "print",
  "template",
  "options",
] as const;

/**
 * Fetch print template options for use in a Combobox / Select.
 * Uses the default query parameters matching the reference API call.
 */
export function usePrintTemplateOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: printTemplateOptionsQueryKey,
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getPrintTemplateOptions(
        defaultPrintTemplateQuery,
        { signal },
      );
      return result.Attach.map(mapPrintTemplateDtoToOption);
    },
  });
}
