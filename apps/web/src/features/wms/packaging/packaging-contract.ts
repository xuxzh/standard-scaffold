export type PackagingModuleSummary = {
  pendingTasks: number;
  inProgressTasks: number;
  exceptionTasks: number;
};

export const packagingModuleSummary: PackagingModuleSummary = {
  pendingTasks: 0,
  inProgressTasks: 0,
  exceptionTasks: 0
};
