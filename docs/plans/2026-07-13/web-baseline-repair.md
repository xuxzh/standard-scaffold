# Web 基线失败修复实施计划

## 摘要

在 `709889e` 基线上实施方案 B。当前 Web 测试为 6 个文件、18 个用例失败，并产生 7 个未处理异步错误；修复仅覆盖这些阻断项，不处理现有 11 条 lint warning，不修改当前产品行为。

变更级别为 `L2`。本计划以现有设计文档 `docs/specs/2026-07-13/web-baseline-repair.md` 为约束。

## 实施步骤

### 1. 基线与工作区预检

- 确认 HEAD，检查工作区状态。
- 执行 `rtk pnpm --filter @repo/web test`，确认失败集合仍为 6 个测试文件、18 个断言和 7 个未处理错误。
- 若 HEAD 已变化或存在重叠的用户修改，先重新核对失败集合，不覆盖或回退已有改动。

### 2. 校正已过期或边界错误的测试契约

- 数据导出弹窗测试改为断言当前 `480×320` 尺寸，不恢复旧尺寸。
- 包装类型、包装层级、包装套件测试中的按钮查询由“查询”改为当前用户可见文案“搜索”。
- 包装规则选项加载错误断言限定在表单弹窗范围内，避免同时匹配表单错误和全局 toast。
- 包装类型、包装层级、包装规则、包装套件的通知 mock 按真实 `HttpClientError` 转换逻辑传递错误描述。
- 物料包装关系列表失败测试只验证页面不渲染持久错误条；删除失败测试验证不触发成功流程。直接 mock query/mutation 的组件测试不再断言全局 QueryCache 通知。
- 完成后运行六个定向测试文件；允许此中间检查仍报告生产代码产生的未处理 rejection，但不应再有过期文案、尺寸或重复文本导致的断言失败。

### 3. 封闭异步 mutation 的事件处理边界

- 在包装类型、包装层级、包装套件的 `handleSubmit` 和 `handleConfirmDelete` 中捕获 `mutateAsync` 拒绝。
- 在包装规则的 `handleFormSubmit`、`handleConfigSubmit`、`handleConfirmDelete` 中执行相同处理。
- 在物料包装关系的 `handleFormSubmit`、`handleConfirmDelete` 中执行相同处理。
- 包装规格保留现有删除确认边界，仅为 `handleSubmit` 增加对应处理。
- catch 只阻止 rejection 逃逸到 React 事件循环；错误通知继续由全局 `MutationCache.onError` 负责，不新增重复 toast。
- 成功后的关闭弹窗、刷新状态等逻辑仍只在 mutation 成功后执行；失败时表单保持可操作，删除目标不被成功分支清理，可重新打开确认弹窗。
- 不抽取共享 helper，不修改 QueryClient、通用 Dialog、API、query key 或 i18n 结构。

### 4. 定向与完整验证

- 运行六个受影响测试文件，要求全部通过且无 unhandled errors：

  ```bash
  rtk pnpm --filter @repo/web exec vitest run \
    src/components/data-export/data-export-dialog.test.tsx \
    src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx \
    src/features/mes/packaging/packaging-level/packaging-level-page.test.tsx \
    src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx \
    src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx \
    src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx
  ```

- 运行 `rtk pnpm verify:web`。
- 运行 `rtk pnpm verify`，要求 lint、类型检查、Web 测试、构建和 E2E 全部通过；现有 11 条非阻断 lint warning 可以保留。
- 最后执行 `rtk git diff --check` 和 `rtk git status --short`，确认无格式错误、生成物或范围外改动。

## 公共接口与兼容性

- 不新增或修改公共 API、类型、数据结构、路由、翻译键和共享组件接口。
- 保持“搜索”文案、数据导出弹窗 `480×320` 尺寸以及全局 mutation 错误通知机制不变。
- 修复仅改变失败 mutation 在 UI 事件边界的 Promise 处理方式。

## 验收场景

- 六个目标测试文件全部通过，Vitest 不再报告未处理 rejection。
- 创建、编辑、配置保存和删除失败时只出现一次全局错误通知。
- mutation 失败后不执行成功分支，相关表单保持可操作，删除目标仍可再次确认。
- 列表请求失败时不出现持久内联错误条。
- 搜索、导出及正常 CRUD 成功流程维持现有行为。
- 完整 `pnpm verify` 通过。

## 假设与约束

- 按仓库治理规则使用 `.worktrees/codex-web-baseline-repair` 隔离 worktree 和 `codex-web-baseline-repair` 任务分支，不在 `main` 直接修改。
- 通用 `AlertDialogAction` 点击后会按现有行为关闭确认弹窗；本次不修改通用 Dialog，删除失败后通过保留删除目标支持重新确认。
- 不清理现有 lint warning、调试日志或其他无关代码。
- 不暂存、提交、推送或创建 PR，除非用户后续明确要求。
- 每一处代码变更都必须能追溯到当前 18 个失败断言或 7 个未处理异步错误。
