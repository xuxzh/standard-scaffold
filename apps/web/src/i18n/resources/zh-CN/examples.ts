const zhCNExamples = {
  embedded: {
    title: "壳内示例",
    description: "这个页面运行在后台壳内，适合放业务表单、列表和看板。",
    quickSetup: "快速设置",
    quickSetupDescription: "演示 `FieldGroup + Field` 的后台表单布局。",
    workspaceName: "工作区名称",
    ownerEmail: "负责人邮箱",
    saveDraft: "保存草稿",
    layoutNotes: "布局说明",
    layoutNotesDescription: "这部分用于说明后台壳与内容区的职责边界。",
    noteOne: "导航和全局动作放在壳层，页面只负责业务内容。",
    noteTwo: "后续可以继续接表格、图表、权限或真实数据，而不需要重做路由骨架。",
    noteThree: "如果某个示例需要全屏展示，则可以直接走独立路由模式。"
  },
  standalone: {
    routeAccess: "直接路由访问",
    title: "独立示例",
    paragraphOne: "这个页面不经过后台壳，因此不会渲染菜单栏、标题栏或侧边栏。",
    paragraphTwo: "适合承载独立 Demo、分享页、登录页，或者需要全屏布局的说明页面。",
    returnToDashboard: "返回仪表盘",
    fullscreenDemo: "查看全屏 Demo"
  }
} as const;

export default zhCNExamples;
