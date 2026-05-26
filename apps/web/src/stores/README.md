# 客户端全局状态

`src/stores` 用于存放跨页面、跨组件树的客户端全局状态。当前默认使用 Zustand。

## 适合放入 Zustand 的状态

- 跨多个页面共享的客户端上下文。
- 不适合写入 URL、但需要被多个远端组件读取的 UI 状态。
- 多步骤操作中的临时草稿或操作上下文。
- 和服务端缓存无关的前端运行时偏好。

## 不适合放入 Zustand 的状态

- API 响应、loading、error、重试和缓存失效：继续使用 React Query。
- 筛选、分页、排序、tab 等可分享状态：优先使用 TanStack Router search params。
- 只在单个组件内使用的交互状态：留在 `useState` 或 `useReducer`。
- 已经由专用 provider 管理且边界清晰的状态：不要为了统一而迁移。

## 使用约定

- store 应暴露明确的 action，不在组件中直接拼接复杂更新逻辑。
- 组件消费 store 时优先使用 selector，例如 `useAppStore((state) => state.activeScopeName)`。
- 每个新增 store 都应具备最小测试，覆盖初始状态、核心 action 和重置行为。
- feature 专属且复杂的状态可以放在对应 `src/features/<feature>` 目录中，并在局部 README 或 spec 中说明原因。
