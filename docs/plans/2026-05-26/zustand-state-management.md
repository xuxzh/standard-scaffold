# Zustand 状态管理实施计划

## 目标

在 `apps/web` 中引入 Zustand 作为客户端全局状态的默认补充方案，同时保留现有状态边界：远程数据继续使用 React Query，URL 状态继续使用 TanStack Router，组件局部状态继续留在组件内。

## 范围

- 为 `@repo/web` 增加 `zustand` 依赖。
- 新增 `apps/web/src/stores/app-store.ts`，作为脚手架级客户端全局状态范式。
- 新增 `apps/web/src/stores/app-store.test.ts`，覆盖初始值、更新和重置行为。
- 新增 `apps/web/src/stores/README.md`，说明 store 使用边界。
- 更新 `docs/standards/web-code-guidelines.md` 的状态管理边界。

## 非目标

- 不迁移现有 ThemeProvider、Sidebar Context 或 React Query 数据层。
- 不把 API 响应、loading、error、分页筛选等状态放入 Zustand。
- 不新增业务定制 store。

## 验证

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`
- `pnpm --filter @repo/web lint`
