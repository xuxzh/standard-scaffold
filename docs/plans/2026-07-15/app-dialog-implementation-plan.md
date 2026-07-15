# AppDialog 通用弹窗实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增应用级 `AppDialog`，固定 header/footer 和标准动作样式，暴露可滚动 content，并将包装类型表单作为首个接入方迁移到原生 `formId` 提交模式。

**Architecture:** `AppDialog` 位于 `apps/web/src/components`，组合现有 `components/ui/dialog` 与 `Button`，不修改底层 Dialog primitive。组件只管理受控 open 状态、三行布局、标准动作和 form 关联；表单状态、校验、请求和错误仍由业务调用方管理。

**Tech Stack:** React 19、TypeScript、Radix/shadcn Dialog、Tailwind CSS、react-i18next、React Hook Form、Zod、Vitest、Testing Library。

**Design spec:** `docs/specs/2026-07-15/app-dialog-design.md`

## Global Constraints

- 任务级别固定为 `L2`，在当前隔离 worktree 的 `feat/app-dialog` 分支实施。
- 不修改 `apps/web/src/components/ui/dialog.tsx` 及其 Wujie、portal、遮罩和全屏逻辑。
- header 固定使用 `border-b px-8 py-6`；footer 固定使用 `border-t px-8 py-6 sm:flex-row sm:justify-end`。
- content 默认使用 `min-h-0 overflow-auto px-8 py-6`，只允许通过 `bodyClassName` 覆盖 content。
- 默认动作顺序固定为返回、重置、确认；图标、variant 和 destructive reset 样式不可由调用方覆盖。
- 表单确认只通过 `formId` 关联原生 submit；非表单确认只通过 `onClick` 执行。
- 所有新增显示文案同时维护 `zh-CN` 与 `en-US`，业务代码中不新增中文文案。
- 首批只迁移包装类型表单，不迁移其他包装弹窗，不重命名业务文件。
- 每个实现任务遵循红—绿测试循环；不顺手重构相邻代码。

---

## File Structure

### 新增

- `apps/web/src/components/app-dialog.tsx`：应用级 Dialog 组合组件、公共 Props 和动作联合类型。
- `apps/web/src/components/app-dialog.test.tsx`：公共布局、动作、表单关联、尺寸和 i18n 单元测试。
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.test.tsx`：包装类型首批迁移的窄回归测试。

### 修改

- `apps/web/src/i18n/resources/zh-CN/common.ts`：增加 `dialog.actions.back/reset/confirm` 中文文案。
- `apps/web/src/i18n/resources/en-US/common.ts`：增加 `dialog.actions.back/reset/confirm` 英文文案。
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`：用 `AppDialog` 替换重复 Dialog 骨架，保留业务表单逻辑。

### 保持不变

- `apps/web/src/components/ui/dialog.tsx`：底层 Dialog 能力不改。
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`：页面状态和请求不改。
- 其他 packaging form dialog：不在本次迁移范围。

---

### Task 1: 新增 `AppDialog` 公共组件

**Files:**

- Create: `apps/web/src/components/app-dialog.tsx`
- Create: `apps/web/src/components/app-dialog.test.tsx`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts:13-17`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts:13-17`

**Interfaces:**

- Consumes: `Dialog`、`DialogContent`、`DialogHeader`、`DialogTitle`、`DialogDescription`、`DialogFooter`、`Button`、`cn`、`useTranslation("common")`。
- Produces: `AppDialog`、`AppDialogProps`、`AppDialogBackAction`、`AppDialogResetAction`、`AppDialogConfirmAction` 和 `AppDialogSize`。
- Invariant: `resetAction` 与 `confirmAction` 必须显式传配置或 `false`；`backAction` 省略时默认关闭弹窗。

- [ ] **Step 1: 写公共组件失败测试**

创建 `apps/web/src/components/app-dialog.test.tsx`：

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppDialog } from "@/components/app-dialog";
import { i18n } from "@/i18n/config";

type AppDialogOverrides = Partial<ComponentProps<typeof AppDialog>>;

function renderAppDialog(overrides: AppDialogOverrides = {}) {
  const onOpenChange = vi.fn();
  const onReset = vi.fn();
  const onConfirm = vi.fn();

  render(
    <AppDialog
      open
      onOpenChange={onOpenChange}
      title="Dialog title"
      testId="test-app-dialog"
      resetAction={{ onClick: onReset }}
      confirmAction={{ onClick: onConfirm }}
      {...overrides}
    >
      <p>Dialog body</p>
    </AppDialog>,
  );

  return { onOpenChange, onReset, onConfirm };
}

beforeEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("zh-CN");
  });
});

describe("AppDialog", () => {
  it("renders the fixed shell and default actions", () => {
    const { onOpenChange, onReset, onConfirm } = renderAppDialog();

    const dialog = screen.getByTestId("test-app-dialog");
    const body = dialog.querySelector('[data-slot="app-dialog-body"]');
    const header = dialog.querySelector('[data-slot="dialog-header"]');
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');

    expect(dialog).toHaveClass(
      "grid",
      "max-h-[90vh]",
      "grid-rows-[auto_minmax(0,1fr)_auto]",
      "gap-0",
      "overflow-hidden",
      "p-0",
      "w-[min(100%-2rem,56rem)]",
      "max-w-none",
    );
    expect(header).toHaveClass("border-b", "px-8", "py-6");
    expect(body).toHaveClass("min-h-0", "overflow-auto", "px-8", "py-6");
    expect(body).toHaveTextContent("Dialog body");
    expect(footer).toHaveClass(
      "border-t",
      "px-8",
      "py-6",
      "sm:flex-row",
      "sm:justify-end",
    );

    const backButton = screen.getByRole("button", { name: "返回" });
    const resetButton = screen.getByRole("button", { name: "重置" });
    const confirmButton = screen.getByRole("button", { name: "确认" });

    expect(backButton.querySelector("svg")).toBeInTheDocument();
    expect(resetButton.querySelector("svg")).toBeInTheDocument();
    expect(confirmButton.querySelector("svg")).toBeInTheDocument();
    expect(resetButton).toHaveClass(
      "border-destructive",
      "text-destructive",
      "hover:bg-destructive/10",
      "hover:text-destructive",
    );

    fireEvent.click(backButton);
    fireEvent.click(resetButton);
    fireEvent.click(confirmButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onReset).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("lets a custom back action take over without closing", () => {
    const onBack = vi.fn();
    const { onOpenChange } = renderAppDialog({
      backAction: { onClick: onBack },
    });

    fireEvent.click(screen.getByRole("button", { name: "返回" }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it.each([
    { overrides: { backAction: false }, label: "返回" },
    { overrides: { resetAction: false }, label: "重置" },
    { overrides: { confirmAction: false }, label: "确认" },
  ])("hides the $label action independently", ({ overrides, label }) => {
    renderAppDialog(overrides as AppDialogOverrides);

    expect(
      screen.queryByRole("button", { name: label }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("test-app-dialog").querySelector(
        '[data-slot="dialog-footer"]',
      ),
    ).toBeInTheDocument();
  });

  it("omits the footer when every action is hidden", () => {
    renderAppDialog({
      backAction: false,
      resetAction: false,
      confirmAction: false,
    });

    expect(
      screen.queryByRole("button", { name: "返回" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "重置" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "确认" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("test-app-dialog").querySelector(
        '[data-slot="dialog-footer"]',
      ),
    ).not.toBeInTheDocument();
  });

  it("associates a form confirm action with an external form", () => {
    const onSubmit = vi.fn();

    render(
      <AppDialog
        open
        onOpenChange={vi.fn()}
        title="Form dialog"
        resetAction={false}
        confirmAction={{ formId: "test-form", testId: "test-submit" }}
      >
        <form
          id="test-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input name="name" defaultValue="value" />
        </form>
      </AppDialog>,
    );

    const confirmButton = screen.getByTestId("test-submit");
    expect(confirmButton).toHaveAttribute("type", "submit");
    expect(confirmButton).toHaveAttribute("form", "test-form");

    fireEvent.click(confirmButton);

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it.each([
    ["sm", "w-[min(100%-2rem,32rem)]"],
    ["md", "w-[min(100%-2rem,56rem)]"],
    ["lg", "w-[min(100%-2rem,72rem)]"],
    ["xl", "w-[min(100%-2rem,85rem)]"],
  ] as const)("maps the %s size to its controlled width", (size, className) => {
    renderAppDialog({ size });

    expect(screen.getByTestId("test-app-dialog")).toHaveClass(
      className,
      "max-w-none",
    );
  });

  it("applies controlled overrides and English default labels", async () => {
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });

    renderAppDialog({
      description: "Dialog description",
      size: "xl",
      bodyClassName: "p-0 overflow-hidden",
      showCloseButton: false,
      showFullscreenButton: false,
      confirmAction: {
        onClick: vi.fn(),
        disabled: true,
        testId: "disabled-confirm",
      },
    });

    const dialog = screen.getByTestId("test-app-dialog");
    const body = dialog.querySelector('[data-slot="app-dialog-body"]');

    expect(dialog).toHaveClass("w-[min(100%-2rem,85rem)]", "max-w-none");
    expect(body).toHaveClass("p-0", "overflow-hidden");
    expect(body).not.toHaveClass("px-8", "py-6", "overflow-auto");
    expect(screen.getByText("Dialog description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByTestId("disabled-confirm")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Enter fullscreen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close dialog" }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯**

Run:

```bash
pnpm --filter @repo/web test -- src/components/app-dialog.test.tsx
```

Expected: FAIL，Vitest 报告无法解析 `@/components/app-dialog`；此失败证明测试在公共组件不存在时能够阻止通过。

- [ ] **Step 3: 增加默认动作中英文资源**

对 `apps/web/src/i18n/resources/zh-CN/common.ts` 应用：

```diff
   dialog: {
     close: "关闭弹窗",
     enterFullscreen: "全屏",
     exitFullscreen: "退出全屏",
+    actions: {
+      back: "返回",
+      reset: "重置",
+      confirm: "确认",
+    },
   },
```

对 `apps/web/src/i18n/resources/en-US/common.ts` 应用：

```diff
   dialog: {
     close: "Close dialog",
     enterFullscreen: "Enter fullscreen",
     exitFullscreen: "Exit fullscreen",
+    actions: {
+      back: "Back",
+      reset: "Reset",
+      confirm: "Confirm",
+    },
   },
```

- [ ] **Step 4: 实现最小 `AppDialog`**

创建 `apps/web/src/components/app-dialog.tsx`：

```tsx
import { CheckIcon, ChevronLeftIcon, RotateCcwIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AppDialogActionBase = {
  label?: ReactNode;
  disabled?: boolean;
  testId?: string;
};

export type AppDialogBackAction =
  | false
  | (AppDialogActionBase & {
      onClick?: () => void | Promise<void>;
    });

export type AppDialogResetAction =
  | false
  | (AppDialogActionBase & {
      onClick: () => void | Promise<void>;
    });

export type AppDialogConfirmAction =
  | false
  | (AppDialogActionBase & {
      formId: string;
      onClick?: never;
    })
  | (AppDialogActionBase & {
      formId?: never;
      onClick: () => void | Promise<void>;
    });

export type AppDialogSize = "sm" | "md" | "lg" | "xl";

export type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: AppDialogSize;
  bodyClassName?: string;
  testId?: string;
  backAction?: AppDialogBackAction;
  resetAction: AppDialogResetAction;
  confirmAction: AppDialogConfirmAction;
  showCloseButton?: boolean;
  showFullscreenButton?: boolean;
};

const dialogSizeClassNames: Record<AppDialogSize, string> = {
  sm: "w-[min(100%-2rem,32rem)] max-w-none",
  md: "w-[min(100%-2rem,56rem)] max-w-none",
  lg: "w-[min(100%-2rem,72rem)] max-w-none",
  xl: "w-[min(100%-2rem,85rem)] max-w-none",
};

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  bodyClassName,
  testId,
  backAction,
  resetAction,
  confirmAction,
  showCloseButton = true,
  showFullscreenButton = true,
}: AppDialogProps) {
  const { t } = useTranslation("common");
  const hasVisibleAction =
    backAction !== false ||
    resetAction !== false ||
    confirmAction !== false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={testId}
        className={cn(
          "grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0",
          dialogSizeClassNames[size],
        )}
        showCloseButton={showCloseButton}
        showFullscreenButton={showFullscreenButton}
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && description !== null ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div
          data-slot="app-dialog-body"
          className={cn(
            "min-h-0 overflow-auto px-8 py-6",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {hasVisibleAction ? (
          <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
            {backAction !== false ? (
              <Button
                type="button"
                variant="outline"
                data-testid={backAction?.testId}
                disabled={backAction?.disabled}
                onClick={() => {
                  if (backAction?.onClick) {
                    void backAction.onClick();
                    return;
                  }
                  onOpenChange(false);
                }}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                {backAction?.label ?? t("dialog.actions.back")}
              </Button>
            ) : null}

            {resetAction !== false ? (
              <Button
                type="button"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                data-testid={resetAction.testId}
                disabled={resetAction.disabled}
                onClick={() => {
                  void resetAction.onClick();
                }}
              >
                <RotateCcwIcon data-icon="inline-start" />
                {resetAction.label ?? t("dialog.actions.reset")}
              </Button>
            ) : null}

            {confirmAction !== false ? (
              <Button
                type={confirmAction.formId ? "submit" : "button"}
                form={confirmAction.formId}
                data-testid={confirmAction.testId}
                disabled={confirmAction.disabled}
                onClick={
                  confirmAction.onClick
                    ? () => {
                        void confirmAction.onClick?.();
                      }
                    : undefined
                }
              >
                <CheckIcon data-icon="inline-start" />
                {confirmAction.label ?? t("dialog.actions.confirm")}
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: 运行公共组件测试和类型检查并确认绿灯**

Run:

```bash
pnpm --filter @repo/web test -- src/components/app-dialog.test.tsx
pnpm --filter @repo/web typecheck
```

Expected: `app-dialog.test.tsx` 全部 PASS；TypeScript 以 exit code 0 完成且没有诊断。

- [ ] **Step 6: 提交公共组件切片**

```bash
git add \
  apps/web/src/components/app-dialog.tsx \
  apps/web/src/components/app-dialog.test.tsx \
  apps/web/src/i18n/resources/zh-CN/common.ts \
  apps/web/src/i18n/resources/en-US/common.ts
git commit -m "feat(web): add reusable AppDialog"
```

---

### Task 2: 将包装类型表单迁移到 `AppDialog`

**Files:**

- Create: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.test.tsx`
- Modify: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx:1-13,87-221`
- Verify unchanged behavior: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx:488-647`
- Verify route-cache behavior: `apps/web/src/app.test.tsx:293-325`

**Interfaces:**

- Consumes: Task 1 的 `AppDialog`，尤其是 `testId`、默认 back、`resetAction` 和 `confirmAction.formId`。
- Produces: 对外 Props 不变的 `PackagingTypeFormSheet`，其 form 仍为 `id="packaging-type-form"`。
- Invariant: schema、`useFormSessionInitializer`、字段 Controller、create/edit 默认值和 `onSubmit` 数据结构不变。

- [ ] **Step 1: 写包装类型迁移失败测试**

创建 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.test.tsx`：

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PackagingTypeRecord } from "@/features/mes/packaging/packaging-type/packaging-contract";
import { PackagingTypeFormSheet } from "@/features/mes/packaging/packaging-type/packaging-type-form-sheet";
import { i18n } from "@/i18n/config";

const editRecord: PackagingTypeRecord = {
  id: 1,
  typeCode: "PKG-001",
  typeName: "Reusable box",
  isRecyclable: true,
  description: "Existing description",
  remark: "",
};

type FormSheetOverrides = Partial<
  ComponentProps<typeof PackagingTypeFormSheet>
>;

function renderFormSheet(overrides: FormSheetOverrides = {}) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();

  render(
    <PackagingTypeFormSheet
      open
      mode="create"
      record={null}
      submitting={false}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );

  return { onOpenChange, onSubmit };
}

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("zh-CN");
});

describe("PackagingTypeFormSheet", () => {
  it("uses the AppDialog body and external native submit button", () => {
    renderFormSheet();

    const dialog = screen.getByTestId("packaging-type-form-sheet");
    const body = dialog.querySelector('[data-slot="app-dialog-body"]');
    const form = document.getElementById("packaging-type-form");
    const confirmButton = screen.getByTestId("packaging-type-form-submit");

    expect(screen.getByText("新增类型")).toBeInTheDocument();
    expect(dialog).toHaveClass(
      "max-h-[90vh]",
      "grid-rows-[auto_minmax(0,1fr)_auto]",
      "w-[min(100%-2rem,56rem)]",
    );
    expect(body).toHaveClass("min-h-0", "overflow-auto", "px-8", "py-6");
    expect(body).toContainElement(form);
    expect(form).not.toContainElement(confirmButton);
    expect(confirmButton).toHaveAttribute("type", "submit");
    expect(confirmButton).toHaveAttribute("form", "packaging-type-form");
  });

  it("resets create values through the standard reset action", () => {
    renderFormSheet();

    const typeCode = screen.getByPlaceholderText("请输入类型编码");
    const typeName = screen.getByPlaceholderText("请输入类型名称");
    const recyclable = screen.getByRole("switch", { name: "循环包装" });
    const description = screen.getByPlaceholderText("请输入描述");

    fireEvent.change(typeCode, { target: { value: "PKG-NEW" } });
    fireEvent.change(typeName, { target: { value: "New box" } });
    fireEvent.click(recyclable);
    fireEvent.change(description, { target: { value: "New description" } });
    fireEvent.click(screen.getByRole("button", { name: "重置" }));

    expect(typeCode).toHaveValue("");
    expect(typeName).toHaveValue("");
    expect(recyclable).toHaveAttribute("aria-checked", "false");
    expect(description).toHaveValue("");
  });

  it("submits validated form values through the footer confirm button", async () => {
    const { onSubmit } = renderFormSheet();

    fireEvent.change(screen.getByPlaceholderText("请输入类型编码"), {
      target: { value: "PKG-NEW" },
    });
    fireEvent.change(screen.getByPlaceholderText("请输入类型名称"), {
      target: { value: "New box" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "循环包装" }));
    fireEvent.change(screen.getByPlaceholderText("请输入描述"), {
      target: { value: "New description" },
    });
    fireEvent.click(screen.getByTestId("packaging-type-form-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        typeCode: "PKG-NEW",
        typeName: "New box",
        isRecyclable: true,
        description: "New description",
      });
    });
  });

  it("preserves edit defaults and submitting state", () => {
    renderFormSheet({
      mode: "edit",
      record: editRecord,
      submitting: true,
    });

    expect(screen.getByText("编辑类型")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入类型编码")).toHaveValue(
      "PKG-001",
    );
    expect(screen.getByPlaceholderText("请输入类型编码")).toBeDisabled();
    expect(screen.getByPlaceholderText("请输入类型名称")).toHaveValue(
      "Reusable box",
    );
    expect(screen.getByRole("switch", { name: "循环包装" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByPlaceholderText("请输入描述")).toHaveValue(
      "Existing description",
    );
    expect(screen.getByTestId("packaging-type-form-submit")).toBeDisabled();
  });
});
```

- [ ] **Step 2: 运行迁移测试并确认红灯**

Run:

```bash
pnpm --filter @repo/web test -- src/features/mes/packaging/packaging-type/packaging-type-form-sheet.test.tsx
```

Expected: FAIL，`data-slot="app-dialog-body"` 不存在，证明旧业务组件尚未接入公共 shell。

- [ ] **Step 3: 用 `AppDialog` 替换重复骨架**

对 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx` 应用以下精确变更；未出现在 patch 中的 schema、hooks 和 Controller 内容保持原样：

```diff
-import { CheckIcon, ChevronLeftIcon, RotateCcwIcon } from "lucide-react";
 import { zodResolver } from "@hookform/resolvers/zod";
 import { Controller, useForm } from "react-hook-form";
 import { useTranslation } from "react-i18next";
 import * as z from "zod";
-import { Button } from "@/components/ui/button";
-import {
-  Dialog,
-  DialogContent,
-  DialogFooter,
-  DialogHeader,
-  DialogTitle,
-} from "@/components/ui/dialog";
+import { AppDialog } from "@/components/app-dialog";
```

将原有 return 骨架替换为：

```diff
   return (
-    <Dialog open={open} onOpenChange={onOpenChange}>
-      <DialogContent
-        data-testid="packaging-type-form-sheet"
-        className="w-[min(100%-2rem,56rem)] max-w-none gap-0 overflow-hidden p-0"
-        showCloseButton
-      >
-        <DialogHeader className="border-b px-8 py-6">
-          <DialogTitle>
-            {mode === "create"
-              ? t("pages.packagingType.form.createTitle")
-              : t("pages.packagingType.form.editTitle")}
-          </DialogTitle>
-        </DialogHeader>
-
+    <AppDialog
+      open={open}
+      onOpenChange={onOpenChange}
+      title={
+        mode === "create"
+          ? t("pages.packagingType.form.createTitle")
+          : t("pages.packagingType.form.editTitle")
+      }
+      testId="packaging-type-form-sheet"
+      resetAction={{
+        onClick: () => form.reset(getDefaultValues(record)),
+      }}
+      confirmAction={{
+        formId: "packaging-type-form",
+        disabled: submitting,
+        testId: "packaging-type-form-submit",
+      }}
+    >
         <form
           id="packaging-type-form"
-          className="flex flex-col"
           onSubmit={form.handleSubmit(async (values) => {
             await onSubmit(values);
           })}
         >
-          <FieldGroup className="max-h-[calc(100vh-18rem)] overflow-y-auto px-8 py-6">
+          <FieldGroup>
```

在最后一个字段后移除旧 footer，并用下面的闭合结构结束 return：

```diff
           </FieldGroup>
-
-          <DialogFooter className="border-t px-8 py-6 sm:flex-row sm:justify-end">
-            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
-              <ChevronLeftIcon data-icon="inline-start" />
-              {t("pages.packagingType.actions.back")}
-            </Button>
-            <Button
-              type="button"
-              variant="outline"
-              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
-              onClick={() => form.reset(getDefaultValues(record))}
-            >
-              <RotateCcwIcon data-icon="inline-start" />
-              {t("pages.packagingType.actions.reset")}
-            </Button>
-            <Button
-              data-testid="packaging-type-form-submit"
-              type="submit"
-              form="packaging-type-form"
-              disabled={submitting}
-            >
-              <CheckIcon data-icon="inline-start" />
-              {t("pages.packagingType.actions.confirm")}
-            </Button>
-          </DialogFooter>
         </form>
-      </DialogContent>
-    </Dialog>
+    </AppDialog>
   );
 }
```

- [ ] **Step 4: 运行窄回归、既有整页测试和类型检查**

Run:

```bash
pnpm --filter @repo/web test -- \
  src/features/mes/packaging/packaging-type/packaging-type-form-sheet.test.tsx \
  src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx \
  src/app.test.tsx
pnpm --filter @repo/web typecheck
```

Expected: 三个测试文件全部 PASS；既有创建、编辑、动作图标、会话重置与路由缓存用例不回归；TypeScript exit code 0。

- [ ] **Step 5: 提交包装类型迁移切片**

```bash
git add \
  apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx \
  apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.test.tsx
git commit -m "refactor(web): migrate packaging type form to AppDialog"
```

---

### Task 3: 完整验证与视觉验收

**Files:**

- Verify: `apps/web/src/components/app-dialog.tsx`
- Verify: `apps/web/src/components/app-dialog.test.tsx`
- Verify: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`
- Verify: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.test.tsx`
- Verify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Verify: `apps/web/src/i18n/resources/en-US/common.ts`

**Interfaces:**

- Consumes: Task 1 和 Task 2 的两个已提交切片。
- Produces: 可供人工审阅的验证证据和干净工作树；不产生验证专用代码或空提交。

- [ ] **Step 1: 运行 Web 完整验证**

Run:

```bash
pnpm verify:web
```

Expected: Web lint、typecheck、全部 Vitest 测试和 build 均以 exit code 0 完成。

- [ ] **Step 2: 检查实现 diff 的范围与空白错误**

Run:

```bash
git diff origin/main...HEAD --check
git diff origin/main...HEAD --name-status
```

Expected: `--check` 无输出；name-status 只包含设计、计划以及本计划 File Structure 中列出的实现文件，不包含 `components/ui/dialog.tsx` 或其他包装弹窗。

- [ ] **Step 3: 启动 Web 并做普通尺寸视觉检查**

在单独终端运行：

```bash
pnpm --filter @repo/web dev
```

使用本地浏览器打开 `http://localhost:5173/packaging/packaging-type`，进入已登录或本地 mock 状态后点击“新增类型”。确认：

- 标题仍为“新增类型”；
- header/footer 的边框、`px-8 py-6` 间距和三个按钮顺序与迁移前一致；
- 返回、重置、确认图标与 destructive reset 颜色一致；
- 调整视口高度后只有 content 滚动，header/footer 保持可见；
- 保持必填字段为空，在字段内按 Enter 后出现既有 Zod 校验信息，证明原生隐式提交仍进入同一个 form `onSubmit`；
- 关闭后重新打开，表单会话初始化行为不变。

Expected: 六项均通过；如任一项失败，回到 Task 1 或 Task 2 修复并重新执行对应测试，不创建“仅记录验证”的提交。

- [ ] **Step 4: 做全屏与中英文视觉检查**

在同一弹窗中点击全屏按钮，然后切换语言：

- 全屏时弹窗占满视口，content 继续独立滚动；
- header/footer 保持固定，关闭和退出全屏按钮可用；
- 中文动作显示“返回 / 重置 / 确认”；
- 英文动作显示“Back / Reset / Confirm”；
- title 和表单字段继续使用包装类型业务翻译。

Expected: 五项均通过且没有文字溢出或 footer 抖动。

- [ ] **Step 5: 确认最终提交和工作树状态**

Run:

```bash
git log --oneline origin/main..HEAD
git status --short --branch
```

Expected: 实现阶段包含 `feat(web): add reusable AppDialog` 和 `refactor(web): migrate packaging type form to AppDialog` 两个逻辑提交；工作树无未提交文件。若验证修复产生额外代码改动，应按实际 diff 使用 `fix(web): ...` 单独提交，再重新运行 `pnpm verify:web`。
