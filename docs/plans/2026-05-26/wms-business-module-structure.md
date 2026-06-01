# WMS Business Module Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a repeatable structure for WMS business modules and add the first packaging module scaffold.

**Architecture:** Keep business modules inside `apps/web/src/features/wms/<module>` and keep route files thin. Use `contract -> service/query -> page/component` boundaries and keep shared WMS helpers in `features/wms/shared` only after reuse is proven.

**Tech Stack:** React 19, TanStack Router, React Query, Vitest, Testing Library, pnpm workspace.

---

### Task 1: Document The Structure

**Files:**
- Create: `docs/standards/web-business-module-guidelines.md`
- Modify: `docs/standards/README.md`

- [ ] Add a Chinese standards document describing `features/wms/<module>` layout, route boundaries, shared-code promotion rules, and verification expectations.
- [ ] Link the new standards document from `docs/standards/README.md`.

### Task 2: Add Packaging Route Test

**Files:**
- Modify: `apps/web/src/app.test.tsx`

- [ ] Add a failing routing test for `/wms/packaging`.
- [ ] Assert the page heading, admin shell, sidebar link, and header copy are visible.

### Task 3: Implement Packaging Scaffold

**Files:**
- Create: `apps/web/src/features/wms/packaging/packaging-contract.ts`
- Create: `apps/web/src/features/wms/packaging/packaging-page.tsx`
- Create: `apps/web/src/routes/wms.packaging.tsx`
- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`

- [ ] Add stable packaging module types and an initial module summary.
- [ ] Render a minimal packaging page through `AdminLayout`.
- [ ] Add sidebar navigation under the existing navigation group.
- [ ] Add Chinese and English shell copy for navigation and page header.

### Task 4: Verify

**Commands:**
- `pnpm --filter @repo/web test -- app.test.tsx`
- `pnpm --filter @repo/web typecheck`

- [ ] Confirm both commands pass.
