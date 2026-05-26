const zhCNCommon = {
  header: {
    preview: "预览",
    language: "切换语言",
    languageShort: {
      "zh-CN": "中文",
      "en-US": "EN",
    },
    languageOption: {
      "zh-CN": "中文",
      "en-US": "English",
    },
  },
  navigation: {
    title: "导航",
    dashboard: "仪表盘",
    exampleManagement: "示例管理",
    embeddedExample: "壳内示例",
    packagingManagement: "包装管理",
    packagingTypeMaintenance: "包装类型维护",
    standalonePreview: "独立预览",
  },
  brand: {
    standardScaffold: "Standard Scaffold",
  },
  pages: {
    dashboard: {
      title: "仪表盘",
      description: "一个最小可扩展的 shadcn-admin 风格后台框架。",
    },
    embeddedExample: {
      title: "壳内示例",
      description: "这个示例页面运行在后台壳内，用于验证菜单与内容区协同。",
    },
    packaging: {
      title: "包装管理",
      description: "管理包装任务、作业状态和异常处理。",
      summary: {
        pendingTasks: {
          label: "待包装",
          description: "等待分配或开始处理的包装任务。",
        },
        inProgressTasks: {
          label: "包装中",
          description: "正在执行中的包装作业。",
        },
        exceptionTasks: {
          label: "异常",
          description: "需要人工处理的包装异常。",
        },
      },
    },
  },
} as const;

export default zhCNCommon;
