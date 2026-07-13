# shadcn Switch 统一设计

日期：2026-07-13

## 背景

`apps/web` 当前存在三种 Switch 实现方式：

- 包装类型、包装套件和包装规格表单使用自定义 `<button role="switch">`。
- IP 代理调试页使用另一套较小尺寸的自定义 `<button role="switch">`。
- 数据导入模板弹窗直接组合 `radix-ui` 的 `Switch.Root` 与 `Switch.Thumb`。

这些实现虽然具备基本的 Switch 语义，但状态样式、焦点态、禁用态和组件 API 分散在调用方中。`docs/ui/components/form-patterns.md` 还把自定义按钮和直接使用 Radix 记录为推荐方式，与仓库“优先复用本地 shadcn 组件”的约定不一致。

## 目标

在 `apps/web` 中新增标准 shadcn `Switch` 基础组件，并将当前所有 Switch 调用方统一迁移到 `@/components/ui/switch`。

## 成功标准

- `apps/web/src/components/ui/switch.tsx` 提供基于 Radix 的 shadcn `Switch`。
- 当前四处自定义按钮和一处直接 Radix 用法全部改为公共 `Switch`。
- 调用方不再自行渲染 Switch thumb 或维护 checked/unchecked 样式。
- 原有状态更新、可访问名称、禁用逻辑、测试锚点和表单提交行为保持不变。
- 长期表单规范改为推荐公共 shadcn `Switch`。
- 受影响测试、Web lint 和 Web typecheck 通过。

## 非目标

- 不迁移 `Select`、`Dialog`、`Progress` 等其他直接使用 Radix 的组件。
- 不修改业务字段含义、默认值、校验规则或提交协议。
- 不为 Switch 新增项目定制的颜色、动画或大尺寸变体。
- 不调整表单布局、字段顺序、弹窗尺寸或表格密度。
- 不新增或升级依赖；项目已经依赖 `radix-ui`。

## 范围级别

任务级别为 `L2`。变更涉及一个共享 UI 基础组件、五处跨目录调用方和一份长期 UI 规范，属于公共组件边界调整。实现必须在任务分支或隔离 worktree 中进行，并在代码编辑前具备正式 spec 和实施计划。

## 现状清单

| 调用方 | 当前实现 | 迁移要求 |
| --- | --- | --- |
| `features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx` | 自定义按钮 | 保留 React Hook Form 受控值和可访问名称 |
| `features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx` | 自定义按钮 | 保留 `data-testid`、受控值和失焦通知 |
| `features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx` | 自定义按钮 | 保留局部表单状态更新逻辑 |
| `features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx` | 自定义按钮 | 保留配置表单状态更新逻辑 |
| `components/data-import/data-import-template-dialog.tsx` | 直接使用 Radix Root/Thumb | 保留行级启用、必填联动和禁用逻辑 |

## 建议方案

### 公共组件

使用项目的 `pnpm` runner 通过 shadcn CLI 添加 `switch`，组件落在：

```text
apps/web/src/components/ui/switch.tsx
```

公共组件保持 shadcn registry 的标准 Radix 实现和默认尺寸，仅暴露 `Switch`。调用方统一从 `@/components/ui/switch` 导入，不直接依赖其内部 `Root` 或 `Thumb`。

### 调用方 API

所有受控场景使用同一组核心属性：

```tsx
<Switch
  checked={value}
  onCheckedChange={setValue}
  aria-label={accessibleName}
/>
```

React Hook Form 的 `Controller` 调用方额外传递 `onBlur={field.onBlur}`；已有 `id`、`data-testid`、`disabled` 等属性按原行为保留。`FieldLabel htmlFor` 继续与 Switch 的 `id` 对齐。

### 尺寸和样式

所有调用方采用公共组件的默认尺寸。用户已确认允许现有 MES 表单开关变小，因此不增加 `lg` 变体，也不在调用方用 `className` 恢复旧尺寸或颜色。

数据导入表格也采用公共默认尺寸。它与现有紧凑尺寸接近，不再作为直接使用 Radix 的例外。

### 状态流

迁移只替换 UI 控件，不改变状态所有权：

- React Hook Form 页面继续由 `Controller` 的字段值控制。
- 包装规格和代理调试页面继续由现有局部表单状态控制。
- 数据导入模板继续由当前行数据和更新函数控制，`IsUse=false` 时禁用必填 Switch 的规则不变。

### 可访问性

公共组件继承 Radix Switch 的 `role="switch"`、键盘交互和 `aria-checked` 管理。调用方继续提供与可见标签同义的 `aria-label`，或者保留当前行级字段的稳定英文 `aria-label`。测试继续优先使用 `getByRole("switch", { name })` 或已有稳定 `data-testid`。

### 文档同步

更新 `docs/ui/components/form-patterns.md`：

- 将主推实现改为公共 shadcn `Switch` 示例。
- 删除固定大尺寸、自定义 thumb 和手动翻转值的要求。
- 删除数据导入表格可以直接使用 Radix 的例外。
- 保留 Switch 的适用与不适用场景、标签关联和可访问名称要求。

## 备选方案

### 公共组件增加尺寸变体

可以增加 `lg` 变体以保持 MES 表单当前的 `64×40px` 外观，但用户已接受统一缩小。额外变体会扩大公共 API 和样式维护面，因此不采用。

### 仅迁移自定义按钮

可以保留数据导入模板直接使用 Radix，但会继续存在两套公共入口，与“统一使用 shadcn UI”的目标冲突，因此不采用。

### 所有调用方直接使用 Radix

该方案能统一交互原语，但仍会让样式和 thumb 组合散落在页面中，也不符合仓库优先使用本地 shadcn 组件的约定，因此不采用。

## 测试策略

### TDD 切入点

先新增 `apps/web/src/components/ui/switch.test.tsx`，验证：

- Switch 以 `role="switch"` 和传入的可访问名称渲染。
- 点击后调用 `onCheckedChange(true)`。
- `disabled` 时不会触发状态更新。

测试应先因公共模块不存在而失败，再通过 shadcn CLI 添加组件使其通过。

### 回归验证

运行直接覆盖五处调用方的现有测试：

- `data-import-template-dialog.test.tsx`
- `debug-ip-rewrite-proxy-page.test.tsx`
- `packaging-type-page.test.tsx`
- `packaging-kit-page.test.tsx`
- `packaging-spec-page.test.tsx`

随后运行：

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

本次不改变路由、数据请求或关键业务主链路，不要求新增 E2E；已有角色和可访问名称断言继续覆盖用户可见开关行为。

### 静态收敛检查

实现完成后搜索 `apps/web/src`，确认业务调用方不存在自定义 `role="switch"`，也不存在从 `radix-ui` 导入 Switch 的用法。公共 `switch.tsx` 内部使用 Radix 属于预期实现。

## 风险与控制

- **视觉变化：** MES 表单 Switch 会缩小。该变化已经用户确认，统一使用默认尺寸控制后续漂移。
- **事件 API 差异：** 自定义按钮使用 `onClick`，公共组件使用 `onCheckedChange`。逐个保持原状态更新函数，并用调用方测试验证。
- **失焦状态遗漏：** React Hook Form 调用方显式传递 `field.onBlur`，确保 touched 语义不弱于迁移前目标行为。
- **禁用联动回归：** 数据导入模板保留 `disabled={!useChecked}`，现有测试和公共组件测试共同覆盖禁用行为。
- **无用导入：** 迁移后只删除由本次变更产生的无用 `cn` 或 Radix Switch 导入，不清理其他代码。

## 需要更新的文档

- 本设计文档。
- `docs/plans/2026-07-13/shadcn-switch-unification.md` 实施计划。
- `docs/ui/components/form-patterns.md` 长期表单规范。

无需修改 `AGENTS.md`、ADR 或运行手册。
