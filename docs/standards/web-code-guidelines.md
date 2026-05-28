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

## 模块导出与 Barrel 约定

### 目标

- 对外导出入口稳定，减少调用方对内部文件结构的耦合。
- 控制模块暴露面，避免无意导出内部实现。

### 默认规则

- feature 目录可以使用 `index.ts` 作为对外入口（barrel），但应保持“少层级、可追踪”。
- `index.ts` 默认使用显式命名导出，例如 `export { PackagingTypePage } from "./packaging-type-page"`。
- 非必要场景不要使用 `export *`，避免扩大公开 API 面并降低可读性。
- 调用方优先从 feature 入口导入（例如 `@/features/<domain>/<feature>`），不要默认直连实现文件。
- 模块内部代码优先引用同目录实现文件，避免为了“统一写法”反向依赖上层 barrel，降低循环依赖风险。

### 适用边界

- 当子模块有明确对外语义时，可以保留一层子目录 `index.ts`；但不应无限增加中转层。
- 工具脚本、测试辅助或仅供局部消费的实现文件，不需要强制通过 barrel 暴露。
- 若某个符号仅用于模块内部，不应通过 `index.ts` 导出。

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
- 客户端全局状态默认使用 Zustand，通用 store 放在 `apps/web/src/stores`

如果某个状态既不属于局部交互，也不属于远程数据，需要先明确它为什么要提升边界，再决定存放位置。

### Zustand 使用边界

- Zustand 只用于跨页面、跨组件树且不适合放入 URL 的客户端状态。
- API 响应、loading、error、重试、缓存失效等远程数据状态继续使用 React Query。
- 筛选、分页、排序、tab 等可分享状态优先使用 TanStack Router search params。
- 新增 store 应暴露明确 action，并具备覆盖初始状态、核心 action 和重置行为的最小测试。
- feature 专属复杂状态可以放在 `src/features/<feature>` 内，但需要在对应 spec、plan 或局部文档中说明提升边界的原因。

## UI 组件使用边界

- 应用本地 UI 基础组件默认放在 `src/components/ui`
- 除非明确需要共享，否则不要把应用局部组件默认放到 `packages/ui`
- 复用优先级是：现有本地组件、现有 shadcn 组件、按现有方式新增 shadcn 组件、最后才是本地定制封装
- `src/components/ui` 中的基础单词命名优先保留给 shadcn primitive 或其等价基础组件，例如 `button`、`input`、`table`
- 在 `src/components/ui` 中新增本地基础封装时，文件名和组件名应使用更具体的复合语义，避免与基础 primitive 重名，例如 `search-input`、`form-section`、`table-toolbar`
- 如果组件只是对现有基础组件做轻量包装，名称应体现包装后的职责或范围，不要再创建同语义的第二套 `Button`、`Input`、`Table`
- 带明显场景语义、业务语义或完整能力语义的组件不应放在 `src/components/ui`，应放在 `src/components/<domain>` 或对应 `src/features/<feature>`

## Provider 与应用入口约定

- `src/root-app.tsx` 中的 i18n 初始化副作用导入需要保留
- Theme 和 i18n provider 包裹在 router 外层；除非设计和验证都明确支持，否则不要调整顺序

## 注释约定

### 需要注释的场景

- 核心领域模型或公共类型：当字段语义、单位、取值范围、兼容性约束不直观时，需要在类型定义附近补注释。
- 公共方法或跨模块边界方法：当方法有副作用、调用前置条件、失败语义或幂等性约束时，需要在方法声明附近补注释。
- 关键属性：当属性承载业务状态机含义、协议映射关系或历史兼容约束时，需要在属性定义附近补注释。
- 非直观分支：当代码包含业务特判、时序依赖、性能权衡或第三方限制绕行时，需要在分支前说明原因。

### 不需要注释的场景

- 代码语义已经足够清晰，注释只会重复字面行为。
- 可以通过更准确命名和更小函数拆分解决可读性问题时，不应用注释替代重构。

### 注释质量要求

- 注释优先解释“为什么”和“边界”，而不是翻译“做了什么”。
- 注释必须与实现同步修改；功能变更后，过期注释应在同次提交内清理。
- 禁止空泛注释，例如“处理数据”“执行逻辑”“更新状态”。
- 默认使用简洁英文代码注释；中文解释应放在文档而不是代码中。

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
