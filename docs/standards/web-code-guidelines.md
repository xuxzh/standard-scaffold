# Web 代码规范

本文档定义当前 `apps/web` 的默认实现约束。它服务于人工开发和 AI 执行，目标是让代码组织、状态边界和验证方式保持稳定。

## 目录与导入约定

- `apps/web` 使用 `@/` 指向 `src/*`。
- 如果调整路径别名，必须同时保持 `tsconfig.json`、`vite.config.ts` 和 `vitest.config.ts` 一致。
- 新代码优先沿用现有目录模式，不平行再造新的顶层组织方式。

当前默认关注的目录职责如下：

- `src/components`：应用壳层、通用展示组件和本地 UI 基础组件
- `src/features`：按功能收敛 contract、service 和局部领域逻辑
- `src/routes`：路由级组织、页面装配和与导航相关的行为
- `src/lib/api`：通用 transport、client 和 HTTP 错误归一化
- `src/i18n`：国际化资源与配置

## React 组件与 hooks 边界

### 组件优先做一件事

- 展示组件优先接收已经整理好的数据，而不是在内部再做大量请求和协议适配。
- 页面组件负责装配页面结构和状态，不负责承载过多底层细节。
- 复杂逻辑若会被复用，应抽到 feature 内部的 hook 或 service，而不是堆在页面 JSX 中。

### hooks 只抽取真正稳定的复用逻辑

- 不要为了“看起来更抽象”把只用一次、没有独立语义的局部逻辑过早抽成 hook。
- hook 名称应清晰表达用途，不要使用信息量很低的泛名。

## 数据访问分层

### 默认沿用 `contract -> service -> route/component`

- `contract` 负责定义前端消费侧的数据结构和边界
- `service` 负责请求、解析、错误归一化和必要映射
- `route/component` 负责消费数据并表达用户可见状态

不要把 HTTP 请求直接散落到页面组件，也不要让页面承担原始响应结构清洗工作。

### 通用 API 逻辑集中放在 `src/lib/api`

- HTTP client、请求头拼装、环境差异和错误归一化优先沉到 `src/lib/api`
- feature service 只处理本功能特有的适配逻辑

## 状态管理边界

- 组件局部交互状态留在组件内
- 跨树 UI 偏好使用 Context
- 远程数据默认交给 React Query 或既有数据层模式管理

如果某个状态既不属于局部交互，也不属于远程数据，需要先明确它为什么要提升边界，再决定存放位置。

## UI 组件使用边界

- 应用本地 UI 基础组件默认放在 `src/components/ui`
- 除非明确需要共享，否则不要把应用局部组件默认放到 `packages/ui`
- 复用优先级是：现有本地组件、现有 shadcn 组件、按现有方式新增 shadcn 组件、最后才是本地定制封装

## Provider 与应用入口约定

- `src/root-app.tsx` 中的 i18n 初始化副作用导入需要保留
- Theme 和 i18n provider 包裹在 router 外层；除非设计和验证都明确支持，否则不要调整顺序

## 测试与验证

### 测试分层

- `apps/web` 使用 Vitest、jsdom 和 Testing Library
- `apps/web-e2e` 使用 Playwright，优先断言用户可见行为
- E2E 选择器优先级为 `getByRole`、稳定文案、`data-testid`

### 默认验证收敛

- 局部改动至少运行与改动直接相关的最小检查
- 影响 `apps/web` 的常规改动，优先使用 `pnpm --filter @repo/web test`、`pnpm --filter @repo/web typecheck`、`pnpm --filter @repo/web lint`
- 涉及主链路、路由、应用壳层、主题、语言或关键 UI 状态时，应评估 `apps/web-e2e` 的覆盖需求

### 完成定义补充

除仓库通用完成定义外，Web 改动默认还应满足：

- 没有破坏现有目录边界与 provider 约定
- 没有把远程数据访问逻辑直接散落到页面层
- 变更点具备与风险相匹配的测试或检查证据

## 文档回写要求

当以下情况出现时，应同步更新长期规范文档，而不是只留在聊天中：

- 新形成稳定的实现边界
- 某个高频坑被确认值得作为默认规则
- 验证路径或默认工具链约定发生变化
