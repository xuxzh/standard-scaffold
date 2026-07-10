import { useQuery } from "@tanstack/react-query";
import {
  dashboardStatsResponse,
  type DashboardStatsResponse,
} from "@/features/dashboard/dashboard-contract";

/**
 * 仪表盘 stats 当前使用前端预设数据，不再请求 `/dashboard/stats` 后端接口。
 * 保留 React Query hook 形态与 queryKey 约定，后续接回真实接口时只需重写
 * `queryFn` 并移除 `initialData` / `staleTime` 即可。
 */
export function useDashboardStatsQuery() {
  return useQuery<DashboardStatsResponse>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => Promise.resolve(dashboardStatsResponse),
    initialData: dashboardStatsResponse,
    staleTime: Number.POSITIVE_INFINITY,
  });
}