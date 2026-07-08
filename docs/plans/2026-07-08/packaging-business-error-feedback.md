# 包装模块业务失败提示补齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` or equivalent step-by-step execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 排查并修复包装模块页面在接口返回 `Success:false` 时，因页面事件未捕获 mutation rejection 而没有用户可见错误提示的问题。

**实现方式：** 沿用现有 `postDataResult` 行为，让业务失败继续抛出 `HttpClientError`；只在页面交互入口补 `try/catch` 并展示后端 `Message`，不改 service 契约、不改 React Query invalidation。

**技术栈：** React 19、TypeScript、TanStack Query、Vitest、Testing Library、sonner toast。

## 全局约束

- 任务级别：`L2`，因为涉及包装模块多个页面的行为修复。
- 不在 `main` / `master` 直接修改；当前任务分支为 `codex-fix-packaging-level-delete-message`。
- 代码中不新增中文 UI 文案，新增文案必须同步 `zh-CN` 和 `en-US` 资源。
- 只修复包装模块业务失败提示，不重构 service、query key、表格、表单或导入导出逻辑。
- 回归测试优先放在对应页面 `*.test.tsx`，断言 `toast.error` 收到接口 `Message`。

---

## 文件清单

- 新建：
  - `docs/plans/2026-07-08/packaging-business-error-feedback.md`
- 修改：
  - `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
  - `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`
  - `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx`
  - `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx`
  - `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx`
  - `apps/web/src/i18n/resources/zh-CN/common.ts`
  - `apps/web/src/i18n/resources/en-US/common.ts`
- 测试：
  - `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx`
  - `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx`
  - `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`
  - `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
  - `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx`

### 任务 1：补齐包装类型与包装规格业务失败提示

**文件：**

- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
- 修改：`apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`
- 修改：`apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改：`apps/web/src/i18n/resources/en-US/common.ts`
- 测试：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx`
- 测试：`apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx`

**接口：**

- 消费：`createMutation.mutateAsync`、`updateMutation.mutateAsync`、`deleteMutation.mutateAsync`、`batchDeleteMutation.mutateAsync` 抛出的 `Error.message`。
- 产出：创建、编辑、删除失败时调用 `toast.error(error.message ?? fallback)`；成功路径保持原有关闭弹层和清空选择行为。

- [ ] **步骤 1：编写失败检查**

```text
在 packaging-type 页面测试中模拟 RemovePackagingTypeData 返回：
{ Success: false, Code: "", Message: "包装类型已被使用，不能删除", Attach: null, ... }
断言 toast.error 被调用，且不会调用删除成功 toast。

在 packaging-spec 页面测试中模拟 RemovePackagingSpecData 返回：
{ Success: false, Code: "", Message: "包装规格已被使用，不能删除", Attach: null, ... }
断言 toast.error 被调用。
```

- [ ] **步骤 2：运行检查确认失败**

```bash
cd apps/web
pnpm exec vitest run src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

预期：新增用例失败，表现为 `toast.error` 未调用或出现未处理 rejection。

- [ ] **步骤 3：实现最小改动**

```text
给 packaging-type 的 handleSubmit 和 handleConfirmDelete 增加 try/catch。
给 packaging-spec 引入 toast 与 getErrorMessage，给 handleSubmit 和 handleConfirmDelete 增加 try/catch。
新增 packagingType.feedback.submitFailed 与 packagingSpec.feedback.submitFailed 中英文文案；packagingSpec 同步补齐 success/delete feedback 文案供现有路径使用。
```

- [ ] **步骤 4：再次运行验证**

```bash
cd apps/web
pnpm exec vitest run src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

预期：两个页面测试通过。

### 任务 2：补齐其余包装页面删除业务失败提示

**文件：**

- 修改：`apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx`
- 修改：`apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx`
- 修改：`apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx`
- 测试：`apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`
- 测试：`apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
- 测试：`apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx`

**接口：**

- 消费：删除 mutation rejection 的 `Error.message`。
- 产出：删除失败时调用对应页面 `toast.error`，成功路径保持原有成功 toast、翻页和清空选择行为。

- [ ] **步骤 1：编写失败检查**

```text
分别在 packaging-kit、packaging-rule、material-packaging-relation 页面测试中让删除 mutation 返回 Success:false。
断言对应页面调用 toast.error，且不会调用对应删除成功 toast。
```

- [ ] **步骤 2：运行检查确认失败**

```bash
cd apps/web
pnpm exec vitest run src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx
```

预期：新增用例失败，表现为 `toast.error` 未调用或出现未处理 rejection。

- [ ] **步骤 3：实现最小改动**

```text
给三个页面的 handleConfirmDelete 增加 try/catch，catch 中复用页面已有 getErrorMessage 和 submitFailed fallback。
不改变成功路径的 toast、分页和选择清理顺序。
```

- [ ] **步骤 4：再次运行验证**

```bash
cd apps/web
pnpm exec vitest run src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx
```

预期：三个页面测试通过。

### 任务 3：最终验证

**文件：**

- 修改：无新增业务文件。
- 测试：包装模块相关页面测试与 Web 类型检查。

- [ ] **步骤 1：运行包装页面定向测试**

```bash
cd apps/web
pnpm exec vitest run src/features/mes/packaging/packaging-level/packaging-level-page.test.tsx src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx
```

预期：所有定向页面测试通过。

- [ ] **步骤 2：运行类型检查和定向 lint**

```bash
cd apps/web
pnpm typecheck
pnpm exec eslint src/features/mes/packaging/packaging-level/packaging-level-page.tsx src/features/mes/packaging/packaging-level/packaging-level-page.test.tsx src/features/mes/packaging/packaging-type/packaging-type-page.tsx src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx apps/web/src/i18n/resources/zh-CN/common.ts apps/web/src/i18n/resources/en-US/common.ts
```

预期：类型检查和 lint 通过。
