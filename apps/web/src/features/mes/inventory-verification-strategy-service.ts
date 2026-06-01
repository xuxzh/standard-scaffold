import { getMesClient } from "@/lib/api/mes-client";
import type { ApiQueryParams, DataResult } from "@/lib/api/http-client";

const INVENTORY_VERIFICATION_STRATEGY_QUERY_PATH =
  "/InventoryVerificationStrategyApi/GetInventoryVerificationStrategyAutoQueryDatas";

export type InventoryVerificationStrategy = {
  Id: number;
  StrategyCode?: string;
  StrategyName?: string;
};

export type InventoryVerificationStrategyQuery = ApiQueryParams & {
  StrategyCode?: string;
  StrategyName?: string;
};

export function getInventoryVerificationStrategies(
  query: InventoryVerificationStrategyQuery,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<InventoryVerificationStrategy[]>> {
  return getMesClient().postDataResult<InventoryVerificationStrategy[]>(
    INVENTORY_VERIFICATION_STRATEGY_QUERY_PATH,
    query,
    options,
  );
}
