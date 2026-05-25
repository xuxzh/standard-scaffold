import { useQuery } from "@tanstack/react-query";
import { getAppClient } from "@/lib/api/app-client";
import type { DashboardStatsResponse } from "@/features/dashboard/dashboard-contract";
export { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";

export function getDashboardStats(options: { signal?: AbortSignal } = {}) {
  return getAppClient().get<DashboardStatsResponse>(
    "/dashboard/stats",
    options,
  );
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: ({ signal }) => getDashboardStats({ signal }),
  });
}
