# Web 主题切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/web` 增加支持 `light`、`dark`、`system` 三种模式的主题切换能力，在 `AppHeader` 提供下拉菜单入口，并持久化用户选择。

**Architecture:** 新增一个轻量 `ThemeProvider` 作为全局状态层，负责读取和写入 `localStorage`、根据 `matchMedia` 解析 `resolvedTheme`、把 `dark` class 和 `color-scheme` 同步到根元素。`AppHeader` 只挂载 `ThemeToggle` 组件，切换 UI 通过最小 `DropdownMenu` 封装实现，保持与现有 Radix 风格一致。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Testing Library、Radix UI、Lucide React、Tailwind CSS 4。

---

## 文件结构

- Create: `apps/web/src/components/theme/theme-provider.tsx`
- Create: `apps/web/src/components/theme/theme-toggle.tsx`
- Create: `apps/web/src/components/ui/dropdown-menu.tsx`
- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/test/setup.ts`
- Modify: `apps/web/src/app.test.tsx`
- Create: `apps/web/src/components/theme/theme-provider.test.tsx`

### Task 1: 为主题状态层写失败测试

**Files:**
- Create: `apps/web/src/components/theme/theme-provider.test.tsx`
- Modify: `apps/web/src/test/setup.ts`

- [ ] **Step 1: 写 `ThemeProvider` 初始化与切换测试**

```tsx
import { act, render, screen } from "@testing-library/react";
import { useTheme, ThemeProvider } from "@/components/theme/theme-provider";

function ThemeProbe() {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <div>
      <span data-testid="theme-mode">{themeMode}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button type="button" onClick={() => setThemeMode("dark")}>
        set dark
      </button>
      <button type="button" onClick={() => setThemeMode("system")}>
        set system
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  it("reads stored theme mode and resolves dark mode", () => {
    localStorage.setItem("app-theme-mode", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("falls back to system when storage value is invalid", () => {
    localStorage.setItem("app-theme-mode", "broken");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
  });

  it("writes the next theme mode and updates root classes", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      screen.getByRole("button", { name: "set dark" }).click();
    });

    expect(localStorage.getItem("app-theme-mode")).toBe("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
```

- [ ] **Step 2: 扩展测试环境的 `matchMedia` mock，支持动态切换系统主题**

```ts
import "@testing-library/jest-dom/vitest";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

let matchMediaMatches = false;
const matchMediaListeners = new Set<MatchMediaListener>();

export function setMatchMediaMatches(nextValue: boolean) {
  matchMediaMatches = nextValue;
  const event = { matches: nextValue } as MediaQueryListEvent;
  matchMediaListeners.forEach((listener) => listener(event));
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: matchMediaMatches,
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: MatchMediaListener) => {
      matchMediaListeners.add(listener);
    },
    removeEventListener: (_: string, listener: MatchMediaListener) => {
      matchMediaListeners.delete(listener);
    },
    addListener: (listener: MatchMediaListener) => {
      matchMediaListeners.add(listener);
    },
    removeListener: (listener: MatchMediaListener) => {
      matchMediaListeners.delete(listener);
    },
    dispatchEvent: () => true
  })
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {}
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `pnpm --filter @repo/web test -- theme-provider.test.tsx`
Expected: FAIL，报错提示找不到 `@/components/theme/theme-provider` 或 `useTheme`

- [ ] **Step 4: 提交测试骨架**

```bash
git add apps/web/src/components/theme/theme-provider.test.tsx apps/web/src/test/setup.ts
git commit -m "test: define theme provider behavior"
```

### Task 2: 实现 `ThemeProvider`

**Files:**
- Create: `apps/web/src/components/theme/theme-provider.tsx`
- Test: `apps/web/src/components/theme/theme-provider.test.tsx`

- [ ] **Step 1: 写最小 `ThemeProvider` 实现**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (nextMode: ThemeMode) => void;
};

const STORAGE_KEY = "app-theme-mode";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(themeMode: ThemeMode): ResolvedTheme {
  return themeMode === "system" ? getSystemTheme() : themeMode;
}

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(storedValue) ? storedValue : "system";
  } catch {
    return "system";
  }
}

function applyResolvedTheme(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readStoredThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(readStoredThemeMode())
  );

  useEffect(() => {
    const nextResolvedTheme = resolveTheme(themeMode);
    setResolvedTheme(nextResolvedTheme);
    applyResolvedTheme(nextResolvedTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage failures and keep the UI interactive.
    }
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const nextResolvedTheme = resolveTheme("system");
      setResolvedTheme(nextResolvedTheme);
      applyResolvedTheme(nextResolvedTheme);
    };

    mediaQuery.addEventListener?.("change", handleChange);
    mediaQuery.addListener?.(handleChange);

    return () => {
      mediaQuery.removeEventListener?.("change", handleChange);
      mediaQuery.removeListener?.(handleChange);
    };
  }, [themeMode]);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setThemeModeState(nextMode);
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode
    }),
    [themeMode, resolvedTheme, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
```

- [ ] **Step 2: 运行测试并确认通过**

Run: `pnpm --filter @repo/web test -- theme-provider.test.tsx`
Expected: PASS，`ThemeProvider` 三个测试全部通过

- [ ] **Step 3: 增加 `system` 模式响应系统变化测试**

```tsx
import { act, render, screen } from "@testing-library/react";
import { setMatchMediaMatches } from "@/test/setup";
import { useTheme, ThemeProvider } from "@/components/theme/theme-provider";

function ThemeProbe() {
  const { themeMode, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-mode">{themeMode}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
    </div>
  );
}

it("updates resolved theme when the system theme changes", () => {
  localStorage.setItem("app-theme-mode", "system");
  setMatchMediaMatches(false);

  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>
  );

  expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");

  act(() => {
    setMatchMediaMatches(true);
  });

  expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
  expect(document.documentElement).toHaveClass("dark");
});
```

- [ ] **Step 4: 再次运行测试并提交**

Run: `pnpm --filter @repo/web test -- theme-provider.test.tsx`
Expected: PASS，新增 `system` 变化测试通过

```bash
git add apps/web/src/components/theme/theme-provider.tsx apps/web/src/components/theme/theme-provider.test.tsx apps/web/src/test/setup.ts
git commit -m "feat: add app theme provider"
```

### Task 3: 实现下拉菜单与主题切换 UI

**Files:**
- Create: `apps/web/src/components/ui/dropdown-menu.tsx`
- Create: `apps/web/src/components/theme/theme-toggle.tsx`
- Modify: `apps/web/src/app.test.tsx`

- [ ] **Step 1: 扩展集成测试，描述 `AppHeader` 的主题切换行为**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "@/root-app";

describe("App routing", () => {
  it("renders admin navigation for embedded routes", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Toggle Sidebar" }).length).toBeGreaterThan(0);
  });

  it("renders standalone routes without admin navigation", async () => {
    render(<App initialEntries={["/examples/standalone"]} />);

    expect(
      await screen.findByRole("heading", { name: "Standalone Example" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("switches theme from the app header menu", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    fireEvent.click(await screen.findByRole("button", { name: "主题切换" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "深色" }));

    expect(localStorage.getItem("app-theme-mode")).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
```

- [ ] **Step 2: 新增最小 `DropdownMenu` 封装**

```tsx
import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>
) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>
) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
};
```

- [ ] **Step 3: 新增 `ThemeToggle` 组件**

```tsx
import { LaptopMinimalIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemeMode } from "@/components/theme/theme-provider";

const options: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" }
];

function ThemeIcon({ themeMode, resolvedTheme }: { themeMode: ThemeMode; resolvedTheme: "light" | "dark" }) {
  if (themeMode === "system") {
    return resolvedTheme === "dark" ? <MoonIcon /> : <SunIcon />;
  }

  if (themeMode === "dark") {
    return <MoonIcon />;
  }

  return <SunIcon />;
}

export function ThemeToggle() {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="主题切换">
          <ThemeIcon themeMode={themeMode} resolvedTheme={resolvedTheme} />
          <span className="hidden sm:inline">主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={themeMode} onValueChange={(value) => setThemeMode(value as ThemeMode)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
              {option.value === "system" ? <LaptopMinimalIcon className="ml-auto size-4" /> : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: 运行集成测试并确认失败后再继续**

Run: `pnpm --filter @repo/web test -- app.test.tsx`
Expected: FAIL，提示找不到 `ThemeToggle` 或主题菜单项

- [ ] **Step 5: 提交 UI 组件**

```bash
git add apps/web/src/components/ui/dropdown-menu.tsx apps/web/src/components/theme/theme-toggle.tsx apps/web/src/app.test.tsx
git commit -m "feat: add theme toggle menu"
```

### Task 4: 把主题能力接入应用

**Files:**
- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Test: `apps/web/src/app.test.tsx`

- [ ] **Step 1: 在 `App` 顶层接入 `ThemeProvider`**

```tsx
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DashboardPage } from "@/routes/dashboard";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { StandaloneExamplePage } from "@/routes/examples.standalone";

function RootLayout() {
  return <Outlet />;
}

// existing route declarations stay unchanged

export function App({ initialEntries }: AppProps) {
  const router = createAppRouter(initialEntries);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: 在 `AppHeader` 挂载 `ThemeToggle`**

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AppHeaderProps = {
  title: string;
  description: string;
};

export function AppHeader({ title, description }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <SidebarTrigger />
      <div className="flex flex-1 flex-col gap-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ThemeToggle />
      <Button variant="outline" size="sm">
        Preview
      </Button>
    </header>
  );
}
```

- [ ] **Step 3: 运行聚焦测试确认通过**

Run: `pnpm --filter @repo/web test -- theme-provider.test.tsx app.test.tsx`
Expected: PASS，主题 provider 与头部集成测试全部通过

- [ ] **Step 4: 提交应用接入**

```bash
git add apps/web/src/root-app.tsx apps/web/src/components/layout/app-header.tsx apps/web/src/app.test.tsx
git commit -m "feat: wire theme toggle into app header"
```

### Task 5: 完成验证与清理

**Files:**
- Verify: `apps/web/src/components/theme/theme-provider.tsx`
- Verify: `apps/web/src/components/theme/theme-toggle.tsx`
- Verify: `apps/web/src/components/ui/dropdown-menu.tsx`
- Verify: `apps/web/src/root-app.tsx`
- Verify: `apps/web/src/components/layout/app-header.tsx`

- [ ] **Step 1: 运行 Web 应用完整测试**

Run: `pnpm --filter @repo/web test`
Expected: PASS，`apps/web` 所有测试通过

- [ ] **Step 2: 运行 lint**

Run: `pnpm --filter @repo/web lint`
Expected: PASS，无新增 ESLint 错误

- [ ] **Step 3: 运行类型检查**

Run: `pnpm --filter @repo/web typecheck`
Expected: PASS，无 TypeScript 错误

- [ ] **Step 4: 如无依赖问题，运行构建**

Run: `pnpm --filter @repo/web build`
Expected: PASS，Vite 构建成功

- [ ] **Step 5: 最终提交**

```bash
git add apps/web/src/components/theme/theme-provider.tsx \
  apps/web/src/components/theme/theme-provider.test.tsx \
  apps/web/src/components/theme/theme-toggle.tsx \
  apps/web/src/components/ui/dropdown-menu.tsx \
  apps/web/src/root-app.tsx \
  apps/web/src/components/layout/app-header.tsx \
  apps/web/src/app.test.tsx \
  apps/web/src/test/setup.ts
git commit -m "feat: add persisted theme switching"
```
