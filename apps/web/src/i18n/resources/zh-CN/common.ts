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
    packagingType: {
      title: "包装类型维护",
      description: "维护包装类型基础数据、筛选条件和操作闭环。",
      filters: {
        typeCode: "类型编码",
        typeCodePlaceholder: "请输入类型编码",
        typeName: "类型名称",
        typeNamePlaceholder: "请输入类型名称",
        isRecyclable: "循环包装",
        options: {
          all: "全部",
          true: "是",
          false: "否",
        },
      },
      table: {
        typeCode: "类型编码",
        typeName: "类型名称",
        isRecyclable: "循环包装",
        description: "描述",
        actions: "操作",
      },
      actions: {
        search: "查询",
        reset: "重置",
        create: "新增类型",
        edit: "编辑",
        delete: "删除",
        batchDelete: "批量删除",
        confirm: "确认",
        back: "返回",
        retry: "重试",
        previousPage: "上一页",
        nextPage: "下一页",
      },
      states: {
        loading: "正在加载包装类型数据。",
        empty: "暂无包装类型数据",
        errorTitle: "暂时无法加载包装类型列表",
        errorDescription: "请检查网络或稍后重试。",
        total: "共 {{count}} 项数据",
        page: "第 {{page}} 页",
      },
      form: {
        createTitle: "新增类型",
        editTitle: "编辑类型",
        descriptionText: "维护包装类型基础信息。",
        descriptionPlaceholder: "请输入描述",
      },
      feedback: {
        created: "包装类型已新增",
        updated: "包装类型已更新",
        deleted: "包装类型已删除",
        batchDeleted: "包装类型已批量删除",
        confirmDelete: "确认删除 {{name}} 吗？",
        confirmBatchDelete: "确认批量删除 {{count}} 条包装类型吗？",
      },
    },
  },
} as const;

export default zhCNCommon;
