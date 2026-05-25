# Web 国际化多语言设计

日期：2026-05-21

## 目标

为 `apps/web` 增加一套可扩展的国际化能力，首版支持中文和英文切换，并为后续扩展更多语言、按页面拆分词条以及接入共享国际化基础设施预留清晰边界。

首版需要具备以下能力：

- 支持 `zh-CN` 和 `en-US` 两种语言
- 在浏览器端持久化用户语言选择
- 首次访问时可根据浏览器语言进行默认语言推断
- 提供全局语言切换入口，并在切换后即时生效
- 将现有页面中的硬编码文案迁移为统一的国际化调用方式
- 保留未来扩展其他语言和拆分 namespace 的能力

## 非目标

本次不包含以下内容：

- 接入在线翻译平台或远程词条下发能力
- 为 `packages/ui` 抽离独立国际化包
- 实现服务端渲染、URL 语言前缀或基于域名的语言路由
- 覆盖日期、数字、货币等完整本地化格式化能力
- 一次性完成整个 monorepo 的国际化改造

## 现状

当前仓库的前端主应用集中在 `apps/web`，技术栈为 React 19、Vite、TypeScript 和 TanStack Router。

现有结构已经具备接入国际化的良好入口：

- `src/root-app.tsx` 在应用顶层统一挂载全局 provider
- `src/components/layout/app-header.tsx` 已有右侧操作区，可承载语言切换入口
- 页面文案目前分散在 `routes` 和部分布局组件中，存在中英文硬编码并存的情况
- 当前尚无统一的文案资源管理、语言状态管理和持久化机制

当前缺失的关键能力主要有：

- 没有全局语言状态和对外上下文接口
- 没有统一的翻译资源目录与命名规范
- 没有语言切换 UI
- 没有默认语言推断与本地持久化逻辑

## 方案选择

本次采用 `i18next + react-i18next` 方案，并使用本地静态翻译资源文件管理首版词条。

不采用自建 `LocaleProvider + 字典对象` 的原因如下：

- 首版虽然只有中英文，但后续明确需要支持更多语言，自建方案在插值、fallback、namespace 和懒加载上会逐步重复造轮子
- `react-i18next` 与当前 React 应用结构贴合，改造成本低，学习成本也低
- 后续如果要扩展为页面级资源拆分、动态加载或接入远程词条平台，演进路径更清晰

相较于 `react-intl`，本次选择 `react-i18next` 的原因如下：

- 更适合当前以组件和页面为中心的取词方式
- namespace 组织更自然，便于按页面或模块拆分资源
- 动态切换语言和局部资源扩展更灵活

## 架构设计

在 `App` 顶层新增国际化初始化与 provider，和现有 `ThemeProvider` 共同承担全局能力。

建议新增以下模块：

- `src/i18n/config.ts`：初始化 `i18next` 实例、注册资源、设置 fallback 规则
- `src/i18n/resources/<locale>/<namespace>.ts`：按语言与 namespace 存放翻译资源
- `src/components/i18n/language-toggle.tsx`：提供语言切换 UI

全局国际化层负责以下职责：

- 初始化默认语言
- 注册翻译资源
- 暴露 `useTranslation()` 调用能力
- 处理语言切换和持久化
- 在启动阶段根据浏览器语言和本地缓存解析当前语言

应用侧不再直接使用硬编码字符串，而是统一通过 `t()` 或少量包装 hooks 获取文案。

## 语言模型设计

首版定义两个语言代码：

- `zh-CN`
- `en-US`

建议同时定义受限类型，例如：

- `type AppLocale = "zh-CN" | "en-US"`

这样既便于在切换组件中限制可选项，也方便未来新增 `ja-JP`、`fr-FR` 等语言时通过类型和注册表同步扩展。

默认语言解析优先级如下：

1. `localStorage` 中用户上次选择的语言
2. 浏览器语言 `navigator.language`
3. 默认回退到 `zh-CN`

浏览器语言解析时不要求完全匹配区域码，只要语言前缀匹配即可映射：

- `zh`、`zh-CN`、`zh-Hans` 统一映射到 `zh-CN`
- `en`、`en-US`、`en-GB` 统一映射到 `en-US`

## 资源组织设计

首版使用本地静态资源文件，并按 namespace 拆分，避免所有词条堆在单一文件中。

建议目录结构如下：

- `src/i18n/resources/zh-CN/common.ts`
- `src/i18n/resources/en-US/common.ts`
- `src/i18n/resources/zh-CN/dashboard.ts`
- `src/i18n/resources/en-US/dashboard.ts`
- `src/i18n/resources/zh-CN/examples.ts`
- `src/i18n/resources/en-US/examples.ts`

namespace 职责建议如下：

- `common`：按钮文案、头部操作、通用状态文案
- `dashboard`：仪表盘页面词条
- `examples`：示例页面词条

词条 key 采用语义化层级命名，避免把英文原文作为 key，例如：

- `header.preview`
- `dashboard.stats.activeModules.label`
- `examples.standalone.returnToDashboard`

## 组件与接入设计

首版新增或修改以下部分：

- 新增 `src/i18n/config.ts`
- 新增语言资源文件目录
- 新增 `src/components/i18n/language-toggle.tsx`
- 修改 `src/root-app.tsx`，确保应用启动前完成国际化初始化
- 修改 `src/components/layout/app-header.tsx`，接入语言切换入口
- 修改 `src/routes/dashboard.tsx`
- 修改 `src/routes/examples.standalone.tsx`
- 视情况修改 `src/routes/examples.embedded.tsx` 和其他带硬编码文案的组件

各部分职责如下：

- `config.ts`：集中定义资源、默认语言、fallback 语言和检测逻辑
- `LanguageToggle`：仅负责展示当前语言和发起切换，不持有业务文案资源
- 页面组件：只通过 `useTranslation(namespace)` 读取词条，不关心资源来源
- `AppHeader`：负责将语言切换入口放在现有右侧操作区，与主题切换并列

## 交互设计

语言切换入口建议放在 `AppHeader` 右侧，紧邻当前的主题切换按钮，保持全局设置入口的一致性。

首版交互可采用与主题切换相同的下拉菜单模式，包含两个选项：

- 中文
- English

交互要求如下：

- 当前语言要有明确选中态
- 点击后立即刷新界面文案，不需要整页刷新
- 选择结果写入 `localStorage`
- 键盘导航和无障碍行为优先复用现有 Radix 组件能力

首版不强制在按钮上展示国旗，避免引入视觉歧义。按钮可直接显示当前语言简称，如 `中文` 或 `EN`。

## 数据流设计

初始化流程如下：

1. 应用启动时加载 `i18n` 配置模块
2. 读取 `localStorage` 中的语言值
3. 如果本地没有值，则读取 `navigator.language`
4. 将结果映射为受支持的语言代码
5. 调用 `i18next.init()` 完成初始化
6. 全局 provider 和页面组件通过 `react-i18next` 获取当前语言与翻译函数

切换流程如下：

1. 用户点击 `LanguageToggle`
2. `LanguageToggle` 调用 `i18n.changeLanguage(nextLocale)`
3. `react-i18next` 触发相关组件重渲染
4. 当前语言写入 `localStorage`
5. 页面文案即时切换为目标语言

## 持久化与异常处理

持久化策略如下：

- 使用独立 key 保存语言，例如 `app-locale`
- 保存值使用标准 locale 代码，如 `zh-CN`、`en-US`

异常与边界处理如下：

- 读取到非法 locale 时回退到默认语言 `zh-CN`
- `localStorage` 不可用时静默降级，仍允许以内存状态工作
- `navigator.language` 缺失时直接回退到默认语言
- 某个 key 缺失翻译时由 `i18next` 使用 fallback 语言兜底，并在开发期通过配置暴露缺失问题

## 可扩展性设计

本次只覆盖 `apps/web`，但结构要为未来扩展留出口。

可扩展方向如下：

- 新增语言时，只需补充对应 locale 目录并在资源注册表中追加即可
- namespace 可以按页面、模块或功能逐步细化，不影响已有调用方式
- 当 `packages/ui` 出现业务型文案时，可将通用 locale 类型、检测逻辑或基础资源抽到共享包中
- 后续若需要远程词条平台，可保留当前 key 体系，仅替换资源来源与加载方式

本次不提前抽共享包，避免在只有一个应用时过早设计。

## 测试与验证

本次只补充价值较高的验证，优先覆盖基础国际化行为而不是堆砌词条快照。

建议覆盖以下内容：

- 默认语言在无缓存时可根据浏览器语言正确解析
- 读取合法 `localStorage` 值时优先使用缓存语言
- 非法缓存值会回退到默认语言
- 切换语言后页面文案即时更新
- `AppHeader` 中能看到语言切换入口，并能触发语言切换
- 当某个词条缺失时能回退到 fallback 语言

建议执行以下验证命令：

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web lint`
- `pnpm --filter @repo/web typecheck`

如增加依赖，还需要补充一次安装与构建验证。

## 成功标准

当以下条件都满足时，认为本次国际化首版完成：

- `apps/web` 可在中文和英文之间切换
- 刷新页面后仍保留用户上次选择的语言
- 首次访问可根据浏览器语言得到合理默认值
- `dashboard`、`examples`、`AppHeader` 等现有页面与布局文案已迁移到国际化资源
- 新增第三种语言时无需重构调用方式，只需扩展资源和注册表
- 验证命令通过，且无新增明显诊断错误
