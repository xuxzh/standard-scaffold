# Packaging Rule Detail Dialog Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change packaging-rule detail editing from inline form rows to a nested detail dialog that writes confirmed rows into a summary table with inline edit/delete actions.

**Architecture:** Keep `PackagingRuleFormDialog` as the only owner of the main rule form and its `details` array. Add a nested detail-dialog draft flow inside that component, render confirmed `details` as a table, and preserve the existing submit payload and empty-details confirmation behavior. Update page-level tests to exercise the new add/edit/delete interaction through the user-visible dialog flow.

**Tech Stack:** React 19, TypeScript, React Hook Form, Zod, react-i18next, Vitest, Testing Library

---

## File Map

- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx`
- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`

## Task 1: Rewrite The Packaging Rule Detail Flow Test Around The Nested Dialog

**Files:**

- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
- Reference: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx`

- [ ] **Step 1: Replace the create/edit detail assertions with a failing nested-dialog flow test**

```tsx
it("creates a rule, adds details through the nested dialog, edits the row, and allows deleting all details", async () => {
  const { transport } = createStatefulPackagingRuleTransport();

  setMesTransportForTests(transport);

  render(<App initialEntries={["/packaging/packaging-rule"]} />);

  await screen.findByText("Default packaging rule");

  fireEvent.click(screen.getByRole("button", { name: "新增规则" }));
  expect(await screen.findByTestId("packaging-rule-form-dialog")).toBeInTheDocument();

  fireEvent.change(screen.getByTestId("packaging-rule-form-rule-code"), {
    target: { value: "RULE_010" },
  });
  fireEvent.change(screen.getByTestId("packaging-rule-form-rule-name"), {
    target: { value: "Created rule" },
  });

  fireEvent.click(screen.getByRole("button", { name: "添加层级明细" }));
  expect(await screen.findByTestId("packaging-rule-detail-dialog")).toBeInTheDocument();

  await selectRadixOption(
    screen.getByTestId("packaging-rule-detail-level-code"),
    "LV002",
  );
  expect(screen.getByDisplayValue("Box")).toBeInTheDocument();
  expect(screen.getByDisplayValue("2")).toBeInTheDocument();

  await selectRadixOption(
    screen.getByTestId("packaging-rule-detail-spec-code"),
    "SP002",
  );
  expect(screen.getByDisplayValue("Large spec")).toBeInTheDocument();
  expect(screen.getByDisplayValue("pcs")).toBeInTheDocument();

  fireEvent.change(screen.getByTestId("packaging-rule-detail-standard-quantity"), {
    target: { value: "10" },
  });
  fireEvent.change(screen.getByTestId("packaging-rule-detail-max-quantity"), {
    target: { value: "8" },
  });
  fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));

  expect(
    await screen.findByText("最大包装数量不能小于标准包装数量"),
  ).toBeInTheDocument();

  fireEvent.change(screen.getByTestId("packaging-rule-detail-max-quantity"), {
    target: { value: "12" },
  });
  await selectRadixOption(
    screen.getByTestId("packaging-rule-detail-method"),
    "手动",
  );
  fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));

  expect(
    await screen.findByTestId("packaging-rule-detail-row-0"),
  ).toBeInTheDocument();
  expect(screen.getByText("LV002")).toBeInTheDocument();
  expect(screen.getByText("SP002")).toBeInTheDocument();
  expect(screen.getByText("手动")).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("packaging-rule-detail-edit-0"));
  expect(await screen.findByTestId("packaging-rule-detail-dialog")).toBeInTheDocument();
  expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  expect(screen.getByDisplayValue("12")).toBeInTheDocument();

  await selectRadixOption(
    screen.getByTestId("packaging-rule-detail-method"),
    "自动",
  );
  fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));
  expect(screen.getByText("自动")).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("packaging-rule-detail-delete-0"));
  expect(
    await screen.findByText("当前没有包装关系明细，可以直接保存主信息。"),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));
  fireEvent.click(await screen.findByRole("button", { name: "继续保存" }));

  expect(await screen.findByText("Created rule")).toBeInTheDocument();
  const updateRequest = transport.mock.calls.find(
    ([request]) =>
      request.path === "/PackagingRuleApi/StorePackagingRuleData" &&
      Array.isArray((request.body as { Details?: unknown[] }).Details) &&
      (request.body as { Details: unknown[] }).Details.length === 0,
  );
  expect(updateRequest).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused packaging rule page test to verify it fails**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx -t "creates a rule, adds details through the nested dialog, edits the row, and allows deleting all details"
```

Expected: FAIL because the current UI still appends inline `details.0.*` fields to the main form and does not render `packaging-rule-detail-dialog`, summary rows, or row action buttons.

- [ ] **Step 3: Add a second failing regression test for editing an existing rule through the table**

```tsx
it("shows existing details in the summary table and edits them through the nested dialog", async () => {
  const { transport } = createStatefulPackagingRuleTransport();

  setMesTransportForTests(transport);

  render(<App initialEntries={["/packaging/packaging-rule"]} />);

  await screen.findByText("Default packaging rule");

  fireEvent.click(screen.getByTestId("packaging-rule-edit-RULE_001"));
  expect(await screen.findByTestId("packaging-rule-form-dialog")).toBeInTheDocument();

  expect(screen.getByTestId("packaging-rule-detail-row-0")).toBeInTheDocument();
  expect(screen.getByText("LV001")).toBeInTheDocument();
  expect(screen.getByText("SP001")).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("packaging-rule-detail-edit-0"));
  expect(await screen.findByTestId("packaging-rule-detail-dialog")).toBeInTheDocument();
  expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  expect(screen.getByDisplayValue("12")).toBeInTheDocument();

  fireEvent.change(screen.getByTestId("packaging-rule-detail-max-quantity"), {
    target: { value: "15" },
  });
  fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));

  fireEvent.click(screen.getByTestId("packaging-rule-form-submit"));

  const updateRequest = await waitFor(() =>
    transport.mock.calls.find(
      ([request]) =>
        request.path === "/PackagingRuleApi/UpdatePackagingRuleData" &&
        Array.isArray((request.body as { Details?: Array<{ MaxQuantity: number }> }).Details) &&
        (request.body as { Details: Array<{ MaxQuantity: number }> }).Details[0]?.MaxQuantity === 15,
    ),
  );

  expect(updateRequest).toBeTruthy();
});
```

- [ ] **Step 4: Run both focused tests and confirm they fail for the expected missing nested-dialog UI**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx -t "nested dialog|summary table"
```

Expected: FAIL with missing `packaging-rule-detail-dialog` or `packaging-rule-detail-row-0` queries.

## Task 2: Implement Detail Draft Dialog State And Summary Table Rendering

**Files:**

- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx`

- [ ] **Step 1: Add a dedicated detail schema and nested dialog state inside `PackagingRuleFormDialog`**

```tsx
const detailSchema = useMemo(
  () =>
    z
      .object({
        id: z.number().optional(),
        packagingLevelCode: z
          .string()
          .trim()
          .min(1, t("pages.packagingRule.validation.detailLevelRequired")),
        specCode: z
          .string()
          .trim()
          .min(1, t("pages.packagingRule.validation.detailSpecRequired")),
        standardQuantity: z
          .string()
          .trim()
          .min(1, t("pages.packagingRule.validation.standardQuantityRequired"))
          .refine(
            (value) => Number.isInteger(Number(value)) && Number(value) > 0,
            t("pages.packagingRule.validation.quantityPositive"),
          ),
        maxQuantity: z
          .string()
          .trim()
          .min(1, t("pages.packagingRule.validation.maxQuantityRequired"))
          .refine(
            (value) => Number.isInteger(Number(value)) && Number(value) > 0,
            t("pages.packagingRule.validation.quantityPositive"),
          ),
        packagingMethod: z.enum(["auto", "manual"]),
      })
      .superRefine((value, context) => {
        if (Number(value.maxQuantity) < Number(value.standardQuantity)) {
          context.addIssue({
            code: "custom",
            path: ["maxQuantity"],
            message: t("pages.packagingRule.validation.maxQuantityMin"),
          });
        }
      }),
  [t],
);

const [detailDialogOpen, setDetailDialogOpen] = useState(false);
const [detailEditingIndex, setDetailEditingIndex] = useState<number | null>(null);

const detailForm = useForm<PackagingRuleDetailFormValues>({
  resolver: zodResolver(detailSchema),
  defaultValues: getEmptyDetail(),
});
```

- [ ] **Step 2: Add helper functions for opening, cancelling, and confirming nested detail edits**

```tsx
function openCreateDetailDialog() {
  setDetailEditingIndex(null);
  detailForm.reset(getEmptyDetail());
  setDetailDialogOpen(true);
}

function openEditDetailDialog(index: number) {
  setDetailEditingIndex(index);
  detailForm.reset(form.getValues(`details.${index}`));
  setDetailDialogOpen(true);
}

function closeDetailDialog() {
  setDetailDialogOpen(false);
  setDetailEditingIndex(null);
  detailForm.reset(getEmptyDetail());
}

async function submitDetail(values: PackagingRuleDetailFormValues) {
  if (detailEditingIndex === null) {
    detailFields.append(values);
  } else {
    detailFields.update(detailEditingIndex, values);
  }

  closeDetailDialog();
}
```

- [ ] **Step 3: Close the nested detail dialog on main reset/close to avoid stale draft state**

```tsx
useEffect(() => {
  form.reset(getDefaultValues(record));
  setEmptyDetailsConfirmationVisible(false);
  closeDetailDialog();
}, [form, record, open]);
```

Expected adjustment: define `closeDetailDialog` before the effect or wrap it with `useCallback` so the effect can call it safely.

- [ ] **Step 4: Replace the inline detail form blocks with a summary table and row actions**

```tsx
<Button
  type="button"
  variant="outline"
  onClick={openCreateDetailDialog}
>
  <CirclePlusIcon data-icon="inline-start" />
  {t("pages.packagingRule.actions.addDetail")}
</Button>

{detailFields.fields.length ? (
  <div className="overflow-hidden rounded-md border">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 text-left">
        <tr>
          <th className="px-4 py-3">{t("pages.packagingRule.table.index")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailLevelSequence")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailLevelCode")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailLevelName")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailSpecCode")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailSpecName")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailStandardQuantity")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailMaxQuantity")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.form.detailPackagingMethod")}</th>
          <th className="px-4 py-3">{t("pages.packagingRule.table.actions")}</th>
        </tr>
      </thead>
      <tbody>
        {detailFields.fields.map((detailField, index) => {
          const currentDetail = watchedDetails[index];
          const level = levelOptions.find(
            (option) => option.levelCode === currentDetail?.packagingLevelCode,
          );
          const spec = specOptions.find(
            (option) => option.specCode === currentDetail?.specCode,
          );

          return (
            <tr key={detailField.id} data-testid={`packaging-rule-detail-row-${index}`}>
              <td className="px-4 py-3">{index + 1}</td>
              <td className="px-4 py-3">{level?.levelSequence ?? "-"}</td>
              <td className="px-4 py-3">{currentDetail?.packagingLevelCode || "-"}</td>
              <td className="px-4 py-3">{level?.levelName ?? "-"}</td>
              <td className="px-4 py-3">{currentDetail?.specCode || "-"}</td>
              <td className="px-4 py-3">{spec?.specName ?? "-"}</td>
              <td className="px-4 py-3">{currentDetail?.standardQuantity || "-"}</td>
              <td className="px-4 py-3">{currentDetail?.maxQuantity || "-"}</td>
              <td className="px-4 py-3">
                {t(`pages.packagingRule.form.packagingMethodOptions.${currentDetail?.packagingMethod ?? "auto"}`)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid={`packaging-rule-detail-edit-${index}`}
                    onClick={() => openEditDetailDialog(index)}
                  >
                    {t("pages.packagingRule.actions.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    data-testid={`packaging-rule-detail-delete-${index}`}
                    onClick={() => detailFields.remove(index)}
                  >
                    {t("pages.packagingRule.actions.delete")}
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
) : (
  <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
    {t("pages.packagingRule.form.emptyDetails")}
  </div>
)}
```

- [ ] **Step 5: Render the nested detail dialog using the extracted draft form**

```tsx
<Dialog open={detailDialogOpen} onOpenChange={(nextOpen) => {
  if (!nextOpen) {
    closeDetailDialog();
  } else {
    setDetailDialogOpen(true);
  }
}}>
  <DialogContent
    className="w-[min(100%-2rem,56rem)] max-w-none"
    data-testid="packaging-rule-detail-dialog"
  >
    <DialogHeader>
      <DialogTitle>
        {detailEditingIndex === null
          ? t("pages.packagingRule.form.detailCreateTitle")
          : t("pages.packagingRule.form.detailEditTitle")}
      </DialogTitle>
      <DialogDescription>
        {t("pages.packagingRule.form.detailsDescription")}
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={detailForm.handleSubmit(submitDetail)} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Reuse the existing Controller / Field blocks, but bind them to detailForm
            and use non-indexed ids/testids like packaging-rule-detail-level-code */}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={closeDetailDialog}>
          {t("pages.packagingRule.actions.cancel")}
        </Button>
        <Button type="submit" data-testid="packaging-rule-detail-submit">
          {t("pages.packagingRule.actions.confirm")}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

- [ ] **Step 6: Rebind the reused field blocks from indexed main-form names to draft-form names and stable test ids**

```tsx
<Controller
  name="packagingLevelCode"
  control={detailForm.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="packaging-rule-detail-level-code">
        <span aria-hidden="true" className="text-destructive">*</span>
        {t("pages.packagingRule.form.detailLevelCode")}
      </FieldLabel>
      <Select
        value={field.value || emptyPackagingRuleLevelValue}
        onValueChange={(value) =>
          field.onChange(value === emptyPackagingRuleLevelValue ? "" : value)
        }
      >
        <SelectTrigger
          id="packaging-rule-detail-level-code"
          data-testid="packaging-rule-detail-level-code"
          aria-invalid={fieldState.invalid}
          className="w-full"
          onBlur={field.onBlur}
        >
          <SelectValue placeholder={t("pages.packagingRule.form.levelPlaceholder")} />
        </SelectTrigger>
        <SelectContent>{/* existing level options */}</SelectContent>
      </Select>
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  )}
/>
```

Expected follow-through:

- derive `draftLevel` and `draftSpec` from `detailForm.watch()`,
- keep read-only `Input` fields for name, sequence, unit, and packaging type,
- give quantity and method controls these test ids:
  - `packaging-rule-detail-standard-quantity`
  - `packaging-rule-detail-max-quantity`
  - `packaging-rule-detail-method`

- [ ] **Step 7: Run the two focused page tests and confirm they pass**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx -t "creates a rule, adds details through the nested dialog, edits the row, and allows deleting all details|shows existing details in the summary table and edits them through the nested dialog"
```

Expected: PASS, with add/edit/delete working entirely through the nested detail dialog and summary table.

## Task 3: Add Missing Detail Dialog Labels And Re-Verify Packaging Rule Form Regressions

**Files:**

- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`
- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`

- [ ] **Step 1: Add the new detail-dialog and cancel labels to Chinese i18n**

```ts
actions: {
  create: "新增规则",
  batchDelete: "批量删除",
  refresh: "刷新",
  retry: "重试",
  search: "搜索",
  reset: "重置",
  configure: "配置",
  edit: "编辑",
  delete: "删除",
  addDetail: "添加层级明细",
  removeDetail: "删除明细",
  cancel: "取消",
  back: "返回",
  confirm: "确认",
  previousPage: "上一页",
  nextPage: "下一页",
},
form: {
  createTitle: "新增包装规则",
  editTitle: "编辑包装规则",
  detailCreateTitle: "添加层级明细",
  detailEditTitle: "编辑层级明细",
  // keep existing entries
},
```

- [ ] **Step 2: Add the matching English labels**

```ts
actions: {
  create: "Create Rule",
  batchDelete: "Batch Delete",
  refresh: "Refresh",
  retry: "Retry",
  search: "Search",
  reset: "Reset",
  configure: "Configure",
  edit: "Edit",
  delete: "Delete",
  addDetail: "Add Detail",
  removeDetail: "Remove Detail",
  cancel: "Cancel",
  back: "Back",
  confirm: "Confirm",
  previousPage: "Previous",
  nextPage: "Next",
},
form: {
  createTitle: "Create Packaging Rule",
  editTitle: "Edit Packaging Rule",
  detailCreateTitle: "Add Detail",
  detailEditTitle: "Edit Detail",
  // keep existing entries
},
```

- [ ] **Step 3: Update any remaining page tests that still target indexed inline detail fields**

```tsx
fireEvent.click(screen.getByRole("button", { name: "添加层级明细" }));
await selectRadixOption(
  screen.getByTestId("packaging-rule-detail-level-code"),
  "LV001",
);
await selectRadixOption(
  screen.getByTestId("packaging-rule-detail-spec-code"),
  "SP001",
);
fireEvent.change(screen.getByTestId("packaging-rule-detail-standard-quantity"), {
  target: { value: "10" },
});
fireEvent.change(screen.getByTestId("packaging-rule-detail-max-quantity"), {
  target: { value: "12" },
});
fireEvent.click(screen.getByTestId("packaging-rule-detail-submit"));
```

Specific places to update:

- the save-failure test that currently uses `packaging-rule-detail-level-code-0`
- any remaining assertions that click a button named `删除明细` from the old inline block instead of the row action test id

- [ ] **Step 4: Run the full packaging rule page test file**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx
```

Expected: PASS for the packaging rule page flows, including create, edit, empty-details confirmation, backend submit error retention, and config dialog behavior.

- [ ] **Step 5: Run typecheck for the web package**

Run:

```bash
pnpm --filter @repo/web typecheck
```

Expected: PASS with no TypeScript errors from the nested detail dialog state or translated labels.

- [ ] **Step 6: Run diagnostics on the edited files and confirm they are clean**

Check:

```text
file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx
file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx
file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/i18n/resources/zh-CN/common.ts
file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/i18n/resources/en-US/common.ts
```

Expected: no diagnostics introduced by the change.

## Notes

- Keep `getDefaultValues()` and `getEmptyDetail()` as the only constructors for main-form and detail-draft state.
- Do not change `PackagingRuleFormValues`, `PackagingRuleDetailFormValues`, or the service payload mapping in `packaging-rule-service.ts`.
- Preserve the existing empty-details warning flow in the main dialog submit path.
- Preserve the read-only `ruleCode` behavior in edit mode.
- No commit step is included because repository policy requires an explicit user request before creating commits.
