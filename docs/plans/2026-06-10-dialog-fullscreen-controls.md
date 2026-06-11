# Dialog 全屏控制实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为通用 `DialogContent` 增加默认启用的全屏切换控件，并统一右上角关闭控件样式。

**Architecture:** 全屏状态保留在每个 `DialogContent` 实例内部，通过最后合并的 Tailwind class 覆盖调用方的尺寸、定位和圆角限制。操作文案来自现有 `common` i18n namespace，Radix Dialog 继续负责打开、关闭、焦点和 portal 行为。

**Tech Stack:** React 19、TypeScript、Radix Dialog、Tailwind CSS、lucide-react、react-i18next、Vitest、Testing Library

---

### Task 1: 用组件测试定义 Dialog 控件行为

**Files:**
- Create: `apps/web/src/components/ui/dialog.test.tsx`

- [ ] **Step 1: 写默认状态和全屏切换的失败测试**

创建测试辅助组件，使用受控 `Dialog` 渲染标题和内容，并导入 i18n 初始化：

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import "@/i18n/config";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

function TestDialog({
  showCloseButton,
  showFullscreenButton,
}: {
  showCloseButton?: boolean;
  showFullscreenButton?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="dialog-content"
        showCloseButton={showCloseButton}
        showFullscreenButton={showFullscreenButton}
      >
        <DialogTitle>Test dialog</DialogTitle>
      </DialogContent>
    </Dialog>
  );
}
```

测试默认按钮和两次切换：

```tsx
it("toggles between the default and fullscreen layouts", () => {
  render(<TestDialog />);

  const content = screen.getByTestId("dialog-content");
  const fullscreenButton = screen.getByRole("button", { name: "全屏" });

  expect(content).not.toHaveAttribute("data-fullscreen", "true");
  expect(fullscreenButton).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(fullscreenButton);

  expect(content).toHaveAttribute("data-fullscreen", "true");
  expect(
    screen.getByRole("button", { name: "退出全屏" }),
  ).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: "退出全屏" }));

  expect(content).not.toHaveAttribute("data-fullscreen", "true");
  expect(screen.getByRole("button", { name: "全屏" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
```

- [ ] **Step 2: 写按钮可隐藏和关闭行为的失败测试**

```tsx
it("allows the fullscreen control to be hidden", () => {
  render(<TestDialog showFullscreenButton={false} />);

  expect(
    screen.queryByRole("button", { name: "全屏" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "关闭弹窗" })).toBeInTheDocument();
});

it("preserves the existing close button option", () => {
  render(<TestDialog showCloseButton={false} />);

  expect(
    screen.queryByRole("button", { name: "关闭弹窗" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "全屏" })).toBeInTheDocument();
});

it("closes the dialog from the close control", () => {
  render(<TestDialog />);

  fireEvent.click(screen.getByRole("button", { name: "关闭弹窗" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: 运行测试并确认按预期失败**

Run:

```bash
pnpm --filter @repo/web test -- dialog.test.tsx
```

Expected: FAIL，因为 `showFullscreenButton`、全屏按钮和中文关闭文案尚未实现。

- [ ] **Step 4: 提交测试**

```bash
git add apps/web/src/components/ui/dialog.test.tsx
git commit -m "test(web): define dialog fullscreen behavior"
```

### Task 2: 实现全屏控件与双语文案

**Files:**
- Modify: `apps/web/src/components/ui/dialog.tsx`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`

- [ ] **Step 1: 增加通用 Dialog 文案**

在两个 `common` 资源顶层增加一致的 key：

```ts
dialog: {
  close: "Close dialog",
  enterFullscreen: "Enter fullscreen",
  exitFullscreen: "Exit fullscreen",
},
```

```ts
dialog: {
  close: "关闭弹窗",
  enterFullscreen: "全屏",
  exitFullscreen: "退出全屏",
},
```

- [ ] **Step 2: 实现内部全屏状态和可选按钮**

在 `DialogContent` 中：

```tsx
const [isFullscreen, setIsFullscreen] = React.useState(false);
const { t } = useTranslation("common");
```

新增属性并保持默认非全屏：

```tsx
showFullscreenButton = true,
```

在内容 class 的最后追加全屏覆盖：

```tsx
isFullscreen &&
  "inset-0 h-screen w-screen max-h-none max-w-none translate-x-0 translate-y-0 rounded-none",
```

同时增加状态标记：

```tsx
data-fullscreen={isFullscreen || undefined}
```

- [ ] **Step 3: 替换右上角操作区**

使用现有 shadcn `Button`、`Maximize2Icon`、`Minimize2Icon` 和 `XIcon`，将按钮放入统一容器：

```tsx
{showFullscreenButton || showCloseButton ? (
  <div className="absolute top-3 right-3 flex items-center gap-1">
    {showFullscreenButton ? (
      <Button
        type="button"
        aria-label={
          isFullscreen
            ? t("dialog.exitFullscreen")
            : t("dialog.enterFullscreen")
        }
        aria-pressed={isFullscreen}
        size="icon-lg"
        variant="ghost"
        onClick={() => setIsFullscreen((current) => !current)}
      >
        {isFullscreen ? (
          <Minimize2Icon />
        ) : (
          <Maximize2Icon />
        )}
      </Button>
    ) : null}
    {showCloseButton ? (
      <DialogPrimitive.Close asChild>
        <Button
          type="button"
          aria-label={t("dialog.close")}
          size="icon-lg"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </DialogPrimitive.Close>
    ) : null}
  </div>
) : null}
```

- [ ] **Step 4: 运行 Dialog 测试并确认通过**

Run:

```bash
pnpm --filter @repo/web test -- dialog.test.tsx
```

Expected: PASS，覆盖默认状态、全屏切换、按钮隐藏和关闭行为。

- [ ] **Step 5: 提交实现**

```bash
git add apps/web/src/components/ui/dialog.tsx apps/web/src/i18n/resources/en-US/common.ts apps/web/src/i18n/resources/zh-CN/common.ts
git commit -m "feat(web): add dialog fullscreen controls"
```

### Task 3: 回归验证

**Files:**
- Verify: `apps/web/src/components/ui/dialog.tsx`
- Verify: `apps/web/src/components/ui/dialog.test.tsx`

- [ ] **Step 1: 运行 Web 组件测试**

Run:

```bash
pnpm --filter @repo/web test
```

Expected: 全部 Vitest 测试通过。

- [ ] **Step 2: 运行类型检查**

Run:

```bash
pnpm --filter @repo/web typecheck
```

Expected: TypeScript 检查通过。

- [ ] **Step 3: 运行 lint**

Run:

```bash
pnpm --filter @repo/web lint
```

Expected: ESLint 检查通过。

- [ ] **Step 4: 检查最终 diff**

Run:

```bash
git diff --check
git status --short
```

Expected: 无空白错误，工作区只包含本计划预期的文件。
