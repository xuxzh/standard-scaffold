# Data Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable Web data table foundation that supports basic display states and master-detail row expansion.

**Architecture:** Keep low-level table markup in `apps/web/src/components/ui/table.tsx` as the shadcn primitive. Add a light generic `DataTable` wrapper in `apps/web/src/components/data-table/data-table.tsx` that uses TanStack Table for row and column rendering. Leave sorting, filtering, and pagination out of the first UI surface, but keep TanStack as the internal foundation for later controlled state expansion.

**Tech Stack:** React 19, TypeScript, shadcn/ui, Tailwind CSS v4, `@tanstack/react-table`, Vitest, Testing Library.

---

### Task 1: Lock In DataTable Behavior With Tests

**Files:**
- Create: `apps/web/src/components/data-table/data-table.test.tsx`

- [ ] **Step 1: Write failing tests**

Create tests that render a typed table with two columns. Cover header/cell rendering, empty state, loading state, and a master-detail expanded row.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/web test -- src/components/data-table/data-table.test.tsx`

Expected: FAIL because `@/components/data-table/data-table` does not exist yet.

### Task 2: Add Table Dependencies And Primitives

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/components/ui/table.tsx`

- [ ] **Step 1: Add `@tanstack/react-table`**

Run: `pnpm --filter @repo/web add @tanstack/react-table`

- [ ] **Step 2: Add the shadcn table primitive**

Create `apps/web/src/components/ui/table.tsx` with `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, and `TableCaption`, following the local shadcn component style.

### Task 3: Implement The DataTable Wrapper

**Files:**
- Create: `apps/web/src/components/data-table/data-table.tsx`
- Create: `apps/web/src/components/data-table/index.ts`

- [ ] **Step 1: Implement generic props**

`DataTable` accepts `columns`, `data`, optional `getRowId`, `loading`, `loadingLabel`, `emptyLabel`, `getRowCanExpand`, `renderExpandedRow`, and `expanded`.

- [ ] **Step 2: Render with TanStack Table**

Use `useReactTable`, `getCoreRowModel`, `getExpandedRowModel`, `flexRender`, and controlled `expanded` state.

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm --filter @repo/web test -- src/components/data-table/data-table.test.tsx`

Expected: PASS.

### Task 4: Validate The Web Package

**Files:**
- No new files.

- [ ] **Step 1: Run targeted tests**

Run: `pnpm --filter @repo/web test`

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @repo/web typecheck`

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @repo/web lint`

