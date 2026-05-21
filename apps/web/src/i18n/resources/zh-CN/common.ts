const zhCNCommon = {
  header: {
    preview: "预览",
    language: "切换语言",
    languageShort: {
      "zh-CN": "中文",
      "en-US": "EN"
    },
    languageOption: {
      "zh-CN": "中文",
      "en-US": "English"
    }
  },
  navigation: {
    title: "导航",
    dashboard: "仪表盘",
    embeddedExample: "壳内示例",
    standalonePreview: "独立预览"
  },
  brand: {
    standardScaffold: "Standard Scaffold"
  },
  pages: {
    dashboard: {
      title: "仪表盘",
      description: "一个最小可扩展的 shadcn-admin 风格后台框架。"
    },
    embeddedExample: {
      title: "壳内示例",
      description: "这个示例页面运行在后台壳内，用于验证菜单与内容区协同。"
    }
  }
} as const;

export default zhCNCommon;
