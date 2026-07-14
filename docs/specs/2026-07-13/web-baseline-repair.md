# Web 基线失败修复设计

日期：2026-07-13

## 背景

当前 `main` 分支执行 `pnpm verify` 时，Web 单元测试出现 18 项失败，并产生 7 个未处理 Promise rejection。定向复跑已证明结果稳定，不属于并发偶发。

失败由两组原因叠加产生：

- 后续产品改动已经调整导出弹窗尺寸、筛选按钮文案和全局消息处理方式，但部分测试仍断言旧契约。
- 全局 `MutationCache.onError` 能展示错误提示，却不会吞掉 `mutateAsync` 返回的 rejected Promise；部分 UI 事件处理器未捕获 rejection，导致 Vitest 报告未处理异常，浏览器运行时也存在同类风险。

用户已明确授权在当前 `main` 分支修复，并确认本次不清理 11 条与阻塞失败无关的既有 ESLint warning。

## 目标

以最小范围同步测试与当前产品契约，并封住 MES 包装页面 mutation 的 UI 事件边界，使完整 `pnpm verify` 通过且不再产生未处理 Promise rejection。

## 非目标

- 不调整当前 UI 文案、弹窗尺寸、路由或数据契约。
- 不改变全局 QueryCache/MutationCache 的通知职责。
- 不新增通用异步包装抽象或修改通用 Dialog 的错误语义。
- 不清理本次基线报告中的 11 条既有 ESLint warning。
- 不重构 MES 包装页面或顺手修改相邻代码。

## 范围级别

- 任务级别：`L2`。
- 原因：修复涉及多个测试文件和多个 MES 包装页面，并调整 mutation 错误从 React Query 到 UI 事件边界的处理方式。
- 分支例外：用户明确要求并授权在当前 `main` 分支实施，不创建任务分支或 worktree。

## 受影响边界

- 测试契约：导出弹窗尺寸、筛选按钮可访问名称、全局错误 toast 的主标题与 description。
- UI 异步边界：表单提交、规则配置保存、单条/批量删除确认。
- 页面范围：包装类型、包装层级、包装规格、包装规则、包装套件、物料包装关系。
- 不影响 API contract、service、query key、路由、i18n 资源和共享组件接口。

## 建议方案

采用“测试契约同步 + 页面局部错误边界”方案。

### 1. 同步测试契约

- 将导出弹窗尺寸断言同步为当前明确提交的 `480×320` 约束。
- 将仍使用“查询”的选择器更新为当前 i18n 展示的“搜索”。
- 参照已经通过的包装规格测试，在 notify mock 中按 `HttpClientError` 还原 `description` 参数。
- 物料包装关系的 mocked-query 组件测试不再越层断言全局 QueryCache 通知，只验证页面不会显示持久错误横幅。
- 包装规则候选加载失败断言限定在表单 Dialog 内，避免同时命中 toast 中的同文案。

### 2. 捕获 UI 事件边界 rejection

- 在六个 MES 包装页面中，对可能调用 `mutateAsync` 的表单提交、配置保存和删除确认处理器增加局部 `try/catch`。
- catch 不重复展示 toast；错误提示继续由全局 `MutationCache.onError` 负责。
- mutation 成功后的关闭弹窗、清理选择和成功提示逻辑保持原样。
- 采用页面局部处理，不修改通用 Dialog，也不新增共享 helper，以避免扩大行为范围。

### 3. 保持测试驱动顺序

- 当前稳定失败的测试和未处理 rejection 作为 RED 证据。
- 先按单一根因逐组修复并运行定向测试。
- 所有定向测试通过后再运行完整 `pnpm verify`。

## 备选方案

### 方案 A：只修改测试

改动最少，但会留下生产环境中真实存在的未处理 Promise rejection，因此不采用。

### 方案 C：新增共享异步包装器或修改通用 Dialog

可以集中处理 rejection，但会改变共享组件或新增跨页面抽象，超出当前修复所需的最小范围，因此不采用。

## 验证计划

1. 定向复跑当前 6 个失败测试文件，确认 18 项失败全部消失且无未处理异常。
2. 运行 Web 局部验证：`pnpm verify:web`。
3. 运行完整基线：`pnpm verify`，覆盖 lint、typecheck、Web Vitest、Playwright E2E 和 build。
4. 运行 `git diff --check` 并确认 `git status --short` 只包含本任务必要文件。

完成汇报必须列出每条实际命令、退出码、测试总数，以及仍保留的非阻塞 warning。

## 风险

- 测试更新可能误把真实回归当作契约变化：通过提交历史和当前通过的包装规格参考测试逐项约束。
- catch 可能误吞未被全局通知处理的错误：仅包围 React Query mutation 的 UI 入口，并添加注释说明全局 MutationCache 的职责。
- 多页面机械修改可能遗漏某个 mutation 入口：实施计划需逐页列出入口，并由定向测试和全量 Vitest 验证。

## 需要更新的文档

- 本设计：`docs/specs/2026-07-13/web-baseline-repair.md`。
- 后续实施计划：`docs/plans/2026-07-13/web-baseline-repair.md`。
- 不需要更新 ADR、AGENTS.md、API 或 UI 长期规范，因为本次不改变长期边界和默认行为。
