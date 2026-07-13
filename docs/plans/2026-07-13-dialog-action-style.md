# Dialog 操作按钮样式优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Dialog 的全屏状态图标替换为 `Expand` / `Shrink`，并按参考截图调整右上角全屏与关闭按钮的视觉样式。

**Architecture:** 保留 `DialogContent` 现有状态、可访问性和关闭行为，只修改同一组件中的图标与局部 Tailwind 类。通过现有 Vitest + Testing Library 组件测试锁定图标状态映射和操作区样式，不新增公共 API 或全局 Button variant。

**Tech Stack:** React 19、TypeScript、Radix Dialog、shadcn Button、Lucide React、Tailwind CSS v4、Vitest、Testing Library。

## Global Constraints

- 任务级别为 `L1`，改动范围限于 Dialog 操作按钮及其定向测试。
- 红框仅为截图标注，不进入最终 UI。
- 去除操作按钮的 hover 视觉变化，仅保留 pointer cursor；保留键盘 focus 反馈、全屏切换逻辑、关闭逻辑和 i18n 文案。
- 使用项目语义色，不引入硬编码颜色或新依赖。
- 不修改全局 Button variants，不调整 Dialog 尺寸、标题区、遮罩或动画。

---

### Task 1: Dialog 操作按钮图标与样式

**Files:**
- Modify: `apps/web/src/components/ui/dialog.test.tsx`
- Modify: `apps/web/src/components/ui/dialog.tsx`

**Interfaces:**
- Consumes: `DialogContent` 现有的 `showCloseButton`、`showFullscreenButton` 属性和内部 `isFullscreen` 状态。
- Produces: 对外接口不变；进入全屏显示 Lucide `Expand`，退出全屏显示 Lucide `Shrink`，关闭显示 Lucide `X`。

- [x] **Step 1: 编写失败测试**

在 `apps/web/src/components/ui/dialog.test.tsx` 的全屏切换测试中增加图标状态断言，并新增一个样式测试：

```tsx
expect(fullscreenButton.querySelector(".lucide-expand")).toBeInTheDocument();

fireEvent.click(fullscreenButton);

const exitFullscreenButton = screen.getByRole("button", {
  name: "退出全屏",
});
expect(exitFullscreenButton.querySelector(".lucide-shrink")).toBeInTheDocument();
```

```tsx
it("matches the dialog action styling", () => {
  render(<TestDialog />);

  const fullscreenButton = screen.getByRole("button", { name: "全屏" });
  const closeButton = screen.getByRole("button", { name: "关闭弹窗" });
  const actions = fullscreenButton.parentElement;

  expect(actions).toHaveClass("top-5", "right-8", "gap-1");
  expect(fullscreenButton).toHaveAttribute("data-variant", "ghost");
  expect(fullscreenButton).toHaveClass(
    "size-12",
    "cursor-pointer",
    "text-primary",
    "hover:bg-transparent",
    "hover:text-primary",
    "dark:hover:bg-transparent",
  );
  expect(closeButton).toHaveAttribute("data-variant", "ghost");
  expect(closeButton).toHaveClass(
    "size-12",
    "cursor-pointer",
    "text-destructive",
    "hover:bg-transparent",
    "hover:text-destructive",
    "dark:hover:bg-transparent",
  );
  expect(fullscreenButton.querySelector("svg")).toHaveClass("size-5");
  expect(closeButton.querySelector("svg")).toHaveClass("size-8");
});
```

- [x] **Step 2: 运行定向测试并确认失败原因**

Run: `pnpm --filter @repo/web exec vitest run src/components/ui/dialog.test.tsx`

Expected: FAIL；旧实现仍渲染 `.lucide-maximize-2` / `.lucide-minimize-2`，关闭按钮仍为 `destructive`，操作区和按钮尺寸类也不匹配新断言。

- [x] **Step 3: 编写最小实现**

在 `apps/web/src/components/ui/dialog.tsx` 中将图标导入改为：

```tsx
import { Expand, Shrink, XIcon } from "lucide-react"
```

将操作区和按钮改为：

```tsx
<div className="absolute top-5 right-8 flex items-center gap-1">
  {showFullscreenButton ? (
    <Button
      type="button"
      aria-label={
        isFullscreen
          ? t("dialog.exitFullscreen")
          : t("dialog.enterFullscreen")
      }
      aria-pressed={isFullscreen}
      className="size-12 cursor-pointer text-primary hover:bg-transparent hover:text-primary dark:hover:bg-transparent"
      onClick={() => setIsFullscreen((current) => !current)}
      size="icon-lg"
      variant="ghost"
    >
      {isFullscreen ? (
        <Shrink className="size-5" />
      ) : (
        <Expand className="size-5" />
      )}
    </Button>
  ) : null}
  {showCloseButton ? (
    <DialogPrimitive.Close asChild>
      <Button
        type="button"
        aria-label={t("dialog.close")}
        className="size-12 cursor-pointer text-destructive hover:bg-transparent hover:text-destructive dark:hover:bg-transparent"
        onClick={() => setIsFullscreen(false)}
        size="icon-lg"
        variant="ghost"
      >
        <XIcon className="size-8" />
      </Button>
    </DialogPrimitive.Close>
  ) : null}
</div>
```

- [x] **Step 4: 运行定向测试并确认通过**

Run: `pnpm --filter @repo/web exec vitest run src/components/ui/dialog.test.tsx`

Expected: PASS；`dialog.test.tsx` 全部测试通过且无报错。

- [x] **Step 5: 运行 Web 静态验证**

Run: `pnpm --filter @repo/web typecheck`

Expected: PASS，退出码为 0。

Run: `pnpm --filter @repo/web lint`

Expected: PASS，退出码为 0。

- [x] **Step 6: 复核改动范围**

Run: `git diff --check && git diff -- apps/web/src/components/ui/dialog.tsx apps/web/src/components/ui/dialog.test.tsx`

Expected: 无空白错误；代码 diff 仅包含图标、操作区局部样式和对应测试。
