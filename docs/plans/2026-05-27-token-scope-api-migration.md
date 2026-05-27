# Token 上下文接口迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 WMS 接口上下文从业务 payload 中的 `CompanyCode`/`FactoryCode` 迁移到统一 bearer token。

**Architecture:** 在 `lib/auth` 增加最小 token 读取边界，由 `wms-client` 把 token provider 传给已有 fetch transport。业务模块只保留真正的业务字段，响应 DTO 里的租户字段作为过渡兼容字段保留为可选。

**Tech Stack:** React 19、Vite、TypeScript、Vitest、Testing Library、pnpm workspace。

---

### Task 1: WMS Client Token 注入

**Files:**

- Create: `apps/web/src/lib/auth/token-store.ts`
- Modify: `apps/web/src/lib/api/wms-client.ts`
- Modify: `apps/web/src/lib/api/wms-client.test.ts`

- [ ] **Step 1: Write the failing test**

在 `apps/web/src/lib/api/wms-client.test.ts` 新增测试：设置 `VITE_WMS_API_BASE_URL`，写入 access token，调用 `getWmsClient().postDataResult()`，断言 fetch headers 包含 `Authorization: Bearer token-1`。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/web test apps/web/src/lib/api/wms-client.test.ts`

Expected: FAIL，原因是 `wms-client` 尚未接入 token provider。

- [ ] **Step 3: Write minimal implementation**

新增 `token-store.ts`，提供 `getAccessToken()`、`setAccessTokenForTests()`、`clearAccessTokenForTests()`。在 `wms-client.ts` 的真实 base URL transport 中传入 `getToken: getAccessToken`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/web test apps/web/src/lib/api/wms-client.test.ts`

Expected: PASS。

### Task 2: 通用查询类型移除租户字段

**Files:**

- Modify: `apps/web/src/lib/api/http-client.ts`

- [ ] **Step 1: Remove tenant query fields**

从 `ApiQueryParams` 移除 `CompanyCode?: string` 和 `FactoryCode?: string`，仅保留分页字段。

- [ ] **Step 2: Run TypeScript check**

Run: `pnpm --filter @repo/web typecheck`

Expected: 如果有业务代码仍传租户字段，类型检查失败并定位剩余调用点；清理后 PASS。

### Task 3: 包装类型删除 payload 清理

**Files:**

- Modify: `apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.test.tsx`
- Modify: `apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.tsx`
- Modify: `apps/web/src/features/wms/packaging/packaging-type/packaging-contract.ts`

- [ ] **Step 1: Write the failing test**

更新页面删除测试，使测试 fixture 即使包含响应兼容字段，也断言删除 mutation 收到的 DTO 不包含 `CompanyCode` 和 `FactoryCode`。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/web test apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.test.tsx`

Expected: FAIL，原因是页面当前 `mapRecordToApiDto()` 会回填租户字段。

- [ ] **Step 3: Write minimal implementation**

从 `PackagingTypeRecord` 移除 `companyCode`、`factoryCode`，`mapPackagingTypeDtoToRecord()` 不再映射这两个字段，页面 `mapRecordToApiDto()` 不再输出这两个字段。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/web test apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.test.tsx`

Expected: PASS。

### Task 4: 文档同步

**Files:**

- Modify: `docs/api/common-api-spec.md`
- Modify: `docs/business/wms/packaging/packaging-type/api.md`

- [ ] **Step 1: Update common API contract**

说明 `Authorization` 同时承载用户身份与公司/工厂上下文，业务请求体不传 `CompanyCode`、`FactoryCode`。

- [ ] **Step 2: Update packaging API examples**

删除新增、删除、批删请求示例中的 `CompanyCode`、`FactoryCode`，保留响应字段兼容说明。

### Task 5: Final Verification

**Files:**

- Verify all modified web code and docs.

- [ ] **Step 1: Run focused tests**

Run: `pnpm --filter @repo/web test`

Expected: PASS。

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @repo/web typecheck`

Expected: PASS。
