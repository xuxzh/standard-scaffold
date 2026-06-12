# 包装管理路由 Keep-Alive Implementation Plan

> **For agentic workers:** 使用 test-driven-development 按任务逐步实施，每个行为先建立失败测试，再写最小实现。

**Goal:** 使用 React 19.2 Activity 为六个普通包装管理路由提供后台会话级页面实例缓存，并完整保留弹窗草稿。

**Architecture:** 将 `AdminLayout` 提升到持久 authenticated admin 父路由，在其 children 区域使用通用 `RouteActivityCache` 管理访问过的固定包装页面。使用表单会话初始化 Hook 避免 Activity 恢复 Effect 时重复 reset 未提交草稿。

**Tech Stack:** React 19.2、TanStack Router、React Query、React Hook Form、Radix UI、Vitest、Testing Library、Playwright。

---

## Task 1：Activity 路由缓存宿主

**Files:**

- Create: `apps/web/src/components/routing/route-activity-cache.tsx`
- Create: `apps/web/src/components/routing/route-activity-cache.test.tsx`
- Create: `apps/web/src/components/routing/route-activity-portal.tsx`
- Modify: `apps/web/src/components/ui` 中使用 Radix Portal 的封装

- [x] 写测试证明未访问定义不挂载，当前定义可见。
- [x] 写测试证明访问第二页后第一页保持挂载但隐藏，返回后状态恢复。
- [x] 写测试证明非缓存路径渲染 fallback，历史缓存仍保持隐藏。
- [x] 实现最小的已访问集合和 `<Activity>` 渲染逻辑。
- [x] 将缓存页面的 Radix Portal 限定在对应 Activity DOM 子树中。

验证：

```bash
pnpm --filter @repo/web exec vitest run src/components/routing/route-activity-cache.test.tsx
```

## Task 2：表单会话初始化

**Files:**

- Create: `apps/web/src/hooks/use-form-session-initializer.ts`
- Create: `apps/web/src/hooks/use-form-session-initializer.test.tsx`
- Modify: 五个包装业务表单组件及包装规则配置弹窗

- [x] 写测试证明首次打开初始化一次。
- [x] 写测试证明 Effect 清理并恢复后同一打开会话不重复初始化。
- [x] 写测试证明关闭再打开及编辑记录变化会建立新会话。
- [x] 实现 Hook，并替换现有会重复 reset 的 Effect。
- [x] 保留显式“重置”按钮行为。

验证：

```bash
pnpm --filter @repo/web exec vitest run src/hooks/use-form-session-initializer.test.tsx
```

## Task 3：持久后台父路由

**Files:**

- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
- Modify: `apps/web/src/app.test.tsx`

- [x] 增加路由集成测试，证明包装页面跨非缓存后台路由切换后状态恢复。
- [x] 新增 pathless authenticated admin 父路由。
- [x] 让非缓存子路由通过 Outlet 渲染，六个包装页面由缓存定义直接渲染。
- [x] 保持 standalone、login 和 embed 路由在父路由外。
- [x] 保持标题、侧边栏激活状态、滚动恢复和 provider 顺序不变。

验证：

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx
```

## Task 4：弹窗草稿与 Portal 回归

**Files:**

- Modify: 相关包装页面测试
- Modify: `apps/web-e2e/tests/navigation.spec.ts`
- Modify: `apps/web-e2e/pages/app-shell.page.ts`

- [x] 测试打开包装表单、输入草稿、切换路由和返回后草稿恢复。
- [x] 测试隐藏页面的 Dialog/Sheet Portal 不可见且不阻止当前页面。
- [x] 测试关闭后重新打开会初始化新会话。
- [x] 测试 embed 包装页仍不渲染 `AdminLayout`。

验证：

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web-e2e test:e2e
```

## Task 5：完整验证

- [ ] 运行 Web lint、typecheck、test、build。
- [ ] 运行 E2E。
- [ ] 检查 git diff 只包含本功能和正式文档。

```bash
pnpm verify:web
pnpm --filter @repo/web-e2e test:e2e
git status --short
git diff --check
```
