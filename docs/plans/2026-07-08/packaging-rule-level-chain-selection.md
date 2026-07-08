# 新增包装规则层级链路选择 Implementation Plan

> **面向 Agent 执行者：** 优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**任务级别：** L2。该变更涉及新增包装规则流程、远程接口、弹窗交互、表单明细数据流和测试回归；进入实现前必须使用正式计划。

**目标：** 新增包装规则时，点击“添加层级明细”先选择一个包装层级，再通过 `/PackagingLevelApi/GetLevelChain` 获取该层级向上的完整链路，并转换成当前层级明细 table 的表单模型展示；已有 table 行编辑继续使用原明细编辑弹窗。

**实现方式：** 复用现有 `PackagingRuleFormDialog` 作为主表单和 `details` field array 的唯一状态 owner。新增一个单选包装层级弹窗，只负责选择 `InnerLevelCode` 并触发链路加载；链路 DTO 在 contract/service 边界归一化，再由表单组件转换为 `PackagingRuleDetailFormValues[]`。原明细编辑弹窗保留给 table 行编辑，不再作为“添加层级明细”的第一步入口。

**技术栈：** React 19、TypeScript、TanStack Query/Mutation、React Hook Form、Zod、shadcn/Radix Dialog、Vitest、Testing Library、i18next。

---

## 当前判断与假设

- 当前按钮位于 `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx`，现状是 `openCreateDetailDialog()` 直接打开原明细编辑弹窗。
- 计划默认只改变新增流程：点击“添加层级明细”打开“选择包装层级”弹窗；点击 table 行“编辑”仍打开原来的明细编辑弹窗。
- 计划默认链路接口返回的 `Attach` 顺序就是 table 顺序；如果后端不能保证顺序，前端按 `LevelSequence` 升序排序后写入 table。
- 计划默认选择层级后生成的每一行只预填 `packagingLevelCode`，其它必填字段保持空值，由用户逐行点击“编辑”补充规格、数量和包装方式。
- 计划默认新拉取的链路会替换当前新增表单中的 `details`，避免重复叠加和顺序混乱；如果产品期望追加，需要在实现前调整计划。
- 不在代码或文档中保存 curl 示例里的 `Authorization` token。

## 文件清单

修改：

- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-contract.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-service.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-queries.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-service.test.ts`
- `apps/web/src/i18n/resources/zh-CN/common.ts`
- `apps/web/src/i18n/resources/en-US/common.ts`

按需要新建：

- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-level-dialog.tsx`

## 非目标

- 不改包装规则保存接口 payload 结构。
- 不改已有 table 行编辑弹窗的字段、校验和提交流程。
- 不新增包装层级维护能力。
- 不把包装层级组件迁移到 `packages/ui`。
- 不引入新的远程鉴权处理。

## 切片 1：补齐层级链路接口契约和 service

- [ ] 在 `packaging-rule-contract.ts` 增加链路接口 DTO 和表单转换辅助类型。
  - 新增 `PackagingRuleLevelChainApiDto`，字段覆盖 `Id`、`LevelSequence`、`LevelCode`、`LevelName`、`ParentLevelCode`、`ParentLevelName`、`Description`。
  - 新增 `PackagingRuleLevelChainInput`，字段为 `innerLevelCode: string`。
  - 新增 `mapPackagingRuleLevelChainDtoToOptionLike(dto)` 或同等 helper，用于保留 `levelCode`、`levelName`、`levelSequence`。
- [ ] 在 `packaging-rule-service.ts` 新增常量 `PACKAGING_RULE_LEVEL_CHAIN_PATH = "/PackagingLevelApi/GetLevelChain"`。
- [ ] 新增 `getPackagingRuleLevelChain(input, options)`，POST body 为 `{ InnerLevelCode: input.innerLevelCode }`。
- [ ] 在 `packaging-rule-service.test.ts` 增加 service 测试。
  - 断言 path 为 `/PackagingLevelApi/GetLevelChain`。
  - 断言 body 只包含 `{ InnerLevelCode: "SEED_PKG_LEVEL_004" }`。
  - 断言返回 `DataResult<PackagingRuleLevelChainApiDto[]>` 原样透传，不在 service 中吞掉失败信息。
- [ ] 运行验证。

```bash
pnpm --filter @repo/web test -- packaging-rule-service.test.ts
```

预期：新增测试通过，既有包装规则 service 测试不回退。

## 切片 2：增加链路查询 mutation 并保持缓存边界清晰

- [ ] 在 `packaging-rule-queries.ts` 引入 `getPackagingRuleLevelChain`。
- [ ] 新增 `usePackagingRuleLevelChainMutation()`。
  - 使用 `useMutation` 而不是常驻 query，因为它是用户确认选择后的动作。
  - mutation 入参为 `{ innerLevelCode: string }`。
  - mutation 返回映射后的链路数组，排序策略按“接口顺序优先；必要时按 `levelSequence` 升序”实现。
- [ ] 不让该 mutation 失效包装规则列表、包装层级 options 或规格 options。
- [ ] 运行类型检查。

```bash
pnpm --filter @repo/web typecheck
```

预期：query hook 类型闭合，无 `any` 泄漏。

## 切片 3：实现单选包装层级弹窗

- [ ] 优先复用现有 shadcn/Radix 基础组件，新建 `packaging-rule-level-dialog.tsx`，组件名为 `PackagingRuleLevelDialog`。
- [ ] 组件定位：
  - 该组件只负责“按条件筛选包装层级列表”“单选一个包装层级”和“把选中的 `levelCode` 交给父组件确认”。
  - 不在组件内调用 `/PackagingLevelApi/GetLevelChain`。
  - 不在组件内写入包装规则表单的 `details`。
  - 不使用 `Combobox`，搜索部分做成普通表单，结果部分做成表格。
  - 不在名称里使用 `Chain`，避免误解为链式选择组件。
- [ ] 弹窗 props 建议为：
  - `open: boolean`
  - `levelOptions: PackagingRuleLevelOption[]`
  - `loading: boolean`
  - `error: string | null`
  - `onOpenChange(open: boolean): void`
  - `onConfirm(levelCode: string): Promise<void> | void`
- [ ] 组件内部状态建议：
  - `draftFilters`：搜索表单当前输入值，`{ levelCode: string; levelName: string }`
  - `appliedFilters`：点击“查询”后真正用于过滤表格的数据，`{ levelCode: string; levelName: string }`
  - `selectedLevelCode: string`
  - `useEffect(() => { if (open) { setDraftFilters(emptyFilters); setAppliedFilters(emptyFilters); setSelectedLevelCode(""); } }, [open]);`
  - `filteredLevelOptions`：本地过滤 `levelOptions`，只按 `appliedFilters.levelCode` 和 `appliedFilters.levelName` 做 `includes` 模糊匹配。
- [ ] UI 行为：
  - `DialogContent` 使用 `data-testid="packaging-rule-level-dialog"`。
  - 标题文案 key 建议为 `pages.packagingRule.levelDialog.title`。
  - 描述文案 key 建议为 `pages.packagingRule.levelDialog.description`，说明用户选择一个包装层级后会生成层级明细。
  - 搜索表单位于表格上方，包含两个 `Input`：
    - 层级编码：`id="packaging-rule-level-filter-code"`、`data-testid="packaging-rule-level-filter-code"`。
    - 层级名称：`id="packaging-rule-level-filter-name"`、`data-testid="packaging-rule-level-filter-name"`。
  - 搜索表单提供“查询”和“重置”按钮：
    - 查询按钮 `data-testid="packaging-rule-level-filter-submit"`，将 `draftFilters` 写入 `appliedFilters` 并清空单选值。
    - 重置按钮 `data-testid="packaging-rule-level-filter-reset"`，清空 `draftFilters`、`appliedFilters` 和单选值。
  - 展示表格列为：单选、层级编码、层级名称、层级序号。
  - 表格行使用 `data-testid={\`packaging-rule-level-row-${option.levelCode}\`}`。
  - 单选控件可使用原生 `input type="radio"`，`name="packaging-rule-level"`，点击行或 radio 都能选中该行。
  - 当前选中行设置 `data-state="selected"`，沿用 table 行选中样式。
  - 如果 `levelOptions.length === 0`，展示“暂无包装层级”空状态。
  - 如果搜索后 `filteredLevelOptions.length === 0`，展示“未找到包装层级”空状态。
  - 未选择、`loading` 为 true 或无可选数据时确认按钮禁用。
  - `loading` 为 true 时确认按钮文案使用 `pages.packagingRule.levelDialog.loading`，否则使用现有确认文案。
  - `error` 不为空时在弹窗内展示 destructive 样式提示，`data-testid="packaging-rule-level-error"`。
  - 用户关闭弹窗时只关闭选择弹窗，不影响主包装规则表单和已存在的 `details`。
- [ ] 推荐组件骨架如下，实际实现时可按现有 import 顺序整理：

```tsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PackagingRuleLevelOption } from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";

type PackagingRuleLevelDialogProps = {
  open: boolean;
  levelOptions: PackagingRuleLevelOption[];
  loading: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (levelCode: string) => Promise<void> | void;
};

type LevelFilters = {
  levelCode: string;
  levelName: string;
};

const emptyFilters: LevelFilters = {
  levelCode: "",
  levelName: "",
};

export function PackagingRuleLevelDialog({
  open,
  levelOptions,
  loading,
  error,
  onOpenChange,
  onConfirm,
}: PackagingRuleLevelDialogProps) {
  const { t } = useTranslation("common");
  const [draftFilters, setDraftFilters] = useState<LevelFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<LevelFilters>(emptyFilters);
  const [selectedLevelCode, setSelectedLevelCode] = useState("");

  useEffect(() => {
    if (open) {
      setDraftFilters(emptyFilters);
      setAppliedFilters(emptyFilters);
      setSelectedLevelCode("");
    }
  }, [open]);

  const filteredLevelOptions = useMemo(
    () =>
      levelOptions.filter((option) => {
        const levelCode = appliedFilters.levelCode.trim().toLowerCase();
        const levelName = appliedFilters.levelName.trim().toLowerCase();

        return (
          (!levelCode ||
            option.levelCode.toLowerCase().includes(levelCode)) &&
          (!levelName || option.levelName.toLowerCase().includes(levelName))
        );
      }),
    [appliedFilters.levelCode, appliedFilters.levelName, levelOptions],
  );

  const confirmDisabled =
    loading || !selectedLevelCode || !filteredLevelOptions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%-2rem,56rem)] max-w-none"
        data-testid="packaging-rule-level-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {t("pages.packagingRule.levelDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("pages.packagingRule.levelDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedFilters(draftFilters);
              setSelectedLevelCode("");
            }}
          >
            <Field>
              <FieldLabel htmlFor="packaging-rule-level-filter-code">
                {t("pages.packagingRule.form.detailLevelCode")}
              </FieldLabel>
              <Input
                id="packaging-rule-level-filter-code"
                data-testid="packaging-rule-level-filter-code"
                value={draftFilters.levelCode}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    levelCode: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="packaging-rule-level-filter-name">
                {t("pages.packagingRule.form.detailLevelName")}
              </FieldLabel>
              <Input
                id="packaging-rule-level-filter-name"
                data-testid="packaging-rule-level-filter-name"
                value={draftFilters.levelName}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    levelName: event.target.value,
                  }))
                }
              />
            </Field>
            <Button
              type="submit"
              className="self-end"
              data-testid="packaging-rule-level-filter-submit"
            >
              {t("pages.packagingRule.actions.search")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="self-end"
              data-testid="packaging-rule-level-filter-reset"
              onClick={() => {
                setDraftFilters(emptyFilters);
                setAppliedFilters(emptyFilters);
                setSelectedLevelCode("");
              }}
            >
              {t("pages.packagingRule.actions.reset")}
            </Button>
          </form>

          <Table containerClassName="max-h-[22rem] rounded-md border">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {t("pages.packagingRule.levelDialog.select")}
                </TableHead>
                <TableHead>
                  {t("pages.packagingRule.form.detailLevelCode")}
                </TableHead>
                <TableHead>
                  {t("pages.packagingRule.form.detailLevelName")}
                </TableHead>
                <TableHead>
                  {t("pages.packagingRule.form.detailLevelSequence")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLevelOptions.length ? (
                filteredLevelOptions.map((option) => (
                  <TableRow
                    key={option.levelCode}
                    data-state={
                      selectedLevelCode === option.levelCode
                        ? "selected"
                        : undefined
                    }
                    data-testid={`packaging-rule-level-row-${option.levelCode}`}
                    onClick={() => setSelectedLevelCode(option.levelCode)}
                  >
                    <TableCell>
                      <input
                        type="radio"
                        name="packaging-rule-level"
                        aria-label={option.levelCode}
                        checked={selectedLevelCode === option.levelCode}
                        onChange={() => setSelectedLevelCode(option.levelCode)}
                      />
                    </TableCell>
                    <TableCell>{option.levelCode}</TableCell>
                    <TableCell>{option.levelName}</TableCell>
                    <TableCell>{option.levelSequence}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    {levelOptions.length
                      ? t("pages.packagingRule.levelDialog.noLevelFound")
                      : t("pages.packagingRule.levelDialog.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {error ? (
            <div
              className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="packaging-rule-level-error"
            >
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("pages.packagingRule.actions.cancel")}
          </Button>
          <Button
            type="button"
            data-testid="packaging-rule-level-confirm"
            disabled={confirmDisabled}
            onClick={() => {
              if (selectedLevelCode) {
                void onConfirm(selectedLevelCode);
              }
            }}
          >
            {loading
              ? t("pages.packagingRule.levelDialog.loading")
              : t("pages.packagingRule.actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] 父组件集成约定：
  - 父组件持有 `levelDialogOpen`，并将 `levelChainMutation.isPending` 传给 `loading`。
  - 父组件将链路加载错误归一为 `string | null` 后传给 `error`。
  - `onConfirm` 内执行 `await levelChainMutation.mutateAsync({ innerLevelCode: levelCode })`，成功后再 `detailFields.replace(...)` 和关闭弹窗。
  - `onOpenChange(false)` 时父组件应清理错误状态；不要清理主表单。
- [ ] 在 `zh-CN/common.ts` 和 `en-US/common.ts` 补齐文案；业务代码中不出现中文用户可见文案。
- [ ] i18n key 建议：

```ts
levelDialog: {
  title: "选择包装层级",
  description: "选择包装层级后，系统将读取该层级链路并生成层级明细。",
  select: "选择",
  empty: "暂无包装层级",
  noLevelFound: "未找到包装层级",
  loading: "生成中...",
  loadError: "层级链路获取失败，请重试。",
},
```

- [ ] 运行针对 i18n 和类型的最小检查。

```bash
pnpm --filter @repo/web typecheck
```

预期：新增组件 props 与 i18n key 均可类型检查通过。

## 切片 4：改造新增明细流程并转换链路到 table 模型

- [ ] 在 `PackagingRuleFormDialog` 中增加选择弹窗状态：
  - `levelDialogOpen`
  - 链路加载错误状态，例如 `levelDialogError: string | null`。
  - 选中层级由 `PackagingRuleLevelDialog` 内部持有草稿状态，父组件只在 `onConfirm(levelCode)` 中接收最终选择。
- [ ] 将“添加层级明细”按钮的 `onClick` 从 `openCreateDetailDialog` 改为打开层级选择弹窗。
- [ ] 用户确认层级后调用 `usePackagingRuleLevelChainMutation().mutateAsync({ innerLevelCode })`。
- [ ] 将链路数组转换为 `PackagingRuleDetailFormValues[]`：
  - `packagingLevelCode = dto.levelCode`
  - `specCode = ""`
  - `standardQuantity = ""`
  - `maxQuantity = ""`
  - `packagingMethod = "auto"`
  - 不生成 `id`
- [ ] 将转换结果写入 `details` field array。
  - 推荐使用 `detailFields.replace(nextDetails)`，让链路选择成为当前规则明细的来源。
  - 写入成功后关闭选择弹窗。
- [ ] 保持 `openEditDetailDialog(index)`、`submitDetail(values)` 的编辑分支不变。
  - 如果保留 `submitDetail` 的新增分支，应只作为内部兜底，不从“添加层级明细”入口触发。
- [ ] 处理展示名称：
  - 若 `levelOptions` 包含链路中的 code，table 可继续按现有逻辑反查名称。
  - 若链路接口可能返回 options 中不存在的 code，需把链路返回的 `levelName` 纳入当前组件的名称解析来源，避免 table 层级名称显示 `-`。
- [ ] 运行 focused 测试。

```bash
pnpm --filter @repo/web test -- packaging-rule-page.test.tsx
```

预期：既有编辑、删除、提交空明细确认等测试不回退；新增链路流程测试在下一切片补齐后通过。

## 切片 5：更新页面测试覆盖业务流程

- [ ] 调整 `packaging-rule-page.test.tsx` 中“creates a rule...”测试：
  - 点击“添加层级明细”后期望出现选择层级弹窗，而不是原明细编辑弹窗。
  - 在选择弹窗选择 `SEED_PKG_LEVEL_004` 或测试数据中的等价层级。
  - 确认后断言请求 `/PackagingLevelApi/GetLevelChain`，body 为 `{ InnerLevelCode: selectedCode }`。
  - 断言 table 出现 4 行链路明细，顺序为链路接口返回顺序或按 `LevelSequence` 约定顺序。
  - 断言每行展示对应 `LevelCode` 和 `LevelName`。
- [ ] 保留并更新 table 行编辑测试：
  - 点击第 1 行编辑后仍打开 `packaging-rule-detail-dialog`。
  - 补充规格、标准数量、最大数量和包装方式。
  - 保存后 table 行更新，主表单提交 payload 包含转换后的完整 `Details`。
- [ ] 增加链路接口失败测试：
  - mock `/PackagingLevelApi/GetLevelChain` 返回失败或 transport error。
  - 断言选择弹窗保持打开并展示错误信息。
  - 断言 `details` table 未被替换。
- [ ] 如测试 mock transport 目前没有 `GetLevelChain` 分支，在 `createStatefulPackagingRuleTransport` 或同文件测试 helper 中补齐。
- [ ] 运行 focused 测试。

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx -t "包装规则|packaging rule|level chain"
```

预期：新增流程、编辑流程、失败流程均通过。

## 切片 6：回归验证与人工检查

- [ ] 运行包装规则 service 和页面测试。

```bash
pnpm --filter @repo/web test -- packaging-rule-service.test.ts packaging-rule-page.test.tsx
```

- [ ] 运行 Web 类型检查。

```bash
pnpm --filter @repo/web typecheck
```

- [ ] 搜索业务代码中文，确认新增用户可见文案均走 i18n。

```bash
rg "[\\u4e00-\\u9fff]" apps/web/src/features/mes/packaging/packaging-rule
```

- [ ] 人工检查 `/packaging/packaging-rule`：
  - 新增规则弹窗中点击“添加层级明细”出现层级选择弹窗。
  - 选择层级并确认后，table 自动生成链路行。
  - 点击 table 行编辑仍进入原明细编辑弹窗。
  - 修改规格、数量、包装方式后 table 展示正确。
  - 提交新增规则时 payload 的 `Details` 与 table 当前状态一致。

## 待确认事项

1. 选择层级后生成链路明细时，是否必须替换当前 table？本计划默认替换。
2. 链路行生成后，规格和数量是否允许为空等待用户逐行编辑？本计划默认允许进入 table，但最终提交仍由现有表单校验拦截空字段。
3. 链路 table 顺序以接口返回顺序为准，还是必须按包装从内到外/从外到内排序？本计划默认接口顺序，必要时按 `LevelSequence` 升序兜底。
