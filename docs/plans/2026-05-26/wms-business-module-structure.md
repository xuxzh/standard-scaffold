# WMS Business Module Structure Implementation Plan

> **修订说明（2026-07-13）：** 本文保留 2026-05 的历史设计与实施背景。六个包装模块现归属 MES，并统一使用 `getMesClient()`；正文中的 WMS 归属、`getWmsClient()`、`wms` Query Key 和旧 E2E 路径仅代表当时方案，不作为当前实现依据。WMS client、env、proxy、debug 配置和数据导入 module key 作为未来独立 WMS 集成基础设施继续保留。当前边界见 [ADR-0005](../../adr/0005-mes-packaging-wms-infrastructure-boundary.md)、[MES 数据接入模板](../../standards/mes-page-data-integration-template.md)、[接入计划](../2026-06-03/packaging-real-data-integration.md)和[验证报告](../../test-reports/2026-06-03/packaging-real-data-integration-report-1033.md)。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a repeatable structure for WMS business modules and add the first packaging module scaffold.

**Architecture:** Keep business modules inside `apps/web/src/features/mes/<module>` and keep route files thin. Use `contract -> service/query -> page/component` boundaries and keep shared WMS helpers in `features/mes/shared` only after reuse is proven.

**Tech Stack:** React 19, TanStack Router, React Query, Vitest, Testing Library, pnpm workspace.

---

### Task 1: Document The Structure

**Files:**
- Create: `docs/standards/web-business-module-guidelines.md`
- Modify: `docs/standards/README.md`

- [ ] Add a Chinese standards document describing `features/mes/<module>` layout, route boundaries, shared-code promotion rules, and verification expectations.
- [ ] Link the new standards document from `docs/standards/README.md`.

### Task 2: Add Packaging Route Test

**Files:**
- Modify: `apps/web/src/app.test.tsx`

- [ ] Add a failing routing test for `/wms/packaging`.
- [ ] Assert the page heading, admin shell, sidebar link, and header copy are visible.

### Task 3: Implement Packaging Scaffold

**Files:**
- Create: `apps/web/src/features/mes/packaging/packaging-contract.ts`
- Create: `apps/web/src/features/mes/packaging/packaging-page.tsx`
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
