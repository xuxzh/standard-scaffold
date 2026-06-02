# Packaging Kit Master-Detail Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render packaging kit query results as a master-detail table where each parent row can expand inline to show its `Children` records while preserving the existing child-view dialog.

**Architecture:** Reuse the existing `DataTable` expandable-row capability instead of introducing a second table implementation. Keep the list query, record mapping, and dialog state unchanged; scope the behavior change to the packaging kit table presentation and the page-level behavior tests.

**Tech Stack:** React 19, Vite, TypeScript, TanStack Table, Vitest, Testing Library, react-i18next

---

## File Map

- Modify: `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`
- Modify: `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-table.tsx`
- Keep unchanged: `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx`

### Task 1: Add Inline Child Expansion To Packaging Kit Table

**Files:**

- Modify: `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`
- Modify: `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-table.tsx`
- Test: `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("expands a packaging kit row to show child records inline", async () => {
  setMesTransportForTests(createStatefulPackagingKitTransport());

  render(<App initialEntries={["/packaging/packaging-kit"]} />);

  expect(await screen.findByText("Starter Kit")).toBeInTheDocument();
  expect(screen.queryByText("Accessory Material")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "展开 KIT001" }));

  const expandedRow = await screen.findByTestId(
    "packaging-kit-children-KIT001",
  );

  expect(
    within(expandedRow).getByText("Accessory Material"),
  ).toBeInTheDocument();
  expect(
    within(expandedRow).getByText("Packaging Material"),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx -t "expands a packaging kit row to show child records inline"`

Expected: FAIL because the packaging kit table does not yet pass `getRowCanExpand` and `renderExpandedRow` to `DataTable`, so no expand button or inline child table is rendered.

- [ ] **Step 3: Write minimal implementation**

```tsx
<DataTable
  columns={columns}
  data={data}
  getRowId={(row) => String(row.id)}
  getRowCanExpand={(row) => row.original.children.length > 0}
  renderExpandedRow={({ row }) => (
    <div data-testid={`packaging-kit-children-${row.original.kitCode}`}>
      <table>
        <thead>
          <tr>
            <th>{t("pages.packagingKit.form.childCode")}</th>
            <th>{t("pages.packagingKit.form.childName")}</th>
            <th>{t("pages.packagingKit.form.childQuantity")}</th>
            <th>{t("pages.packagingKit.form.childUnit")}</th>
          </tr>
        </thead>
        <tbody>
          {row.original.children.map((child) => (
            <tr key={child.code}>
              <td>{child.code}</td>
              <td>{child.name}</td>
              <td>{child.quantity}</td>
              <td>{child.unit || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
/>
```

- [ ] **Step 4: Run focused verification**

Run: `pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx -t "expands a packaging kit row to show child records inline"`

Expected: PASS and the expanded child table is rendered under `KIT001`.

- [ ] **Step 5: Run post-change slice validation**

Run: `pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`

Expected: PASS for all packaging kit page tests, including the existing dialog-based child view test.

## Notes

- Keep the existing `查看子件` / `View Children` action and dialog unchanged.
- Do not change service contracts or record mapping because `Children` is already present in the query result model.
- No commit step is included here because repository policy requires an explicit user request before creating commits.
