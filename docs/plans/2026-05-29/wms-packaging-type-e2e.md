# WMS 包装类型 E2E 实施计划

> **修订说明（2026-07-13）：** 本文保留 2026-05 的历史设计与实施背景。六个包装模块现归属 MES，并统一使用 `getMesClient()`；正文中的 WMS 归属、`getWmsClient()`、`wms` Query Key 和旧 E2E 路径仅代表当时方案，不作为当前实现依据。WMS client、env、proxy、debug 配置和数据导入 module key 作为未来独立 WMS 集成基础设施继续保留。当前边界见 [ADR-0005](../../adr/0005-mes-packaging-wms-infrastructure-boundary.md)、[MES 数据接入模板](../../standards/mes-page-data-integration-template.md)、[接入计划](../2026-06-03/packaging-real-data-integration.md)和[验证报告](../../test-reports/2026-06-03/packaging-real-data-integration-report-1033.md)。

> **给执行型智能体：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐步执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 为 WMS 包装类型页面补齐稳定可运行的核心 CRUD 端到端测试，并建立后续可扩展到整个包装模块的 `wms/packaging` E2E 目录结构。

**架构：** 保持现有 Playwright + 本地 Vite + MSW 组合不变，但将包装类型 mock store 改成可重置，确保每个 E2E 用例都从一致初始数据开始。新用例按 `tests/wms/packaging/` 分层组织，页面交互下沉到专属 `PackagingTypePage` 页面对象，而不是过早引入全局 fixture 或通用 CRUD 基类。

**技术栈：** Playwright、TypeScript、React 19、Vite、MSW、Vitest、Testing Library、pnpm

---

## 文件结构

- 新建：`apps/web-e2e/helpers/mock-api.ts`
- 新建：`apps/web-e2e/pages/wms/packaging/packaging-type.page.ts`
- 新建：`apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts`
- 修改：`apps/web-e2e/fixtures/test.ts`
- 修改：`apps/web-e2e/README.md`
- 修改：`apps/web/src/mocks/data/packaging-type-store.ts`
- 修改：`apps/web/src/mocks/data/packaging-type-store.test.ts`
- 修改：`apps/web/src/mocks/handlers.ts`
- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-filter-form.tsx`
- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`
- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-table.tsx`

### 任务 1：让包装类型 Mock 支持可重置，保证 E2E 隔离

**文件：**
- 修改：`apps/web/src/mocks/data/packaging-type-store.ts`
- 修改：`apps/web/src/mocks/data/packaging-type-store.test.ts`
- 修改：`apps/web/src/mocks/handlers.ts`

- [ ] **步骤 1：先写失败的 mock store 重置测试**

将下面这个测试追加到 `apps/web/src/mocks/data/packaging-type-store.test.ts`：

```ts
it("resets the session data back to the initial packaging type records", () => {
  const created = store.create({
    TypeCode: "PKG_TYPE_RESET",
    TypeName: "待重置包装",
    IsRecyclable: true,
    Description: "reset me",
    Remark: "",
  });

  expect(created.Attach.TypeCode).toBe("PKG_TYPE_RESET");
  expect(
    store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
      TypeCode: "PKG_TYPE_RESET",
    }).Attach,
  ).toHaveLength(1);

  store.reset();

  expect(
    store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
      TypeCode: "PKG_TYPE_RESET",
    }).Attach,
  ).toHaveLength(0);
  expect(
    store.query({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
    }).Attach,
  ).toHaveLength(packagingTypeMockRecords.length);
});
```

- [ ] **步骤 2：运行测试，确认当前会失败**

运行：

```bash
pnpm --filter @repo/web test -- --run src/mocks/data/packaging-type-store.test.ts
```

预期：以 `store.reset is not a function` 或等价的 TypeScript/运行时报错失败。

- [ ] **步骤 3：实现可重置 store 状态，并增加测试用 reset handler**

更新 `apps/web/src/mocks/data/packaging-type-store.ts`，让 store 能恢复到初始记录：

```ts
function cloneRecords(records: PackagingTypeApiDto[]) {
  return records.map((record) => ({ ...record }));
}

export function createPackagingTypeMockStore(
  initialRecords: PackagingTypeApiDto[] = packagingTypeMockRecords,
) {
  const seedRecords = cloneRecords(initialRecords);
  let records = cloneRecords(seedRecords);
  let nextId = Math.max(...records.map((record) => record.Id), 0) + 1;

  function reset() {
    records = cloneRecords(seedRecords);
    nextId = Math.max(...records.map((record) => record.Id), 0) + 1;
  }

  return {
    query(query: Partial<PackagingTypeListQuery>) {
      // keep existing query logic unchanged
    },
    create(payload: CreatePackagingTypePayload) {
      // keep existing create logic unchanged
    },
    update(payload: UpdatePackagingTypePayload) {
      // keep existing update logic unchanged
    },
    remove(dto: Pick<PackagingTypeApiDto, "Id">) {
      // keep existing remove logic unchanged
    },
    removeBatch(dtos: Array<Pick<PackagingTypeApiDto, "Id">>) {
      // keep existing removeBatch logic unchanged
    },
    reset,
  };
}
```

更新 `apps/web/src/mocks/handlers.ts`，暴露一个仅供本地 mock 模式使用的重置接口：

```ts
http.post("/__mock__/reset", async ({ request }) => {
  const payload = (await request.json()) as { domain?: string } | null;

  if (!payload || payload.domain === "packaging-type") {
    packagingTypeStore.reset();
  }

  return HttpResponse.json({
    ok: true,
  });
}),
```

把这个 handler 放到顶层 mock 路由区域，方便 E2E 在每个用例开始前调用。

- [ ] **步骤 4：运行聚焦验证**

运行：

```bash
pnpm --filter @repo/web test -- --run src/mocks/data/packaging-type-store.test.ts
pnpm --filter @repo/web typecheck
```

预期：

- mock-store 测试 PASS
- `typecheck` exits `0`

- [ ] **步骤 5：提交可重置 mock 能力**

```bash
git add apps/web/src/mocks/data/packaging-type-store.ts apps/web/src/mocks/data/packaging-type-store.test.ts apps/web/src/mocks/handlers.ts
git commit -m "test(web): add resettable packaging type mocks"
```

### 任务 2：补齐包装模块 E2E helper 与页面对象骨架

**文件：**
- 新建：`apps/web-e2e/helpers/mock-api.ts`
- 新建：`apps/web-e2e/pages/wms/packaging/packaging-type.page.ts`
- 修改：`apps/web-e2e/fixtures/test.ts`

- [ ] **步骤 1：先写失败的 helper / 页面对象冒烟用例**

新建 `apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts`，先只放第一条冒烟测试：

```ts
import { expect } from "@playwright/test";
import { test } from "../../../fixtures/test";
import { appRoutes } from "../../../helpers/routes";

test("loads packaging type list from a reset mock session", async ({
  appShell,
  page,
  packagingTypePage,
}) => {
  await packagingTypePage.goto();

  await appShell.expectShellVisible();
  await expect(page).toHaveURL(appRoutes.packagingType);
  await expect(page.getByRole("heading", { name: "包装类型维护" })).toBeVisible();
  await packagingTypePage.expectRowVisible("PKG_TYPE_001");
});
```

这个步骤会故意引用一个还不存在的 fixture。

- [ ] **步骤 2：运行 E2E，用失败确认起点**

运行：

```bash
E2E_USE_API_MOCKS=true pnpm --filter @repo/web-e2e exec playwright test tests/wms/packaging/packaging-type.spec.ts --project=chromium
```

预期：因为 `packagingTypePage` fixture 未定义，或新 helper / 页面对象文件不存在而失败。

- [ ] **步骤 3：实现 mock 重置 helper、fixture 接线和初始页面对象**

新建 `apps/web-e2e/helpers/mock-api.ts`：

```ts
import type { APIRequestContext } from "@playwright/test";

export async function resetPackagingTypeMocks(request: APIRequestContext) {
  const response = await request.post("/__mock__/reset", {
    data: {
      domain: "packaging-type",
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to reset packaging type mocks: ${response.status()}`);
  }
}
```

新建 `apps/web-e2e/pages/wms/packaging/packaging-type.page.ts`：

```ts
import { expect, type Locator, type Page } from "@playwright/test";
import { appRoutes } from "../../../helpers/routes";

export class PackagingTypePage {
  readonly heading: Locator;
  readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "包装类型维护" });
    this.createButton = page.getByRole("button", { name: "新增类型" });
  }

  async goto() {
    await this.page.goto(appRoutes.packagingType);
    await expect(this.heading).toBeVisible();
  }

  async expectRowVisible(text: string) {
    await expect(this.page.getByRole("cell", { name: text })).toBeVisible();
  }
}
```

更新 `apps/web-e2e/fixtures/test.ts`：

```ts
import { resetPackagingTypeMocks } from "../helpers/mock-api";
import { PackagingTypePage } from "../pages/wms/packaging/packaging-type.page";

type Fixtures = {
  appShell: AppShellPage;
  settings: SettingsPage;
  packagingTypePage: PackagingTypePage;
};

page: async ({ page, request }, use) => {
  if (shouldUseApiMocks()) {
    await resetPackagingTypeMocks(request);
    await page.addInitScript((keys) => {
      window.localStorage.setItem(keys.tokenType, "Bearer");
      window.localStorage.setItem(keys.accessToken, "e2e-access-token");
      window.localStorage.setItem(keys.refreshToken, "e2e-refresh-token");
      window.localStorage.setItem(keys.expiresIn, "604800");
    }, storageKeys);
  }

  await use(page);
},
packagingTypePage: async ({ page }, use) => {
  await use(new PackagingTypePage(page));
},
```

- [ ] **步骤 4：运行冒烟用例，确认通过**

运行：

```bash
E2E_USE_API_MOCKS=true pnpm --filter @repo/web-e2e exec playwright test tests/wms/packaging/packaging-type.spec.ts --project=chromium --grep "loads packaging type list"
pnpm --filter @repo/web-e2e exec playwright test --list
```

预期：

- 冒烟用例 PASS
- the new packaging type spec appears in the Playwright test list

- [ ] **步骤 5：提交包装类型 E2E 骨架**

```bash
git add apps/web-e2e/helpers/mock-api.ts apps/web-e2e/pages/wms/packaging/packaging-type.page.ts apps/web-e2e/fixtures/test.ts apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts
git commit -m "test(web-e2e): add packaging type page object skeleton"
```

### 任务 3：覆盖筛选、新增、编辑流程

**文件：**
- 修改：`apps/web-e2e/pages/wms/packaging/packaging-type.page.ts`
- 修改：`apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts`
- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-filter-form.tsx`
- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`

- [ ] **步骤 1：补上失败中的筛选、新增、编辑 E2E 用例**

将下面这些测试追加到 `apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts`：

```ts
test("filters packaging types by type code and recyclable status", async ({
  packagingTypePage,
}) => {
  await packagingTypePage.goto();

  await packagingTypePage.filter({
    typeCode: "PKG_TYPE_003",
    isRecyclable: "false",
  });

  await packagingTypePage.expectRowVisible("PKG_TYPE_003");
  await packagingTypePage.expectRowHidden("PKG_TYPE_001");
});

test("creates a packaging type from the create sheet", async ({ packagingTypePage }) => {
  await packagingTypePage.goto();

  await packagingTypePage.openCreateSheet();
  await packagingTypePage.fillForm({
    typeCode: "PKG_TYPE_900",
    typeName: "周转箱",
    isRecyclable: true,
    description: "E2E created record",
  });
  await packagingTypePage.submitForm();

  await packagingTypePage.expectRowVisible("PKG_TYPE_900");
  await packagingTypePage.expectTextVisible("周转箱");
});

test("updates an existing packaging type", async ({ packagingTypePage }) => {
  await packagingTypePage.goto();

  await packagingTypePage.openEditSheet("PKG_TYPE_001");
  await packagingTypePage.fillForm({
    typeName: "加固纸箱",
    isRecyclable: false,
    description: "updated by e2e",
  });
  await packagingTypePage.submitForm();

  await packagingTypePage.expectTextVisible("加固纸箱");
  await packagingTypePage.expectTextVisible("updated by e2e");
});
```

- [ ] **步骤 2：运行这些新用例，确认当前会失败**

运行：

```bash
E2E_USE_API_MOCKS=true pnpm --filter @repo/web-e2e exec playwright test tests/wms/packaging/packaging-type.spec.ts --project=chromium --grep "filters packaging types|creates a packaging type|updates an existing packaging type"
```

预期：因为页面对象还没有 `filter()`、`openCreateSheet()`、`fillForm()`、`submitForm()`、`openEditSheet()` 等方法而失败；同时如果只靠 role 选择器还不稳定，也可能在这里暴露出来。

- [ ] **步骤 3：实现稳定页面交互，并只在必要处补最小 test id**

如果 role 选择器还不够稳定，就补最小稳定标识：

```tsx
// apps/web/src/features/mes/packaging/packaging-type/packaging-type-filter-form.tsx
<form data-testid="packaging-type-filter-form" ...>
```

```tsx
// apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx
<DialogContent data-testid="packaging-type-form-sheet" ...>
  <Input id="packaging-type-form-type-code" data-testid="packaging-type-form-type-code" ... />
  <Input id="packaging-type-form-type-name" data-testid="packaging-type-form-type-name" ... />
  <Textarea id="packaging-type-form-description" data-testid="packaging-type-form-description" ... />
  <Button data-testid="packaging-type-form-submit" type="submit" ...>
```

扩展 `apps/web-e2e/pages/wms/packaging/packaging-type.page.ts`：

```ts
type FilterValues = {
  typeCode?: string;
  typeName?: string;
  isRecyclable?: "all" | "true" | "false";
};

type FormValues = {
  typeCode?: string;
  typeName?: string;
  isRecyclable?: boolean;
  description?: string;
};

async filter(values: FilterValues) {
  if (values.typeCode !== undefined) {
    await this.page.getByLabel("类型编码").fill(values.typeCode);
  }

  if (values.typeName !== undefined) {
    await this.page.getByLabel("类型名称").fill(values.typeName);
  }

  if (values.isRecyclable !== undefined) {
    await this.page.getByRole("combobox", { name: "循环包装" }).selectOption(values.isRecyclable);
  }

  await this.page.getByRole("button", { name: "查询" }).click();
}

async openCreateSheet() {
  await this.createButton.click();
  await expect(this.page.getByTestId("packaging-type-form-sheet")).toBeVisible();
}

async openEditSheet(typeCode: string) {
  const row = this.page.getByRole("row").filter({ hasText: typeCode });
  await row.getByRole("button", { name: "编辑" }).click();
  await expect(this.page.getByTestId("packaging-type-form-sheet")).toBeVisible();
}

async fillForm(values: FormValues) {
  if (values.typeCode !== undefined) {
    await this.page.getByTestId("packaging-type-form-type-code").fill(values.typeCode);
  }

  if (values.typeName !== undefined) {
    await this.page.getByTestId("packaging-type-form-type-name").fill(values.typeName);
  }

  if (values.isRecyclable !== undefined) {
    const recyclableSwitch = this.page.getByRole("switch", { name: "循环包装" });
    const checked = (await recyclableSwitch.getAttribute("aria-checked")) === "true";

    if (checked !== values.isRecyclable) {
      await recyclableSwitch.click();
    }
  }

  if (values.description !== undefined) {
    await this.page.getByTestId("packaging-type-form-description").fill(values.description);
  }
}

async submitForm() {
  await this.page.getByTestId("packaging-type-form-submit").click();
}

async expectRowHidden(text: string) {
  await expect(this.page.getByRole("cell", { name: text })).toHaveCount(0);
}

async expectTextVisible(text: string) {
  await expect(this.page.getByText(text, { exact: true })).toBeVisible();
}
```

- [ ] **步骤 4：运行聚焦验证**

运行：

```bash
pnpm --filter @repo/web test -- --run src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx
pnpm --filter @repo/web typecheck
E2E_USE_API_MOCKS=true pnpm --filter @repo/web-e2e exec playwright test tests/wms/packaging/packaging-type.spec.ts --project=chromium --grep "filters packaging types|creates a packaging type|updates an existing packaging type"
```

预期：

- 现有 packaging-type 页面测试 PASS
- `typecheck` exits `0`
- 新增的 3 条 E2E 用例 PASS

- [ ] **步骤 5：提交筛选、新增、编辑覆盖**

```bash
git add apps/web-e2e/pages/wms/packaging/packaging-type.page.ts apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts apps/web/src/features/mes/packaging/packaging-type/packaging-type-filter-form.tsx apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx
git commit -m "test(web-e2e): cover packaging type filter create update"
```

### 任务 4：覆盖单删与批量删除流程

**文件：**
- 修改：`apps/web-e2e/pages/wms/packaging/packaging-type.page.ts`
- 修改：`apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts`
- 修改：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-table.tsx`

- [ ] **步骤 1：补上失败中的删除流程用例**

把下面这个测试追加到 `apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts`：

```ts
test("deletes packaging types from row action and batch action", async ({
  page,
  packagingTypePage,
}) => {
  await packagingTypePage.goto();

  page.once("dialog", (dialog) => dialog.accept());
  await packagingTypePage.deleteRow("PKG_TYPE_001");
  await packagingTypePage.expectRowHidden("PKG_TYPE_001");

  await packagingTypePage.selectRow("PKG_TYPE_002");
  await packagingTypePage.selectRow("PKG_TYPE_003");
  page.once("dialog", (dialog) => dialog.accept());
  await packagingTypePage.deleteSelected();

  await packagingTypePage.expectRowHidden("PKG_TYPE_002");
  await packagingTypePage.expectRowHidden("PKG_TYPE_003");
});
```

- [ ] **步骤 2：运行删除流程用例，确认当前会失败**

运行：

```bash
E2E_USE_API_MOCKS=true pnpm --filter @repo/web-e2e exec playwright test tests/wms/packaging/packaging-type.spec.ts --project=chromium --grep "deletes packaging types"
```

预期：因为页面对象仍然缺少删除相关 helper，且行级 checkbox / 按钮定位可能还不够稳定而失败。

- [ ] **步骤 3：实现行选择与删除 helper，并补稳定定位**

如有必要，在 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-table.tsx` 中补稳定行级标识：

```tsx
<Button
  data-testid={`packaging-type-edit-${row.original.typeCode}`}
  type="button"
  variant="link"
  className="px-0"
  onClick={() => onEdit(row.original)}
>
```

```tsx
<Button
  data-testid={`packaging-type-delete-${row.original.typeCode}`}
  type="button"
  variant="link"
  className="px-0 text-destructive"
  onClick={() => onDelete(row.original)}
>
```

同时稳定行勾选定位：

```tsx
<input
  aria-label={`选择 ${row.original.typeName}`}
  data-testid={`packaging-type-select-${row.original.typeCode}`}
  type="checkbox"
  checked={selectedIds.includes(row.original.id)}
  onChange={(event) => onToggleOne(row.original.id, event.target.checked)}
/>
```

扩展 `apps/web-e2e/pages/wms/packaging/packaging-type.page.ts`：

```ts
async deleteRow(typeCode: string) {
  await this.page.getByTestId(`packaging-type-delete-${typeCode}`).click();
}

async selectRow(typeCode: string) {
  await this.page.getByTestId(`packaging-type-select-${typeCode}`).check();
}

async deleteSelected() {
  await this.page.getByRole("button", { name: "批量删除" }).click();
}
```

- [ ] **步骤 4：运行包装类型全量验证**

运行：

```bash
pnpm --filter @repo/web test -- --run src/mocks/data/packaging-type-store.test.ts src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm --filter @repo/web-e2e exec playwright test --list
E2E_USE_API_MOCKS=true pnpm --filter @repo/web-e2e exec playwright test tests/wms/packaging/packaging-type.spec.ts --project=chromium
```

预期：

- 聚焦 web 测试 PASS
- `typecheck` exits `0`
- `lint` exits `0`
- packaging type spec appears in the test list
- 包装类型完整 E2E spec PASS，覆盖加载、筛选、新增、编辑、单删、批删

- [ ] **步骤 5：提交删除覆盖与最终通过结果**

```bash
git add apps/web-e2e/pages/wms/packaging/packaging-type.page.ts apps/web-e2e/tests/wms/packaging/packaging-type.spec.ts apps/web/src/features/mes/packaging/packaging-type/packaging-type-table.tsx
git commit -m "test(web-e2e): cover packaging type delete flows"
```

### 任务 5：补充新的包装模块 E2E 文档结构

**文件：**
- 修改：`apps/web-e2e/README.md`

- [ ] **步骤 1：补充 README 对新结构的说明**

更新 `apps/web-e2e/README.md` 的目录树和覆盖范围，让它反映新的业务域结构：

```md
pages/
  app-shell.page.ts
  settings.page.ts
  wms/
    packaging/
      packaging-type.page.ts
tests/
  api-mock.spec.ts
  navigation.spec.ts
  ui-state.spec.ts
  wms/
    packaging/
      packaging-type.spec.ts
```

在“当前覆盖范围”下新增一节：

```md
### `tests/wms/packaging/packaging-type.spec.ts`

覆盖：

- 包装类型页面加载
- 查询筛选
- 新增、编辑
- 单条删除、批量删除
```

这个任务放在最后，是为了让 README 记录最终已落地的结构，而不是提前写猜测版描述。

- [ ] **步骤 2：对 README 内容做一次快速核对**

运行：

```bash
pnpm --filter @repo/web-e2e exec playwright test --list
```

预期：测试清单里的 spec 路径与 README 中描述一致。

- [ ] **步骤 3：保存 README 更新**

除了上面的 README 改动，不需要额外代码。

- [ ] **步骤 4：检查文档 diff**

运行：

```bash
git diff -- apps/web-e2e/README.md
```

预期：只出现新的包装模块 E2E 结构和覆盖说明。

- [ ] **步骤 5：提交 README 更新**

```bash
git add apps/web-e2e/README.md
git commit -m "docs(web-e2e): document packaging e2e structure"
```

## 自检

- 规格覆盖：
  - 包装业务域目录结构：任务 2、任务 5
  - 可重复执行的 mock 重置能力：任务 1
  - 独立包装类型页面对象：任务 2、任务 3、任务 4
  - 核心 CRUD E2E 覆盖：任务 3、任务 4
  - 仅在 role 不足时补最小稳定选择器：任务 3、任务 4
  - `apps/web` 与 `apps/web-e2e` 的验证命令：任务 1、任务 3、任务 4、任务 5
- 占位项扫描：
  - 没有 `TODO`、`TBD` 或“以后再实现”之类的占位描述
  - 每个涉及改动的步骤都包含明确文件路径、代码片段和命令
- 类型与命名一致性：
  - `resetPackagingTypeMocks()`、`PackagingTypePage`、`filter()`、`fillForm()`、`deleteRow()`、`selectRow()`、`deleteSelected()` 的引用保持一致
  - `tests/wms/packaging/packaging-type.spec.ts` 与 `pages/wms/packaging/packaging-type.page.ts` 仍然是仅有的两个新增业务域入口
