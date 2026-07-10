# Web 表单实现规范

本文档记录 `apps/web` 的默认表单实现方式。除非具体任务有明确理由，否则新表单优先沿用这里的组合。

## 默认技术选型

- 表单状态使用 `react-hook-form`。
- 数据校验使用 `zod`。
- `react-hook-form` 与 `zod` 通过 `@hookform/resolvers/zod` 连接。
- 表单 UI 使用 `apps/web/src/components/ui` 下的 shadcn 组件。
- 反馈提示使用 `sonner`，并通过 `apps/web/src/components/ui/sonner.tsx` 复用本地主题状态。

## 基础结构

表单布局优先使用 `FieldGroup`、`Field`、`FieldLabel`、`FieldDescription` 和 `FieldError`。不要用普通 `div` 平行重造字段间距和错误样式。

推荐结构：

```tsx
<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="form-title">标题</FieldLabel>
      <Input
        {...field}
        id="form-title"
        aria-invalid={fieldState.invalid}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

错误态必须同时落在字段容器和实际控件上：

- `data-invalid={fieldState.invalid}` 放在 `Field`。
- `aria-invalid={fieldState.invalid}` 放在 `Input`、`SelectTrigger`、`Checkbox`、`Textarea` 等实际控件。
- 错误内容使用 `FieldError`。

## Schema 与提交

表单文件内定义当前表单的 `zod` schema，并通过 `z.infer` 推导提交值类型。

```tsx
const formSchema = z.object({
  title: z.string().min(5, "标题至少需要 5 个字符。")
});

type FormValues = z.infer<typeof formSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    title: ""
  }
});
```

提交函数只接收已经通过 schema 校验的值。远程提交继续遵守 `docs/standards/web-code-guidelines.md` 和 `docs/api/` 中的数据访问边界。

## 组件选择

- 单行文本：`Input`
- 多行文本：`Textarea`，需要字符计数或内嵌附加信息时用 `InputGroupTextarea`
- 提交与重置：`Button`
- 成组的复选框或单选项：`FieldSet`、`FieldLegend`、`FieldGroup`
- 2 到 7 个互斥选项：优先用 `ToggleGroup`
- 保存成功、失败等临时反馈：`toast` from `sonner`
- 单条二值布尔字段（`isXxx` / `enableXxx` / `shouldXxx`，中文 label 含「是否 / 启用 / 设为」）：`Switch`（自定义 `<button role="switch">`），详见下节

### Switch / 二值布尔字段

表单中**单条**的二值布尔字段（`isXxx` / `enableXxx` / `shouldXxx`，中文 label 含「是否 / 启用 / 设为」），默认用 Switch，不用原生 `<input type="checkbox">` 或 shadcn `Checkbox`。Switch 在视觉上能明确表达「开关」语义，而不是「打勾」。

#### 适用

- 单条二值字段，且读起来像「开 / 关」而不是「勾 / 不勾」。
- 弹窗、抽屉、设置页等表单行（`Field + FieldLabel`）内。

#### 不适用（继续用 checkbox 或其他控件）

- 表格行级批量勾选（全选 / 选中行）：继续用原生 checkbox，以便与表头「全选」联动。
- 过滤器里的布尔筛选：继续用 `Select`，但**不要**渲染「全部」选项；未选时用 placeholder 占位，等价于"全部"。详细规则见 `docs/standards/web-filter-form-guidelines.md`。
- 同主题下「多个互不互斥」的二值项排成列表：用 `FieldSet` + `FieldLegend` + `FieldGroup` 内的复选框，而不是堆多个 Switch。

#### 主推实现（表单场景）

`<Field orientation="horizontal" className="items-center gap-4">` 内放：

```tsx
<button
  id="<feature>-form-<field>"          // 与 FieldLabel htmlFor 对齐
  type="button"
  role="switch"                        // 测试与 a11y 的稳定锚点
  aria-checked={field.value}
  aria-label={t("pages.<feature>.form.<field>")}
  data-testid="<feature>-form-<field>"
  className={cn(
    "relative inline-flex h-10 w-16 items-center rounded-full border transition-colors",
    field.value
      ? "border-primary bg-primary/20"
      : "border-border bg-muted",
  )}
  onClick={() => field.onChange(!field.value)}
>
  <span
    className={cn(
      "inline-block h-8 w-8 rounded-full bg-background shadow transition-transform",
      field.value ? "translate-x-7" : "translate-x-1",
    )}
  />
</button>
```

关键约束：

- 尺寸固定 `h-10 w-16`、thumb `h-8 w-8`、checked 用 `border-primary bg-primary/20`（非实色，避免抢 label 视觉权重）。
- 必须设 `id` 并让 `FieldLabel` 用 `htmlFor={id}` 对齐；只靠 `aria-label` 不够。
- `aria-label` 文案必须与可见 `FieldLabel` 同义，以便 e2e 用 `getByRole("switch", { name })` 定位。
- `data-testid` 命名 `<feature>-form-<field>`，与现有 `packaging-kit-form-virtual-main`、`packaging-type-form-is-recyclable` 保持一致。
- `onClick` 翻转值即可，受控完全交给 `react-hook-form` 的 `Controller`，不要维护冗余 state。

#### 表格行内例外

表格单元内的紧凑 Switch（如数据导入模板的启用 / 必填列），可以继续使用 `radix-ui` 的 `Switch.Root` + `Switch.Thumb`（h-5 w-9），以适配表格密度。该写法不归本节规范约束，但仍需保留 `role="switch"`（radix 内建）与 `aria-label`，以便测试沿用 `getByRole("switch")` 锚点。

#### 参考实现

- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx:154-185`（标杆）
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx:449-485`
- e2e 用法：`apps/web-e2e/pages/wms/packaging/packaging-type.page.ts:84-88`

## 示例入口

最小可运行示例位于：

- `apps/web/src/components/examples/react-hook-form-example.tsx`
- `apps/web/src/components/examples/react-hook-form-example.test.tsx`

新增业务表单前，优先参考这个示例的依赖、字段结构、错误态和测试写法。
