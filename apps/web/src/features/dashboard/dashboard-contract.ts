export type DashboardStatKey =
  | "activeModules"
  | "sharedPackages"
  | "publicExamples";

export type DashboardStat = {
  key: DashboardStatKey;
  value: string;
};

export type DashboardStatsResponse = {
  stats: DashboardStat[];
};

export const dashboardStatsResponse: DashboardStatsResponse = {
  stats: [
    {
      key: "activeModules",
      value: "05",
    },
    {
      key: "sharedPackages",
      value: "03",
    },
    {
      key: "publicExamples",
      value: "02",
    },
  ],
};
