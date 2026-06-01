import { getWmsClient } from "@/lib/api/wms-client";
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
  return getWmsClient().postDataResult<InventoryVerificationStrategy[]>(
    INVENTORY_VERIFICATION_STRATEGY_QUERY_PATH,
    query,
    options,
  );
}
