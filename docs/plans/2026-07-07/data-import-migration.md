# 通用导入功能迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `rh-standard-product-platform` 中以 `simple-data-import` 为参考的通用导入能力迁移到 `standard-scaffold`，并在包装类型维护页完成首个真实接入。

**Architecture:** 迁移能力语义而不是照搬 Angular 代码。目标实现拆为 React 通用组件、导入契约类型、导入 API service、SignalR 实时进度 client 和 Packaging Type 页面接入层；远程请求继续沿用 `apps/web/src/lib/api` 的 client 边界。

**Tech Stack:** React 19、TypeScript、Vite、TanStack Query、shadcn/Radix UI、lucide-react、i18next、Vitest、Testing Library、`xlsx`、`@microsoft/signalr`

## Global Constraints

- 变更级别按 `L3` 处理：会新增运行时依赖 `@microsoft/signalr`，并引入实时连接、上传导入、模板配置等跨文件能力。
- 第一版真实业务接入固定为 `ModuleKey="MOM"`、`BusinessKey="PackagingType"`。
- 用户可见文案必须同步维护 `zh-CN` 和 `en-US`，代码中不得新增硬编码中文。
- 通用组件放在 `apps/web/src/components/data-import`，不要迁入 `packages/ui`。
- API 访问遵循 `contract -> service -> component/page`，不要把 HTTP 请求写进页面组件。
- `DataImportWithProgress` 不能使用 `postDataResult`，因为导入失败或部分失败时仍需要读取原始结果和错误数据。
- SignalR 实时进度作为最后一层增强实现；前置任务先完成无实时推送的导入闭环。
- 进入实现前必须创建任务分支或隔离 worktree；不得在 `main` / `master` 直接开发。

---

## Reference Summary

- 源工具文件：`rh-standard-product-platform/libs/rh-base/shared/component/simple-data-import/simple-data-import.utils.ts`
- 源组件文件：`rh-standard-product-platform/libs/rh-base/shared/component/simple-data-import/simple-data-import.component.ts`
- 源核心能力：
  - 模板元数据查询：`DataImportApi/GetMetadataDatas`
  - 模板元数据保存：`TemplateManagementApi/StoreMetaDatas?moduleKey=...&businessKey=...`
  - 模板下载：`DataImportApi/DownloadTemplateExcel`
  - 错误数据导出：`DataImportApi/ExportErrorExcelDatas`
  - 导入执行：`DataImportApi/DataImportWithProgress`
  - 任务取消：`ImportTask/CancelTask`
  - 实时进度：SignalR hub 默认 `realTimeProductionDataHub`，监听方法默认 `${ModuleKey}-${BusinessKey}`
- 目标项目现状：
  - `standard-scaffold` 是 React 19 + Vite + Turborepo 项目。
  - `apps/web` 已有 `xlsx`，已有 `components/data-export`。
  - API client 已有 `getAppClient`、`getMesClient`、`getWmsClient`、`getPrintClient`。
  - 目标项目目前没有 SignalR 依赖，需要新增 `@microsoft/signalr`。

## File Structure

- Create: `apps/web/src/components/data-import/data-import-contract.ts`
  - 负责定义导入模块公共类型、DTO、状态枚举和模块映射。
- Create: `apps/web/src/components/data-import/data-import-service.ts`
  - 负责导入相关后端接口封装和 module client 选择。
- Create: `apps/web/src/components/data-import/signalr-import-client.ts`
  - 负责 SignalR 建连、监听、JoinGroup、重连入组和释放。
- Create: `apps/web/src/components/data-import/file-download.ts`
  - 负责 base64 Excel 响应转 Blob 下载。
- Create: `apps/web/src/components/data-import/data-import-dialog.tsx`
  - 负责主导入弹窗、文件选择、进度、成功/失败/取消状态。
- Create: `apps/web/src/components/data-import/data-import-template-dialog.tsx`
  - 负责模板字段配置弹窗。
- Create: `apps/web/src/components/data-import/index.ts`
  - 显式导出公共组件和类型。
- Modify: `apps/web/package.json`
  - 增加 `@microsoft/signalr` 依赖。
- Modify: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
  - 增加导入按钮和导入成功后刷新列表。
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
  - 增加导入通用文案和包装类型导入动作文案。
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`
  - 增加对应英文文案。
- Test: `apps/web/src/components/data-import/*.test.ts(x)`
  - 覆盖 service、SignalR client、下载、主弹窗和模板弹窗。
- Test: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx`
  - 覆盖页面导入入口和导入成功刷新。

## Interfaces

### Public Component

```ts
export type DataImportDialogProps = {
  open: boolean;
  moduleKey: ImportModuleKey;
  businessKey: string;
  businessName: string;
  hubName?: string;
  listenMethod?: string;
  serverUrl?: string;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};
```

### Module Mapping

```ts
export type ImportModuleKey = "MOM" | "PlatformV2" | "WMS" | "IOT";

export const importModulePortMap: Record<ImportModuleKey, number> = {
  MOM: 8282,
  PlatformV2: 8288,
  WMS: 8283,
  IOT: 7281,
};
```

Client selection:

- `MOM` uses `getMesClient()`.
- `WMS` uses `getWmsClient()`.
- `PlatformV2` uses `getAppClient()`.
- `IOT` throws `Unsupported import module: IOT` in the first implementation because the target repo has no IOT API client yet.

### Import DTOs

```ts
export type CommonDataImportDto = {
  ModuleKey: string;
  BusinessKey: string;
  FileStreamString: string;
  RequestId?: string;
  CompanyCode?: string;
  FactoryCode?: string;
};

export type DataImportQueryDto = {
  ModuleKey: string;
  BusinessKey: string;
  CompanyCode?: string;
  FactoryCode?: string;
};

export type DownloadTemplateExcelQueryDto = {
  IsConfigureImportTemplateExcel: boolean;
  ModuleKey: string;
  BusinessKey: string;
  ErrorDatas: unknown[];
};

export type CancelRequestDto = {
  RequestId: string;
};
```

### Import Result Types

```ts
export type ImportUiStatus =
  | "idle"
  | "uploading"
  | "error"
  | "cancel"
  | "success";

export type DataImportRowData = {
  Success: boolean;
  Message: string;
  [key: string]: unknown;
};

export type DataImportWithProgressResult<T extends DataImportRowData> = {
  Success: boolean;
  Code: string | null;
  Message: string;
  Attach: {
    Status: "InImport" | "ImportFail" | "ImportSuccess" | "ImportClose" | string;
    ErrorDatas: T[];
  } | null;
  DataHeadFields: Array<{
    FieldName: string;
    FieldDescription: string;
  }>;
  SkipCount?: number;
  TotalCount?: number;
  Record?: number;
  SuccessQty?: number;
  ErrorQty?: number;
  TotalQty?: number;
};
```

### SignalR Event Type

```ts
export type ImportSignalRReceivedData = {
  Step: number;
  Progress: number;
  Message: string;
  DateTime: string;
  Status: "InImport" | "ImportFail" | "ImportSuccess" | "ImportClose" | string;
  RequestId: string;
};
```

## Task 1: Add Import Contracts

**Files:**
- Create: `apps/web/src/components/data-import/data-import-contract.ts`
- Create: `apps/web/src/components/data-import/index.ts`
- Test: `apps/web/src/components/data-import/data-import-contract.test.ts`

- [ ] Define the public DTOs and result types listed in the Interfaces section.
- [ ] Add `getImportListenMethod(moduleKey, businessKey, explicitListenMethod?)`.
- [ ] Add `getImportGroupName(moduleKey, businessKey)`.
- [ ] Add tests:
  - default listen method is `${moduleKey}-${businessKey}`;
  - explicit listen method wins;
  - group name is always `${moduleKey}-${businessKey}`;
  - `IOT` remains a typed module key even though service calls reject it.
- [ ] Export only public symbols from `index.ts`.

Verification:

```bash
rtk pnpm --filter @repo/web test -- data-import-contract.test.ts
```

Expected: PASS.

## Task 2: Add Import API Service

**Files:**
- Create: `apps/web/src/components/data-import/data-import-service.ts`
- Test: `apps/web/src/components/data-import/data-import-service.test.ts`

- [ ] Implement module client selection:
  - `MOM` -> `getMesClient()`
  - `WMS` -> `getWmsClient()`
  - `PlatformV2` -> `getAppClient()`
  - `IOT` -> throw `Unsupported import module: IOT`
- [ ] Implement:
  - `getMetadataDatas(dto, moduleKey)`
  - `storeMetaDatas(dto, moduleKey, businessKey)`
  - `downloadTemplateExcel(dto, moduleKey)`
  - `exportErrorExcelDatas(dto, moduleKey)`
  - `dataImportWithProgress(dto, moduleKey)`
  - `cancelImportTask(dto, moduleKey)`
- [ ] Use `postDataResult` for metadata, template download, error export, metadata save and cancel.
- [ ] Use raw `post<DataImportWithProgressResult<DataImportRowData>>()` for `dataImportWithProgress`.
- [ ] Preserve source paths exactly:
  - `/DataImportApi/GetMetadataDatas`
  - `/TemplateManagementApi/StoreMetaDatas?moduleKey=${moduleKey}&businessKey=${businessKey}`
  - `/DataImportApi/DownloadTemplateExcel`
  - `/DataImportApi/ExportErrorExcelDatas`
  - `/DataImportApi/DataImportWithProgress`
  - `/ImportTask/CancelTask`
- [ ] Add tests:
  - `MOM / PackagingType` uses MES transport and correct payload.
  - metadata save path contains query string.
  - `dataImportWithProgress` returns `Success=false` result without throwing.
  - `IOT` rejects with the unsupported error.

Verification:

```bash
rtk pnpm --filter @repo/web test -- data-import-service.test.ts
```

Expected: PASS.

## Task 3: Add File Download Helper

**Files:**
- Create: `apps/web/src/components/data-import/file-download.ts`
- Test: `apps/web/src/components/data-import/file-download.test.ts`

- [ ] Implement `downloadBase64ExcelFile(base64, filename)`.
- [ ] Decode base64 with `atob`, create `Uint8Array`, create an Excel Blob and trigger an anchor click.
- [ ] Ensure `.xlsx` is appended only when the filename does not already end with `.xlsx`.
- [ ] Revoke the object URL after click.
- [ ] Add tests for:
  - base64 decoding to Blob;
  - filename extension normalization;
  - object URL cleanup.

Verification:

```bash
rtk pnpm --filter @repo/web test -- file-download.test.ts
```

Expected: PASS.

## Task 4: Add i18n Resources

**Files:**
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`
- Test: `apps/web/src/i18n/config.test.ts`

- [ ] Add `dataImport` common keys for:
  - import dialog title;
  - instructions;
  - configure template;
  - download template;
  - select file;
  - uploading;
  - import success;
  - import failed;
  - import canceled;
  - reset upload;
  - continue upload;
  - export error data;
  - parsed total;
  - success count;
  - error count;
  - close;
  - enabled;
  - disabled;
  - required;
  - not required;
  - move up;
  - move down.
- [ ] Add `pages.packagingType.actions.import`.
- [ ] Update i18n tests only if resource registration or shape expectations require it.

Verification:

```bash
rtk pnpm --filter @repo/web test -- config.test.ts
```

Expected: PASS.

## Task 5: Add Template Configuration Dialog

**Files:**
- Create: `apps/web/src/components/data-import/data-import-template-dialog.tsx`
- Test: `apps/web/src/components/data-import/data-import-template-dialog.test.tsx`

- [ ] Build a Radix/shadcn `Dialog` using existing `Dialog`, `Button`, `Table` and available form controls.
- [ ] Render fields sorted by `SortId`.
- [ ] Show columns:
  - sequence;
  - `FieldDisplayName`;
  - enabled state;
  - required state.
- [ ] If `IsSystemRequired` is true, render read-only text instead of editable controls.
- [ ] When `IsUse` changes to false, set `IsRequired` to false before saving.
- [ ] Save the full metadata array through `storeMetaDatas`.
- [ ] Support row reordering with simple up/down icon buttons for v1. Do not introduce a drag-and-drop dependency unless a later implementation explicitly chooses it.
- [ ] On open, call `getMetadataDatas`.
- [ ] Add tests:
  - loads and sorts metadata;
  - toggling `IsUse=false` clears `IsRequired`;
  - system required rows are read-only;
  - reorder updates `SortId` and saves full list;
  - failed save restores the previous row value and shows error feedback.

Verification:

```bash
rtk pnpm --filter @repo/web test -- data-import-template-dialog.test.tsx
```

Expected: PASS.

## Task 6: Add Main Import Dialog Without SignalR

**Files:**
- Create: `apps/web/src/components/data-import/data-import-dialog.tsx`
- Test: `apps/web/src/components/data-import/data-import-dialog.test.tsx`

- [ ] Build the main dialog with:
  - template configuration action;
  - template download action;
  - hidden file input accepting `.xlsx,.xls`;
  - visible select-file button;
  - progress bar;
  - status summary;
  - retry/continue action;
  - export-error-data action when error rows exist.
- [ ] Read files as base64 and pass the base64 body string to `CommonDataImportDto.FileStreamString`.
- [ ] Generate `requestId` with `crypto.randomUUID()` when available; fall back to a timestamp/random string only when needed for test environments.
- [ ] Call `dataImportWithProgress` directly after file conversion; do not start SignalR in this task.
- [ ] Start local smooth progress while the import request is pending:
  - increase by 2 every 300ms while uploading;
  - cap local progress at 90;
  - set 100 on success.
- [ ] Map API result terminal states:
  - `ImportSuccess` -> success;
  - `ImportFail` -> error;
  - `ImportClose` -> cancel.
- [ ] After API result:
  - compute `ErrorQty` from `Record || 0`;
  - compute `SuccessQty` from `(TotalCount || TotalQty || 0) - ErrorQty`;
  - call `onImported` only when `SuccessQty > 0`;
  - if no error rows and `Success=true`, show success state;
  - if error rows exist, show error state and enable error export.
- [ ] On close or unmount, call `cancelImportTask` only when request exists and current status is not `idle`, `error`, `cancel` or `success`.
- [ ] Add tests:
  - idle state renders select file;
  - selecting file converts it to base64 and imports directly;
  - local progress advances while request is pending;
  - success result calls `onImported`;
  - partial failure enables error export;
  - close during upload cancels task;
  - close after success does not cancel task.

Verification:

```bash
rtk pnpm --filter @repo/web test -- data-import-dialog.test.tsx
```

Expected: PASS.

## Task 7: Connect Packaging Type Page

**Files:**
- Modify: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
- Test: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx`

- [ ] Add import state: `const [importDialogOpen, setImportDialogOpen] = useState(false);`
- [ ] Add outline import button next to export:
  - icon: `ArrowDownToLineIcon` or the closest lucide import/upload icon already available;
  - label: `t("pages.packagingType.actions.import")`;
  - click opens `DataImportDialog`.
- [ ] Render:

```tsx
<DataImportDialog
  open={importDialogOpen}
  moduleKey="MOM"
  businessKey="PackagingType"
  businessName={t("pages.packagingType.title")}
  onOpenChange={setImportDialogOpen}
  onImported={() => {
    setPageIndex(1);
    setSearchVersion((current) => current + 1);
  }}
/>
```

- [ ] Add tests:
  - import button renders on Packaging Type page;
  - clicking opens the import dialog;
  - successful import callback refreshes the list query;
  - failed import does not refresh the list query.

Verification:

```bash
rtk pnpm --filter @repo/web test -- packaging-type-page.test.tsx
```

Expected: PASS.

## Task 8: Add SignalR Real-Time Progress

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/components/data-import/signalr-import-client.ts`
- Modify: `apps/web/src/components/data-import/data-import-dialog.tsx`
- Test: `apps/web/src/components/data-import/signalr-import-client.test.ts`
- Test: `apps/web/src/components/data-import/data-import-dialog.test.tsx`

- [ ] Add `@microsoft/signalr` to `apps/web/package.json` dependencies.
- [ ] Run `pnpm install` from repo root so `pnpm-lock.yaml` records the dependency.
- [ ] Implement `signalr-import-client.ts` with `@microsoft/signalr` `HubConnectionBuilder`.
- [ ] Build URL as `${serverUrl}/${hubName}` when `serverUrl` is provided.
- [ ] Default `hubName` to `realTimeProductionDataHub`.
- [ ] Configure automatic reconnect.
- [ ] Expose:
  - `startImportProgressConnection(options)`
  - returned `joinGroup(groupName)`
  - returned `onProgress(listenMethod, handler)`
  - returned `dispose()`
- [ ] On reconnect, join the same group again.
- [ ] `dispose()` must remove the registered handler and stop the connection.
- [ ] Update `DataImportDialog` so file import flow becomes:
  - generate `requestId`;
  - start SignalR connection;
  - register `listenMethod`;
  - join `${moduleKey}-${businessKey}` group;
  - call `dataImportWithProgress` only after join succeeds.
- [ ] Update progress behavior:
  - keep the Task 6 local smooth progress as a visual floor;
  - store server progress separately;
  - display `max(serverPercent, localPercent)`;
  - ignore SignalR events whose `RequestId` does not match the current request;
  - map `ImportSuccess`, `ImportFail` and `ImportClose` from either SignalR event or API result.
- [ ] On close or unmount, dispose SignalR listeners in addition to the existing cancel behavior.
- [ ] Add SignalR client tests with mocked `@microsoft/signalr`:
  - starts connection with resolved URL;
  - registers listener method;
  - invokes `JoinGroup`;
  - rejoins after reconnect;
  - removes listener and stops on dispose.
- [ ] Extend main dialog tests:
  - selecting file starts SignalR, joins group and then imports;
  - progress events update progress only for matching request;
  - join failure shows error state and does not call import;
  - close during upload disposes SignalR and cancels task.

Verification:

```bash
rtk pnpm --filter @repo/web test -- signalr-import-client.test.ts data-import-dialog.test.tsx
```

Expected: PASS.

## Task 9: Final Verification

**Files:**
- No additional files.

- [ ] Run focused component and service tests:

```bash
rtk pnpm --filter @repo/web test -- data-import
```

Expected: PASS.

- [ ] Run full web tests:

```bash
rtk pnpm --filter @repo/web test
```

Expected: PASS.

- [ ] Run typecheck:

```bash
rtk pnpm --filter @repo/web typecheck
```

Expected: PASS.

- [ ] Run lint:

```bash
rtk pnpm --filter @repo/web lint
```

Expected: PASS.

- [ ] If implementation changes route-level behavior beyond the Packaging Type toolbar and dialog, evaluate `apps/web-e2e`; otherwise document why E2E was not run.

## Acceptance Criteria

- Packaging Type page has a visible import action.
- Import dialog supports template download, template configuration, Excel selection, real-time progress, cancellation, retry/continue and error-data export.
- `MOM / PackagingType` calls the expected MES backend endpoints.
- SignalR progress ignores events for other request IDs.
- Closing or unmounting during active import cancels the backend task.
- Successful import refreshes the Packaging Type list.
- All user-visible strings are localized in `zh-CN` and `en-US`.
- Focused tests, full web tests, typecheck and lint pass before any implementation is considered complete.

## Assumptions

- `MOM / PackagingType` is the correct first business binding.
- Backend SignalR hub remains `realTimeProductionDataHub`.
- Backend listen method and group name both default to `${ModuleKey}-${BusinessKey}`.
- `DownloadTemplateExcel` and `ExportErrorExcelDatas` return base64 Excel content in `Attach` when successful.
- `DataImportWithProgress.Record` represents error count, matching the source component behavior.
- First implementation does not add drag-and-drop sorting; up/down reorder buttons satisfy the template sorting requirement with less dependency risk.
- `IOT` support is intentionally blocked until the target repo has an IOT API client.
