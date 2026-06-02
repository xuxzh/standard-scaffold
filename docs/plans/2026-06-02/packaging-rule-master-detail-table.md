# Packaging Rule Master-Detail Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render packaging rule query results as a master-detail table where each parent row can expand inline to show its packaging relation details while preserving the existing row actions.

**Architecture:** Reuse the existing `DataTable` expandable-row capability instead of introducing a second table implementation. Keep the list query, record mapping, page state, and rule/config dialogs unchanged; scope the behavior change to the packaging rule table presentation and a focused page-level behavior test.

**Tech Stack:** React 19, Vite, TypeScript, TanStack Table, Vitest, Testing Library, react-i18next

---

## File Map

- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-table.tsx`
- Keep unchanged: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx`
- Reference pattern: `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-table.tsx`

### Task 1: Add Inline Detail Expansion To Packaging Rule Table

**Files:**

- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
- Modify: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-table.tsx`
- Test: `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
it("expands a packaging rule row to show detail records inline", async () => {
  setMesTransportForTests(createStatefulPackagingRuleTransport());

  render(<App initialEntries={["/packaging/packaging-rule"]} />);

  expect(await screen.findByText("Default packaging rule")).toBeInTheDocument();
  expect(screen.queryByText("Standard spec")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "展开 RULE_001" }));

  const expandedRow = await screen.findByTestId(
    "packaging-rule-details-RULE_001",
  );

  expect(within(expandedRow).getByText("LV001")).toBeInTheDocument();
  expect(within(expandedRow).getByText("Unit")).toBeInTheDocument();
  expect(within(expandedRow).getByText("SP001")).toBeInTheDocument();
  expect(within(expandedRow).getByText("10")).toBeInTheDocument();
  expect(within(expandedRow).getByText("12")).toBeInTheDocument();
  expect(within(expandedRow).getByText("自动")).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify it fails** (skipped — implementation was already complete; test passes)

Run: `pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx -t "expands a packaging rule row to show detail records inline"`

Expected: FAIL because the packaging rule table does not yet pass `getRowCanExpand` and `renderExpandedRow` to `DataTable`, so no expand button or inline child table is rendered.

- [x] **Step 3: Write minimal implementation**

```tsx
<DataTable
  columns={columns}
  data={data}
  getRowId={(row) => String(row.id)}
  getRowCanExpand={(row) => row.original.details.length > 0}
  renderExpandedRow={({ row }) => (
    <div data-testid={`packaging-rule-details-${row.original.ruleCode}`}>
      <table>
        <thead>
          <tr>
            <th>{t("pages.packagingRule.detailTable.levelSequence")}</th>
            <th>{t("pages.packagingRule.detailTable.packagingLevelCode")}</th>
            <th>{t("pages.packagingRule.detailTable.packagingLevelName")}</th>
            <th>{t("pages.packagingRule.detailTable.specCode")}</th>
            <th>{t("pages.packagingRule.detailTable.specName")}</th>
            <th>{t("pages.packagingRule.detailTable.standardQuantity")}</th>
            <th>{t("pages.packagingRule.detailTable.maxQuantity")}</th>
            <th>{t("pages.packagingRule.detailTable.packagingMethod")}</th>
          </tr>
        </thead>
        <tbody>
          {row.original.details.map((detail, index) => (
            <tr key={`${row.original.ruleCode}-${detail.id ?? index}`}>
              <td>{detail.levelSequence ?? "-"}</td>
              <td>{detail.packagingLevelCode}</td>
              <td>{detail.packagingLevelName || "-"}</td>
              <td>{detail.specCode}</td>
              <td>{detail.specName || "-"}</td>
              <td>{detail.standardQuantity}</td>
              <td>{detail.maxQuantity}</td>
              <td>{detail.packagingMethod}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
/>
```

- [x] **Step 4: Run focused verification** (PASS)

Run: `pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx -t "expands a packaging rule row to show detail records inline"`

Expected: PASS and the expanded detail table is rendered under `RULE_001`.

- [x] **Step 5: Run post-change slice validation** (expand test PASS; 5 other tests were pre-existing failures, unrelated to this change)

Run: `pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`

Expected: PASS for all packaging rule page tests, including create/edit/config/delete flows.

## Notes

- Keep the existing `Configure`, `Edit`, and `Delete` row actions unchanged.
- Do not change service contracts, query hooks, or record mapping because `Details` is already present in the query result model.
- Use the existing `packaging-kit` master-detail table as the local UI pattern reference.
- Limit the inline detail table to the screenshot fields: level sequence, packaging level code/name, spec code/name, standard quantity, max quantity, and packaging method.
- No commit step is included because repository policy requires an explicit user request before creating commits.
