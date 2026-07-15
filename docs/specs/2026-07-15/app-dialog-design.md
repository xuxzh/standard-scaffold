# AppDialog 通用弹窗设计

日期：2026-07-15

## 背景

`apps/web` 中多个业务弹窗重复组合 `DialogContent`、`DialogHeader`、内容滚动区和 `DialogFooter`。以包装类型表单为例，header、footer、关闭与全屏能力、三种标准动作以及内容区的高度控制均由业务组件重复维护。包装层级、包装规则、包装规格等页面也存在相似结构。

这类重复会带来两个问题：一是相同弹窗的间距、宽度、滚动和按钮状态容易逐渐分化；二是业务组件同时承担弹窗骨架和 form、table、tabs 等具体内容，边界不清晰。

本设计新增应用级组合组件 `AppDialog`。它建立在现有 shadcn `Dialog` 组件之上，固定 header、content、footer 的视觉与布局规则，并把内容区作为 `children` 暴露给调用方。

## 目标

- 提供一个可在 `apps/web` 各业务模块复用的应用级通用弹窗组件。
- 固定 header 和 footer 的结构、间距、边框、按钮顺序、图标及视觉样式。
- 默认提供返回、重置、确认三个动作，并允许分别隐藏任意一个或多个动作。
- 允许 content 区域承载 form、table、tabs 或其他任意 React 内容。
- 默认由组件管理 content 区域的高度、滚动和间距，并允许调用方按需覆盖内容区样式。
- 保留原生表单提交语义，使 footer 中的确认按钮可以通过 `formId` 提交 content 内的表单。
- 首批将包装类型表单接入该组件，并保持现有用户可见行为不变。

## 非目标

- 不修改 `apps/web/src/components/ui/dialog.tsx` 的底层 Dialog primitive 和 Wujie 兼容逻辑。
- 不让 `AppDialog` 管理 React Hook Form、Zod、业务状态、远程请求或 toast。
- 不为 footer 增加任意插槽、自定义按钮序列或更多标准动作。
- 不在首批改动中迁移包装层级、包装规则、包装规格等其他现有弹窗。
- 不重命名 `packaging-type-form-sheet.tsx`。
- 不调整包装类型表单 schema、默认值、初始化、提交或错误展示逻辑。

## 范围级别

任务级别：`L2`。

本次新增应用级公共组件接口，并跨 `components`、业务 feature、测试和 i18n 资源进行改动。公共组件行为及表单提交边界发生调整，因此实施前必须保留正式设计文档，并在隔离 worktree 的任务分支中完成。

## 受影响边界

- 共享组件：新增 `apps/web/src/components/app-dialog.tsx`。
- 业务组件：首批只改造 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`。
- I18n：在中英文 `common.dialog.actions` 下增加标准动作文案。
- 测试：新增公共组件单元测试，并验证包装类型表单回归。
- 路由、远程数据流、provider 顺序和底层 Dialog 行为不变。

## 方案选择

### 采用方案：单一应用级 `AppDialog`

`AppDialog` 直接组合现有 `Dialog`、`DialogContent`、`DialogHeader`、`DialogTitle`、可选 `DialogDescription` 和 `DialogFooter`。调用方通过属性配置标题、尺寸和标准动作，通过 `children` 提供内容。

采用该方案的原因：

- 调用方不再重复组装弹窗骨架，header/footer 样式不会因业务接入而漂移。
- `children` 能自然承载 form、table、tabs，不绑定特定业务或状态库。
- `formId` 可以在保持 footer 独立的同时保留浏览器原生表单提交语义。
- 组件位于应用级 `components`，符合“组合现有 UI primitive，但不修改底层 shadcn 组件”的仓库边界。

### 未采用方案：Compound Components

不采用 `AppDialog.Header`、`AppDialog.Body`、`AppDialog.Footer` 等组合式 API。该方案虽然灵活，但每个调用方仍需重复组装结构，也允许绕过统一 header/footer 样式，无法直接解决本次重复问题。

### 未采用方案：专用 `FormDialog`

不把 React Hook Form、reset 或 submit 状态封装进通用组件。该方案对表单方便，但会限制 table、tabs 等非表单内容，并导致应用级组件依赖具体表单实现。

## 组件位置与依赖

组件文件：

```text
apps/web/src/components/app-dialog.tsx
```

调用方直接通过 `@/components/app-dialog` 导入，不新增 barrel export。组件只依赖：

- React 类型；
- `react-i18next`；
- `lucide-react` 中现有的返回、重置、确认图标；
- `@/components/ui/button`；
- `@/components/ui/dialog`；
- `@/lib/utils` 中的 `cn`。

## 公共 API

### 动作类型

```tsx
type AppDialogActionBase = {
  label?: React.ReactNode;
  disabled?: boolean;
  testId?: string;
};

type AppDialogBackAction =
  | false
  | (AppDialogActionBase & {
      onClick?: () => void | Promise<void>;
    });

type AppDialogResetAction =
  | false
  | (AppDialogActionBase & {
      onClick: () => void | Promise<void>;
    });

type AppDialogConfirmAction =
  | false
  | (AppDialogActionBase & {
      formId: string;
      onClick?: never;
    })
  | (AppDialogActionBase & {
      formId?: never;
      onClick: () => void | Promise<void>;
    });
```

动作约束：

- `false` 表示隐藏对应按钮。
- `backAction` 未传时显示返回按钮，并默认调用 `onOpenChange(false)`。
- 自定义 `backAction.onClick` 时，由调用方完整接管动作；组件不再自动关闭。
- 可见的重置动作必须提供 `onClick`，组件不推断业务数据如何重置。
- 表单确认通过 `formId` 工作，不再额外接受 `onClick`，避免点击提交与表单 `onSubmit` 形成两条业务链路。
- 非表单确认必须提供 `onClick`。
- `disabled` 只控制按钮状态；组件不维护 submitting 或 loading 状态。
- `label` 仅覆盖默认文案，不改变固定图标、variant 和样式。

### 组件属性

```tsx
type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;

  size?: "sm" | "md" | "lg" | "xl";
  bodyClassName?: string;
  testId?: string;

  backAction?: AppDialogBackAction;
  resetAction: AppDialogResetAction;
  confirmAction: AppDialogConfirmAction;

  showCloseButton?: boolean;
  showFullscreenButton?: boolean;
};
```

属性规则：

- `title` 始终渲染为 `DialogTitle`。
- `description` 仅在传入时渲染为 `DialogDescription`。
- `children` 只进入 content 区域，不包裹或重写业务内容。
- `bodyClassName` 只作用于 content 容器，不允许覆盖 header/footer。
- `showCloseButton` 与 `showFullscreenButton` 透传给现有 `DialogContent`，默认行为保持底层组件当前值。
- `testId` 作用于弹窗内容根节点；单个动作使用各自的 `testId`。

### 尺寸

尺寸使用受控枚举，不开放整个 Dialog 根节点的 `className`：

| size | 最大宽度 | 用途 |
| --- | --- | --- |
| `sm` | `32rem` | 简单信息或少量字段 |
| `md` | `56rem` | 默认值，普通业务表单 |
| `lg` | `72rem` | 复杂表单或小型表格 |
| `xl` | `85rem` | 宽表格或复杂组合内容 |

所有尺寸都保留 `w-[min(100%-2rem,...)] max-w-none` 的视口边界。

## DOM 与样式结构

组件使用固定三行 grid：

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className={cn(
      "grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]",
      "gap-0 overflow-hidden p-0",
      sizeClassName,
    )}
    showCloseButton={showCloseButton}
    showFullscreenButton={showFullscreenButton}
  >
    <DialogHeader className="border-b px-8 py-6">
      <DialogTitle>{title}</DialogTitle>
      {description ? (
        <DialogDescription>{description}</DialogDescription>
      ) : null}
    </DialogHeader>

    <div
      data-slot="app-dialog-body"
      className={cn("min-h-0 overflow-auto px-8 py-6", bodyClassName)}
    >
      {children}
    </div>

    {hasVisibleAction ? (
      <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
        {/* 返回、重置、确认 */}
      </DialogFooter>
    ) : null}
  </DialogContent>
</Dialog>
```

固定规则：

- header 保持 `border-b px-8 py-6`。
- footer 保持 `border-t px-8 py-6 sm:flex-row sm:justify-end`。
- content 默认使用 `min-h-0 overflow-auto px-8 py-6`，同时支持纵向和横向滚动。
- 普通状态最大高度为 `90vh`；全屏状态继续由底层 `DialogContent` 的 `data-fullscreen` 逻辑控制。
- 三个标准动作均隐藏时，不渲染 footer，避免空边框和空白区域。
- header/footer 不提供 `className` 属性，防止调用方破坏统一样式。

## 标准动作视觉

footer 的 DOM 顺序固定为返回、重置、确认：

- 返回：`variant="outline"`，使用 `ChevronLeftIcon`。
- 重置：`variant="outline"`，保留现有 destructive 边框、文字和 hover 样式，使用 `RotateCcwIcon`。
- 确认：默认 Button variant，使用 `CheckIcon`。

默认文案位于：

```text
common.dialog.actions.back
common.dialog.actions.reset
common.dialog.actions.confirm
```

中英文资源分别维护，业务代码中不写中文文案。

## 表单提交语义

表单放在 content 区域，footer 位于表单 DOM 外部。调用方为表单设置稳定 `id`，并把同一值传给 `confirmAction.formId`：

```tsx
const formId = "packaging-type-form";

<AppDialog
  open={open}
  onOpenChange={onOpenChange}
  title={title}
  resetAction={{
    onClick: () => form.reset(getDefaultValues(record)),
  }}
  confirmAction={{
    formId,
    disabled: submitting,
    testId: "packaging-type-form-submit",
  }}
>
  <form
    id={formId}
    onSubmit={form.handleSubmit(async (values) => {
      await onSubmit(values);
    })}
  >
    <FieldGroup>{/* fields */}</FieldGroup>
  </form>
</AppDialog>
```

`AppDialog` 将确认动作渲染为：

```tsx
<Button type="submit" form={formId} disabled={disabled}>
  {/* icon + label */}
</Button>
```

因此点击 footer 确认按钮与在表单内进行原生提交都进入同一个 `onSubmit`。组件不接触表单实例、不捕获校验错误，也不等待提交 Promise。

重置继续调用 React Hook Form 的 `form.reset(...)`，不使用原生 `type="reset"`，以保留业务默认值和表单状态的一致性。

## 非表单内容

非表单确认使用事件模式：

```tsx
<AppDialog
  open={open}
  onOpenChange={onOpenChange}
  title={title}
  bodyClassName="p-0"
  resetAction={false}
  confirmAction={{
    onClick: handleSelectedRows,
    disabled: selectedRows.length === 0,
  }}
>
  <DataTable />
</AppDialog>
```

- table 可用 `bodyClassName="p-0"` 形成通栏布局。
- tabs 或复杂内部布局可用 `bodyClassName="p-0 overflow-hidden"`，由业务内容接管内部滚动。
- 业务错误、空状态和 loading 内容都由调用方在 `children` 中渲染。

## 包装类型首批迁移

`PackagingTypeFormSheet` 保留当前对外 Props、表单 schema、`useFormSessionInitializer`、默认值和提交回调。只替换弹窗骨架：

- `title` 继续按 create/edit mode 计算。
- `size` 使用默认 `md`，对应当前 `56rem` 宽度。
- `testId` 保留 `packaging-type-form-sheet`。
- 表单保留 `id="packaging-type-form"` 和现有 `onSubmit`。
- `FieldGroup` 移除由 `AppDialog` 接管的最大高度、滚动和 `px-8 py-6`，保留字段布局职责。
- 返回动作使用默认关闭行为。
- 重置动作继续调用 `form.reset(getDefaultValues(record))`。
- 确认动作使用 `formId="packaging-type-form"`，保留 submitting 禁用状态和原有 test id。

迁移后用户可见标题、字段、按钮顺序、按钮文案、按钮样式、关闭行为、重置行为和提交流程均不改变。

## 状态与错误边界

- `open` 是受控状态，所有关闭请求继续通过 `onOpenChange`。
- 默认返回、关闭按钮和 Escape 触发 `onOpenChange(false)`；调用方仍可在受控状态层决定是否接受关闭。
- 重置与确认的业务异常由调用方处理，`AppDialog` 不捕获、不 toast、不改变 open 状态。
- async 动作由调用方通过 `disabled` 防止重复触发，组件不维护内部 pending 状态。
- 底层 Dialog 的点击遮罩不关闭、Wujie pointer-events 修复、portal 和层级策略保持不变。

## 测试与验收

### `AppDialog` 单元测试

- 默认渲染 title、children 和返回、重置、确认三个动作。
- 未传 `backAction` 时，点击返回调用 `onOpenChange(false)`。
- 自定义返回动作时只调用自定义事件。
- 每个动作均可通过 `false` 单独隐藏。
- 三个动作均隐藏时不渲染 footer。
- 重置按钮调用传入的事件。
- 非表单确认按钮调用传入事件。
- 表单确认按钮生成正确的 `type="submit"` 和 `form` 属性，并触发表单 `onSubmit`。
- `disabled`、`testId`、`bodyClassName` 和尺寸映射正确生效。
- 默认动作文案可随 i18n 在中英文间切换。

### 包装类型回归

- 创建和编辑标题保持正确。
- 返回按钮关闭弹窗。
- 重置恢复当前 create/edit 会话的默认值。
- 确认继续通过 React Hook Form 与 Zod 校验后调用 `onSubmit`。
- submitting 时确认按钮禁用。
- 关闭、路由切换和重新打开时，现有表单会话初始化与草稿行为不变。

### 验证命令

实施阶段至少执行：

```bash
pnpm --filter @repo/web test -- app-dialog
pnpm --filter @repo/web test -- app
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm verify:web
```

另做一次本地视觉检查，覆盖普通尺寸、内容滚动和全屏状态，确认 header/footer 与当前包装类型弹窗一致。路由和远程数据流未改变，因此首批不强制新增 E2E 用例；如果单元测试无法覆盖原生表单提交或路由缓存行为，再补最窄 E2E。

## 风险与缓解

### footer 移到表单外导致提交回归

通过 `formId` 生成原生 `type="submit"` 与 `form` 属性，并使用单元测试验证点击和回车提交统一进入表单 `onSubmit`。

### content 双重滚动或间距重复

`AppDialog` 默认拥有滚动和间距；首批迁移时移除 `FieldGroup` 上对应的高度、滚动和 padding。table/tabs 使用 `bodyClassName` 明确覆盖。

### 公共组件过度灵活导致样式再次漂移

不暴露 header/footer class、不提供 footer 插槽，只开放受控尺寸、content 样式和标准动作状态。

### 一次迁移多个弹窗扩大回归面

首批只迁移包装类型表单。其他弹窗在公共 API 通过验证后分批迁移。

## 完成标准

- `AppDialog` 公共 API、固定结构、尺寸、标准动作和表单提交规则按本文实现。
- 包装类型表单完成首批迁移且用户可见行为不变。
- 中英文默认动作文案齐全，业务代码不新增中文。
- 公共组件单元测试、包装类型回归测试、Web lint、typecheck 和 `verify:web` 通过。
- 本地视觉检查确认 header/footer、content 滚动和全屏布局符合设计。

