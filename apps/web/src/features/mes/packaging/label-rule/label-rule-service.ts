import type { DataResult } from "@/lib/api/http-client";
import { getMesClient } from "@/lib/api/mes-client";
import type {
  LabelRuleApiDto,
  LabelRuleQueryDto,
} from "@/features/mes/packaging/label-rule/label-rule-contract";

const LABEL_RULE_QUERY_PATH = "/LabelApi/GetLabelRuleAutoQueryDatas";

/**
 * Fetch label rule options from the LabelApi.
 * Returns a DataResult containing the matched label rules.
 */
export function getLabelRuleOptions(
  query: LabelRuleQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<LabelRuleApiDto[]>> {
  return getMesClient().postDataResult<LabelRuleApiDto[]>(
    LABEL_RULE_QUERY_PATH,
    query,
    options,
  );
}

export type { LabelRuleApiDto };
