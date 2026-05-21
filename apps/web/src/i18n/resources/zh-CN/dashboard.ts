const zhCNDashboard = {
  stats: {
    activeModules: {
      label: "启用模块",
      description: "当前初始化接入的核心后台模块。"
    },
    sharedPackages: {
      label: "共享包",
      description: "继续复用 monorepo 内的共享配置与 UI 包。"
    },
    publicExamples: {
      label: "公开示例",
      description: "同时支持壳内页面和脱壳独立访问页面。"
    }
  }
} as const;

export default zhCNDashboard;
