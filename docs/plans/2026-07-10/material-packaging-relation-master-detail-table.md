# 物料包装关系主子表实施计划

> **面向 Agent 执行者：** REQUIRED SUB-SKILL：使用 `executing-plans` 在当前会话逐任务执行本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 将物料包装关系列表由拍平明细行改为默认收起的可展开主子表，同时保持现有查询、分页、选择、CRUD、导入和导出行为。

**实现方式：** 表格直接消费 `MaterialPackagingRelationRecord[]`，主表负责关系级字段和操作，通过通用 `DataTable` 的 `getRowCanExpand` 与 `renderExpandedRow` 渲染只读明细子表。先用独立组件测试锁定主子表行为，再移除页面与 contract 中的拍平模型。

**技术栈：** React 19、TypeScript、TanStack Table、Vitest、Testing Library、react-i18next、现有 `DataTable`。

## 全局约束

- 任务级别为 `L2`，实现必须位于 `.worktrees/codex-material-packaging-master-detail`。
- 不修改接口、请求参数、React Query 缓存、CRUD、导入或导出契约。
- 用户可见文案必须同步提供中文和英文，代码中不得硬编码中文表头。
- 不修改通用 `DataTable` 或套包信息维护页面。
- 使用 TDD：每个生产行为必须先有失败测试并观察到预期失败。
- 已知基线为定向 34 通过、2 失败、1 个未处理错误；最终不得新增失败。

---

## 文件清单

- 新建：
  - `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.test.tsx`：主子表组件行为测试。
- 修改：
  - `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.tsx`：关系级主表与明细子表。
  - `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx`：直接传递主记录并调整事件参数。
  - `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract.ts`：删除拍平专用模型和函数。
  - `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx`：锁定页面主记录操作行为，保持既有基线失败可识别。
  - `apps/web/src/i18n/resources/zh-CN/common.ts`：新增 `detailCount: "明细数量"`。
  - `apps/web/src/i18n/resources/en-US/common.ts`：新增 `detailCount: "Detail Count"`。

### 任务 1：用组件测试定义主子表行为

**文件：**

- 新建：`apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.test.tsx`
- 修改：`apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.tsx`
- 修改：`apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改：`apps/web/src/i18n/resources/en-US/common.ts`

**接口：**

- 消费：`MaterialPackagingRelationRecord`、现有 `DataTable` 展开 API。
- 产出：`MaterialPackagingRelationTable` 的 `data` 为 `MaterialPackagingRelationRecord[]`；`onEdit`、`onDelete` 接收 `MaterialPackagingRelationRecord`。

- [ ] **步骤 1：新增失败测试，断言主表只显示关系级数据和明细数量**

创建表格测试，构造一条含两条 `details` 的记录和一条空明细记录，核心断言如下：

```tsx
const detailA: MaterialPackagingRelationDetail = {
  levelSequence: 1,
  packagingLevelCode: "LEVEL-001",
  packagingLevelName: "Level 1",
  specCode: "SPEC-001",
  specName: "Spec 1",
  quantity: 0,
  unit: "",
  packagingTypeName: "Box",
  boxLabelPrintTemplate: "",
  packingListPrintTemplate: "LIST-001",
};
const detailB: MaterialPackagingRelationDetail = {
  ...detailA,
  levelSequence: 2,
  packagingLevelCode: "LEVEL-002",
  quantity: 2,
};

function createRecord(
  overrides: Pick<MaterialPackagingRelationRecord, "id" | "materialCode" | "details">,
): MaterialPackagingRelationRecord {
  return {
    materialName: `Material ${overrides.id}`,
    packagingRuleCode: `RULE-${overrides.id}`,
    packagingRuleName: `Rule ${overrides.id}`,
    remark: "",
    rawDto: {
      Id: overrides.id,
      MaterialCode: overrides.materialCode,
      MaterialName: `Material ${overrides.id}`,
      PackagingRuleCode: `RULE-${overrides.id}`,
      PackagingRuleName: `Rule ${overrides.id}`,
      Details: [],
    },
    ...overrides,
  };
}

const records: MaterialPackagingRelationRecord[] = [
  createRecord({ id: 1, materialCode: "MAT-001", details: [detailA, detailB] }),
  createRecord({ id: 2, materialCode: "MAT-002", details: [] }),
];

renderTable({ data: records });

expect(screen.getAllByTestId(/material-packaging-relation-select-/)).toHaveLength(2);
expect(screen.getByText("明细数量")).toBeInTheDocument();
expect(screen.getByText("2")).toBeInTheDocument();
expect(screen.getByText("0")).toBeInTheDocument();
expect(screen.queryByText(detailA.packagingLevelCode)).not.toBeInTheDocument();
```

- [ ] **步骤 2：运行测试并确认因现有拍平输入模型或缺少文案而失败**

从 `apps/web` 执行：

```bash
pnpm exec vitest run src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.test.tsx
```

预期：`FAIL`，失败原因是组件仍要求 `MaterialPackagingRelationTableRow[]`，或主表中不存在“明细数量”。

- [ ] **步骤 3：最小修改表格 props、主表列和 i18n**

将表格输入和回调改为：

```ts
type MaterialPackagingRelationTableProps = {
  data: MaterialPackagingRelationRecord[];
  loading?: boolean;
  pageIndex: number;
  pageSize: number;
  selectedRelationIds: number[];
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (relationId: number, checked: boolean) => void;
  onEdit: (record: MaterialPackagingRelationRecord) => void;
  onDelete: (record: MaterialPackagingRelationRecord) => void;
};
```

主表列直接读取 `row.original`，增加：

```ts
{
  id: "detailCount",
  header: t("pages.materialPackagingRelation.table.detailCount"),
  cell: ({ row }) => row.original.details.length,
}
```

同步新增：

```ts
// zh-CN
detailCount: "明细数量",

// en-US
detailCount: "Detail Count",
```

- [ ] **步骤 4：运行测试，确认主表关系级行为通过**

执行与步骤 2 相同的命令。预期：新增主表测试通过；若展开测试尚未加入，不提前实现子表。

- [ ] **步骤 5：新增失败测试，断言明细展开、空值与数量零展示**

追加测试：

```tsx
const expandButton = screen.getByRole("button", { name: /展开 MAT-001/ });
fireEvent.click(expandButton);

const details = screen.getByTestId("material-packaging-relation-details-1");
expect(within(details).getByText(detailA.packagingLevelCode)).toBeInTheDocument();
expect(within(details).getByText("0")).toBeInTheDocument();
expect(within(details).getAllByText("-").length).toBeGreaterThan(0);
expect(screen.queryByRole("button", { name: /展开 MAT-002/ })).not.toBeInTheDocument();
```

再次执行定向测试，预期：`FAIL`，因为尚未配置可展开行和展开内容。

- [ ] **步骤 6：实现最小明细子表**

为 `DataTable` 增加：

```tsx
getRowCanExpand={(row) => row.original.details.length > 0}
renderExpandedRow={({ row }) => (
  <div
    className="overflow-hidden rounded-md border bg-background"
    data-testid={`material-packaging-relation-details-${row.original.id}`}
  >
    <div className="max-w-full overflow-x-auto">
      <table className="w-max min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.levelSequence")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.packagingLevelCode")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.packagingLevelName")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.specCode")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.specName")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.quantity")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.unit")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.packagingTypeName")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.boxLabelPrintTemplate")}</th>
            <th className="px-4 py-3">{t("pages.materialPackagingRelation.table.packingListPrintTemplate")}</th>
          </tr>
        </thead>
        <tbody>
          {row.original.details.map((detail, detailIndex) => (
            <tr key={`${detail.packagingLevelCode}:${detailIndex}`} className="border-t">
              <td className="px-4 py-3">{detail.levelSequence ?? "-"}</td>
              <td className="px-4 py-3">{detail.packagingLevelCode || "-"}</td>
              <td className="px-4 py-3">{detail.packagingLevelName || "-"}</td>
              <td className="px-4 py-3">{detail.specCode || "-"}</td>
              <td className="px-4 py-3">{detail.specName || "-"}</td>
              <td className="px-4 py-3">{detail.quantity}</td>
              <td className="px-4 py-3">{detail.unit || "-"}</td>
              <td className="px-4 py-3">{detail.packagingTypeName || "-"}</td>
              <td className="px-4 py-3">{detail.boxLabelPrintTemplate || "-"}</td>
              <td className="px-4 py-3">{detail.packingListPrintTemplate || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

子表严格按 spec 的 10 列和 `row.original.details` 原顺序渲染。文本使用 `value || "-"`，`levelSequence` 使用 `?? "-"`，`quantity` 直接渲染数值。

- [ ] **步骤 7：新增并通过选择、编辑、删除回调测试**

测试单选、全选、编辑和删除：

```tsx
fireEvent.click(screen.getByTestId("material-packaging-relation-select-1"));
expect(onToggleOne).toHaveBeenCalledWith(1, true);

fireEvent.click(screen.getByTestId("material-packaging-relation-edit-1"));
expect(onEdit).toHaveBeenCalledWith(records[0]);

fireEvent.click(screen.getByTestId("material-packaging-relation-delete-1"));
expect(onDelete).toHaveBeenCalledWith(records[0]);
```

先运行并观察旧实现参数导致的失败，再调整事件回调为主记录并运行至通过。

- [ ] **步骤 8：完成组件切片检查点但暂不提交**

表格 props 已由拍平行切换为主记录，而页面消费者将在任务 2 同步调整。此时只保留定向组件测试通过的检查点，不创建一个无法通过仓库类型检查的中间提交。

### 任务 2：切换页面到主记录模型并删除拍平类型

**文件：**

- 修改：`apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx`
- 修改：`apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx`
- 修改：`apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract.ts`

**接口：**

- 消费：任务 1 的 `MaterialPackagingRelationTable` 主记录 props。
- 产出：页面不再引用 `MaterialPackagingRelationTableRow` 或 `flattenMaterialPackagingRelationRows`。

- [ ] **步骤 1：新增失败页面测试，断言多明细关系只有一个关系级操作入口**

将测试数据设置为一条含两条明细的主记录，并断言：

```tsx
expect(
  await screen.findAllByTestId("material-packaging-relation-delete-1"),
).toHaveLength(1);
expect(screen.getAllByTestId("material-packaging-relation-select-1")).toHaveLength(1);
```

运行：

```bash
pnpm --dir apps/web exec vitest run src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx -t "renders one relation-level action for multiple details"
```

预期：`FAIL`，页面仍将记录拍平后传入已改为接收主记录的表格，或类型检查失败。

- [ ] **步骤 2：最小修改页面数据和事件参数**

删除：

```ts
const tableRows = useMemo(
  () => flattenMaterialPackagingRelationRows(records),
  [records],
);
```

直接传递：

```tsx
data={listQuery.isError ? [] : records}
```

调整删除函数：

```ts
async function handleDelete(record: MaterialPackagingRelationRecord) {
  setDeleteTarget(record);
  setConfirmOpen(true);
}
```

编辑回调直接接收并设置 `MaterialPackagingRelationRecord`。

- [ ] **步骤 3：运行新增页面测试并确认通过**

执行步骤 1 的命令。预期：该测试通过。

- [ ] **步骤 4：删除 contract 拍平专用类型与函数**

删除 `MaterialPackagingRelationTableRow` 和 `flattenMaterialPackagingRelationRows`，然后执行：

```bash
rg -n "MaterialPackagingRelationTableRow|flattenMaterialPackagingRelationRows" apps/web/src
```

预期：无输出，退出码为 `1`。

- [ ] **步骤 5：运行类型检查和相关测试**

```bash
pnpm --filter @repo/web typecheck
pnpm --dir apps/web exec vitest run src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.test.tsx
pnpm --dir apps/web exec vitest run src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx
```

预期：类型检查和表格测试通过；页面测试维持已知的 2 个 toast 失败，不出现新失败。

- [ ] **步骤 6：提交完整主子表切片**

```bash
git add apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.tsx \
  apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.test.tsx \
  apps/web/src/i18n/resources/zh-CN/common.ts \
  apps/web/src/i18n/resources/en-US/common.ts \
git add apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx \
  apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx \
  apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract.ts
git commit -m "feat(packaging): show relation details in expandable table"
```

### 任务 3：最终回归验证与差异审查

**文件：**

- 检查：本计划列出的全部代码和测试文件。

- [ ] **步骤 1：运行格式与静态验证**

```bash
git diff --check HEAD~1..HEAD
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

预期：全部退出码为 `0`。

- [ ] **步骤 2：运行功能定向测试**

```bash
cd apps/web
pnpm exec vitest run \
  src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.test.tsx \
  src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx \
  src/features/mes/packaging/material-packaging-relation/material-packaging-relation-service.test.ts \
  src/components/data-table/data-table.test.tsx
```

预期：新增表格测试、service 和 `DataTable` 测试全部通过；页面测试仅保留基线的 2 个 toast 失败和 1 个关联未处理错误。

- [ ] **步骤 3：运行全量 Web 测试并比较基线**

```bash
pnpm --filter @repo/web test
```

预期：不得差于基线 `542 passed / 23 failed / 8 errors`；若计数变化，逐项确认没有本次新增失败。

- [ ] **步骤 4：审查最终 diff 与状态**

```bash
git status --short
git diff origin/main...HEAD --stat
git diff origin/main...HEAD -- apps/web/src/features/mes/packaging/material-packaging-relation apps/web/src/i18n/resources
```

预期：仅包含 spec、plan、物料包装关系表格/页面/contract/测试和两份 i18n 资源的必要改动，不包含生成文件、凭据或无关格式化。
