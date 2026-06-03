import { useQuery } from "@tanstack/react-query";
import {
  defaultLabelRuleQuery,
  mapLabelRuleDtoToOption,
} from "@/features/mes/packaging/label-rule/label-rule-contract";
import { getLabelRuleOptions } from "@/features/mes/packaging/label-rule/label-rule-service";

export const labelRuleOptionsQueryKey = [
  "mes",
  "label-rule",
  "options",
] as const;

/**
 * Fetch label rule options for use in a Combobox / Select.
 * Uses the default query parameters matching the reference API call.
 */
export function useLabelRuleOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: labelRuleOptionsQueryKey,
    enabled,
    queryFn: async ({ signal }) => {
      const result = await getLabelRuleOptions(defaultLabelRuleQuery, {
        signal,
      });
      return result.Attach.map(mapLabelRuleDtoToOption);
    },
  });
}
