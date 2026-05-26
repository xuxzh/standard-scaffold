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

## 示例入口

最小可运行示例位于：

- `apps/web/src/components/examples/react-hook-form-example.tsx`
- `apps/web/src/components/examples/react-hook-form-example.test.tsx`

新增业务表单前，优先参考这个示例的依赖、字段结构、错误态和测试写法。
