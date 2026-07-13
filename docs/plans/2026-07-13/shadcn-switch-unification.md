# shadcn Switch 统一实施计划

> **面向 Agent 执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务实施。步骤使用复选框 `- [ ]` 跟踪。

**目标：** 新增标准 shadcn `Switch`，并将 `apps/web` 当前全部五处 Switch 调用方统一迁移到该公共组件。

**实现方式：** 先用组件测试建立公共 API 的红绿循环，再按调用方类型分两批迁移；迁移只替换控件层，保持各页面现有状态所有权、可访问名称、禁用联动和测试锚点。最后同步长期表单规范，并通过测试、类型检查、lint 和静态搜索收敛实现。

**技术栈：** React 19、TypeScript、shadcn/ui、Radix UI、React Hook Form、Vitest、Testing Library、pnpm workspace。

## 全局约束

- 任务级别固定为 `L2`，实施必须在 `codex-unify-shadcn-switch` 分支的隔离 worktree 中进行。
- 所有调用方使用 `@/components/ui/switch`，不得直接导入或组合 Radix Switch。
- 所有调用方采用 shadcn 默认尺寸，不新增尺寸变体，不用 `className` 恢复旧尺寸或颜色。
- 保留现有状态更新、`id`、`aria-label`、`data-testid` 和 `disabled` 行为。
- React Hook Form 调用方传递 `checked`、`onCheckedChange` 和 `onBlur`。
- 不修改其他 Radix 组件、业务字段、默认值、校验、协议、布局或路由。
- 使用 `pnpm`，所有终端命令遵循仓库约定从仓库根目录执行并加 `rtk` 前缀。
- 代码中不新增中文；本任务不新增或修改 i18n 文案。

---

## 文件清单

**新建：**

- `apps/web/src/components/ui/switch.tsx`：shadcn Switch 公共实现。
- `apps/web/src/components/ui/switch.test.tsx`：公共 Switch 的语义、受控更新和禁用行为测试。

**修改：**

- `apps/web/src/components/data-import/data-import-template-dialog.tsx`
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx`
- `docs/ui/components/form-patterns.md`

**现有回归测试：**

- `apps/web/src/components/data-import/data-import-template-dialog.test.tsx`
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx`
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx`

---

### 任务 1：以 TDD 添加公共 shadcn Switch

**文件：**

- 新建：`apps/web/src/components/ui/switch.test.tsx`
- 新建：`apps/web/src/components/ui/switch.tsx`

**接口：**

- 输入：Radix `Switch.Root` 支持的属性，以及 shadcn `size?: "sm" | "default"`。
- 输出：命名导出 `Switch`，调用方通过 `checked`、`onCheckedChange`、`disabled` 等属性使用。

- [ ] **步骤 1：编写失败测试**

新建 `apps/web/src/components/ui/switch.test.tsx`：

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "@/components/ui/switch";

function ControlledSwitch() {
  const [checked, setChecked] = useState(false);

  return (
    <Switch
      checked={checked}
      onCheckedChange={setChecked}
      aria-label="Enable notifications"
    />
  );
}

describe("Switch", () => {
  it("exposes switch semantics and updates a controlled value", () => {
    render(<ControlledSwitch />);

    const control = screen.getByRole("switch", {
      name: "Enable notifications",
    });

    expect(control).toHaveAttribute("aria-checked", "false");

    fireEvent.click(control);

    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("does not request a value change while disabled", () => {
    const onCheckedChange = vi.fn();

    render(
      <Switch
        disabled
        checked={false}
        onCheckedChange={onCheckedChange}
        aria-label="Enable notifications"
      />,
    );

    fireEvent.click(
      screen.getByRole("switch", { name: "Enable notifications" }),
    );

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **步骤 2：运行测试，确认 RED**

执行：

```bash
rtk pnpm --filter @repo/web test -- src/components/ui/switch.test.tsx
```

预期：测试因 `@/components/ui/switch` 模块不存在而失败；失败原因必须是缺少目标组件，而不是测试语法或环境错误。

- [ ] **步骤 3：通过 shadcn CLI 添加最小实现**

执行：

```bash
cd apps/web
rtk pnpm dlx shadcn@latest add switch
cd ../..
```

确认生成的 `apps/web/src/components/ui/switch.tsx`：

- 从 `radix-ui` 导入 Switch primitive。
- 使用 `@/lib/utils` 的 `cn`。
- 命名导出 `Switch`。
- 保持 registry 默认尺寸和样式，不添加本地变体或业务逻辑。

- [ ] **步骤 4：运行测试，确认 GREEN**

执行：

```bash
rtk pnpm --filter @repo/web test -- src/components/ui/switch.test.tsx
```

预期：`switch.test.tsx` 的 2 个测试全部通过，无错误或警告。

- [ ] **步骤 5：检查生成差异并提交**

执行：

```bash
rtk git status --short
rtk git diff --check
rtk git add apps/web/src/components/ui/switch.tsx apps/web/src/components/ui/switch.test.tsx
rtk git commit -m "feat(web): add shadcn switch component"
```

预期：提交只包含公共组件及其测试。

---

### 任务 2：迁移数据导入和代理调试调用方

**文件：**

- 修改：`apps/web/src/components/data-import/data-import-template-dialog.tsx`
- 修改：`apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`
- 测试：`apps/web/src/components/data-import/data-import-template-dialog.test.tsx`
- 测试：`apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx`

**接口：**

- 消费：任务 1 的 `Switch` 命名导出。
- 保证：数据导入行级 `IsUse` / `IsRequired` 更新、必填禁用联动和代理 `enabled` 更新保持不变。

- [ ] **步骤 1：运行现有行为测试建立重构基线**

执行：

```bash
rtk pnpm --filter @repo/web test -- src/components/data-import/data-import-template-dialog.test.tsx src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
```

预期：两份现有测试在迁移前通过，证明后续是受保护的行为保持型重构。

- [ ] **步骤 2：运行结构检查，确认当前实现尚未统一**

执行：

```bash
rtk rg -n 'import \{ Switch \} from "radix-ui"|role="switch"' apps/web/src/components/data-import/data-import-template-dialog.tsx apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx
```

预期：数据导入文件命中直接 Radix 导入，代理调试文件命中自定义 `role="switch"`。

- [ ] **步骤 3：迁移数据导入模板**

将：

```tsx
import { Switch } from "radix-ui";
```

替换为：

```tsx
import { Switch } from "@/components/ui/switch";
```

将两处 `Switch.Root` / `Switch.Thumb` 组合分别替换为：

```tsx
<Switch
  checked={useChecked}
  onCheckedChange={(value) => handleToggleUse(row, value)}
  aria-label={`enable-${row.FieldName}`}
  data-testid={`switch-use-${row.FieldName}`}
/>
```

以及：

```tsx
<Switch
  checked={row.IsRequired && useChecked}
  disabled={!useChecked}
  onCheckedChange={(value) =>
    updateRow(row.FieldName, { IsRequired: value })
  }
  aria-label={`require-${row.FieldName}`}
  data-testid={`switch-required-${row.FieldName}`}
/>
```

不得保留调用方的 Switch 尺寸、颜色或 thumb 样式。

- [ ] **步骤 4：迁移代理调试页**

新增导入：

```tsx
import { Switch } from "@/components/ui/switch";
```

删除仅由旧 Switch 使用的：

```tsx
import { cn } from "@/lib/utils";
```

将自定义按钮和内部 `span` 替换为：

```tsx
<Switch
  id={ENABLED_SWITCH_ID}
  checked={form.enabled}
  onCheckedChange={(checked) => updateField("enabled", checked)}
  aria-label="启用代理"
/>
```

- [ ] **步骤 5：验证结构和行为**

执行：

```bash
rtk rg -n 'import \{ Switch \} from "radix-ui"|role="switch"|<Switch\.Root|<Switch\.Thumb' apps/web/src/components/data-import/data-import-template-dialog.tsx apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx
rtk pnpm --filter @repo/web test -- src/components/data-import/data-import-template-dialog.test.tsx src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx
```

预期：`rg` 无输出并以状态 1 结束；两份测试全部通过。

- [ ] **步骤 6：提交调用方迁移**

执行：

```bash
rtk git diff --check
rtk git add apps/web/src/components/data-import/data-import-template-dialog.tsx apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx
rtk git commit -m "refactor(web): use shared switch in utility views"
```

---

### 任务 3：迁移 MES 包装表单调用方

**文件：**

- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`
- 修改：`apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`
- 修改：`apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx`
- 测试：对应的 `packaging-type-page.test.tsx`、`packaging-kit-page.test.tsx`、`packaging-spec-page.test.tsx`

**接口：**

- 消费：任务 1 的 `Switch` 命名导出。
- 保证：包装类型和套件继续由 React Hook Form 控制；包装规格继续由局部 `values` 控制。

- [ ] **步骤 1：运行现有行为测试建立重构基线**

执行：

```bash
rtk pnpm --filter @repo/web test -- src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

预期：三份页面测试在迁移前通过。

- [ ] **步骤 2：确认当前三处自定义实现仍存在**

执行：

```bash
rtk rg -n 'role="switch"' apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx
```

预期：三个文件各命中一处。

- [ ] **步骤 3：迁移包装类型表单**

新增：

```tsx
import { Switch } from "@/components/ui/switch";
```

删除仅由旧 Switch 使用的 `cn` 导入，并用以下组件替换自定义按钮：

```tsx
<Switch
  id={recyclableSwitchId}
  checked={field.value}
  onCheckedChange={field.onChange}
  onBlur={field.onBlur}
  aria-label={t("pages.packagingType.filters.isRecyclable")}
/>
```

- [ ] **步骤 4：迁移包装套件表单**

新增公共 `Switch` 导入，删除仅由旧 Switch 使用的 `cn` 导入，并替换为：

```tsx
<Switch
  id="packaging-kit-form-virtual-main"
  checked={field.value}
  onCheckedChange={field.onChange}
  onBlur={field.onBlur}
  aria-label={t("pages.packagingKit.form.isVirtualMain")}
  data-testid="packaging-kit-form-virtual-main"
/>
```

- [ ] **步骤 5：迁移包装规格表单**

新增公共 `Switch` 导入，删除仅由旧 Switch 使用的 `cn` 导入，并替换为：

```tsx
<Switch
  id="packaging-spec-form-is-enabled"
  checked={values.isEnabled}
  onCheckedChange={(checked) =>
    setValues((current) => ({
      ...current,
      isEnabled: checked,
    }))
  }
  aria-label={t("pages.packagingSpec.form.enabled")}
/>
```

- [ ] **步骤 6：验证结构和行为**

执行：

```bash
rtk rg -n 'role="switch"|<Switch\.Root|<Switch\.Thumb' apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx
rtk pnpm --filter @repo/web test -- src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

预期：`rg` 无输出并以状态 1 结束；三份页面测试全部通过。

- [ ] **步骤 7：提交 MES 表单迁移**

执行：

```bash
rtk git diff --check
rtk git add apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx
rtk git commit -m "refactor(mes): use shared switch in packaging forms"
```

---

### 任务 4：更新长期规范并完成验证

**文件：**

- 修改：`docs/ui/components/form-patterns.md`

**接口：**

- 文档输出：以后单条二值字段和表格紧凑 Switch 都从 `@/components/ui/switch` 使用公共组件。

- [ ] **步骤 1：更新 Switch 主推实现**

把“组件选择”中的 Switch 描述改为：

```markdown
- 单条二值布尔字段（`isXxx` / `enableXxx` / `shouldXxx`，中文 label 含「是否 / 启用 / 设为」）：使用 `@/components/ui/switch` 提供的 shadcn `Switch`，详见下节
```

把“主推实现（表单场景）”示例改为：

```tsx
<Field orientation="horizontal" className="items-center gap-4">
  <FieldLabel htmlFor="<feature>-form-<field>">
    {t("pages.<feature>.form.<field>")}
  </FieldLabel>
  <Switch
    id="<feature>-form-<field>"
    checked={field.value}
    onCheckedChange={field.onChange}
    onBlur={field.onBlur}
    aria-label={t("pages.<feature>.form.<field>")}
    data-testid="<feature>-form-<field>"
  />
</Field>
```

关键约束改为：

- 从 `@/components/ui/switch` 导入公共组件，不在业务调用方直接使用 Radix 或自定义 thumb。
- 默认使用公共组件尺寸和语义样式，不在调用方覆盖颜色与尺寸。
- `id` 与 `FieldLabel htmlFor` 必须对齐。
- `aria-label` 与可见标签同义。
- React Hook Form 使用 `checked={field.value}`、`onCheckedChange={field.onChange}` 和 `onBlur={field.onBlur}`。
- 需要稳定测试锚点时沿用 `<feature>-form-<field>` 命名。

删除“表格行内例外”中允许直接使用 Radix 的说明，替换为：表格场景同样使用公共 shadcn `Switch`，保留行级 `aria-label`、`data-testid` 和 `disabled` 联动，不在表格调用方重写 primitive 样式。

- [ ] **步骤 2：执行文档和全局静态检查**

执行：

```bash
rtk rg -n '自定义 `<button role="switch">`|Switch\.Root|Switch\.Thumb|直接使用 `radix-ui`' docs/ui/components/form-patterns.md
rtk rg -n 'role="switch"|<Switch\.Root|<Switch\.Thumb|import \{ Switch \} from "radix-ui"' apps/web/src --glob '*.tsx' --glob '*.ts'
rtk git diff --check
```

预期：前两个 `rg` 均无输出并以状态 1 结束；`git diff --check` 通过。公共 `switch.tsx` 从 `radix-ui` 导入的是 `Switch as SwitchPrimitive`，不会匹配禁止模式。

- [ ] **步骤 3：运行受影响测试**

执行：

```bash
rtk pnpm --filter @repo/web test -- src/components/ui/switch.test.tsx src/components/data-import/data-import-template-dialog.test.tsx src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

预期：六份测试文件全部通过，无失败测试。

- [ ] **步骤 4：运行 Web 完整验证**

执行：

```bash
rtk pnpm --filter @repo/web test
rtk pnpm --filter @repo/web typecheck
rtk pnpm --filter @repo/web lint
```

预期：Web 全量单元测试、TypeScript 类型检查和 ESLint 均以状态 0 结束。

- [ ] **步骤 5：复核范围并提交文档**

执行：

```bash
rtk git status --short
rtk git diff --stat origin/main...HEAD
rtk git add docs/ui/components/form-patterns.md
rtk git commit -m "docs(web): standardize shadcn switch usage"
```

复核最终差异只包含本计划列出的公共组件、五个调用方、公共组件测试、长期规范、spec 和 plan，不包含依赖升级、锁文件修改或无关格式化。
