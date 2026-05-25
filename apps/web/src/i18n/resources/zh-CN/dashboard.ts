const zhCNDashboard = {
  status: {
    loading: "正在加载仪表盘概览。",
    errorTitle: "暂时无法加载概览",
    errorDescription: "请检查当前数据源状态，或稍后重试。",
    retry: "重试",
  },
  stats: {
    activeModules: {
      label: "启用模块",
      description: "当前初始化接入的核心后台模块。",
    },
    sharedPackages: {
      label: "共享包",
      description: "继续复用 monorepo 内的共享配置与 UI 包。",
    },
    publicExamples: {
      label: "公开示例",
      description: "同时支持壳内页面和脱壳独立访问页面。",
    },
  },
} as const;

export default zhCNDashboard;
