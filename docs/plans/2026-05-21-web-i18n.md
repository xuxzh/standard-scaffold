# Web 国际化多语言 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/web` 增加中英文国际化能力，支持浏览器语言检测、本地持久化和头部语言切换，并把现有页面文案迁移到可扩展的翻译资源中。

**Architecture:** 使用 `i18next + react-i18next` 作为国际化基础设施，`src/i18n/config.ts` 负责 locale 归一化、资源注册和 fallback 规则，`src/i18n/i18n-provider.tsx` 负责在应用启动时根据 `localStorage` 与 `navigator.language` 解析初始语言并同步持久化。应用层通过 `useTranslation()` 消费文案，`LanguageToggle` 复用现有 `DropdownMenu` 能力接入到 `AppHeader`，首版按 `common`、`dashboard`、`examples` 三个 namespace 拆分资源。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Testing Library、TanStack Router、i18next、react-i18next、Radix UI、Lucide React、Tailwind CSS 4。

---

## 文件结构

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/i18n/config.ts`
- Create: `apps/web/src/i18n/i18n-provider.tsx`
- Create: `apps/web/src/i18n/config.test.ts`
- Create: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Create: `apps/web/src/i18n/resources/en-US/common.ts`
- Create: `apps/web/src/i18n/resources/zh-CN/dashboard.ts`
- Create: `apps/web/src/i18n/resources/en-US/dashboard.ts`
- Create: `apps/web/src/i18n/resources/zh-CN/examples.ts`
- Create: `apps/web/src/i18n/resources/en-US/examples.ts`
- Create: `apps/web/src/components/i18n/language-toggle.tsx`
- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
- Modify: `apps/web/src/routes/dashboard.tsx`
- Modify: `apps/web/src/routes/examples.embedded.tsx`
- Modify: `apps/web/src/routes/examples.standalone.tsx`
- Modify: `apps/web/src/test/setup.ts`
- Modify: `apps/web/src/app.test.tsx`

### Task 1: 定义 locale 行为并安装依赖

**Files:**
- Create: `apps/web/src/i18n/config.test.ts`
- Modify: `apps/web/src/test/setup.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: 先写 locale 归一化与初始语言解析的失败测试**

```tsx
import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import { detectInitialLocale, fallbackLocale, normalizeLocale } from "@/i18n/config";

describe("normalizeLocale", () => {
  it("maps Chinese variants to zh-CN", () => {
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-Hans")).toBe("zh-CN");
    expect(normalizeLocale("zh-CN")).toBe("zh-CN");
  });

  it("maps English variants to en-US", () => {
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("en-GB")).toBe("en-US");
    expect(normalizeLocale("en-US")).toBe("en-US");
  });

  it("returns null for unsupported locales", () => {
    expect(normalizeLocale("ja-JP")).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
  });
});

describe("detectInitialLocale", () => {
  it("prefers stored locale over navigator language", () => {
    expect(
      detectInitialLocale({
        storageValue: "en-US",
        navigatorLanguage: "zh-CN"
      })
    ).toBe("en-US");
  });

  it("falls back to navigator language when storage is missing", () => {
    expect(
      detectInitialLocale({
        storageValue: null,
        navigatorLanguage: "en-GB"
      })
    ).toBe("en-US");
  });

  it("falls back to the default locale when both sources are invalid", () => {
    expect(
      detectInitialLocale({
        storageValue: "broken",
        navigatorLanguage: "fr-FR"
      })
    ).toBe(fallbackLocale);
  });
});

describe("i18next fallback behavior", () => {
  it("uses the fallback locale for missing keys", async () => {
    const instance = createInstance();

    await instance.init({
      lng: "en-US",
      fallbackLng: fallbackLocale,
      resources: {
        "zh-CN": {
          common: {
            fallbackOnly: "仅中文回退值"
          }
        },
        "en-US": {
          common: {}
        }
      }
    });

    expect(instance.t("fallbackOnly", { ns: "common" })).toBe("仅中文回退值");
  });
});
```

- [ ] **Step 2: 给测试环境增加可控的浏览器语言 mock**

```ts
import "@testing-library/jest-dom/vitest";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

let matchMediaMatches = false;
let navigatorLanguage = "zh-CN";
const matchMediaListeners = new Set<MatchMediaListener>();

export function setMatchMediaMatches(nextValue: boolean) {
  matchMediaMatches = nextValue;
  const event = { matches: nextValue } as MediaQueryListEvent;
  matchMediaListeners.forEach((listener) => listener(event));
}

export function setNavigatorLanguage(nextValue: string) {
  navigatorLanguage = nextValue;
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

Object.defineProperty(window.navigator, "language", {
  configurable: true,
  get: () => navigatorLanguage
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {}
});
```

- [ ] **Step 3: 运行聚焦测试，确认它因缺少配置文件而失败**

Run: `pnpm --filter @repo/web test -- config.test.ts`
Expected: FAIL，提示找不到 `@/i18n/config`

- [ ] **Step 4: 为 Web 应用添加国际化依赖**

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@tanstack/react-router": "^1.170.6",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "i18next": "^25.2.1",
    "lucide-react": "^1.16.0",
    "radix-ui": "^1.4.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "^15.5.3",
    "tailwind-merge": "^3.6.0"
  }
}
```

- [ ] **Step 5: 安装依赖并提交测试骨架**

Run: `pnpm install`
Expected: PASS，`apps/web/package.json` 和 `pnpm-lock.yaml` 更新完成

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/i18n/config.test.ts apps/web/src/test/setup.ts
git commit -m "test: define web i18n locale behavior"
```

### Task 2: 实现 i18n 配置、provider 和资源注册

**Files:**
- Create: `apps/web/src/i18n/config.ts`
- Create: `apps/web/src/i18n/i18n-provider.tsx`
- Create: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Create: `apps/web/src/i18n/resources/en-US/common.ts`
- Create: `apps/web/src/i18n/resources/zh-CN/dashboard.ts`
- Create: `apps/web/src/i18n/resources/en-US/dashboard.ts`
- Create: `apps/web/src/i18n/resources/zh-CN/examples.ts`
- Create: `apps/web/src/i18n/resources/en-US/examples.ts`
- Test: `apps/web/src/i18n/config.test.ts`

- [ ] **Step 1: 实现 `config.ts`，暴露 locale 工具与单例 i18n**

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCNCommon from "@/i18n/resources/zh-CN/common";
import enUSCommon from "@/i18n/resources/en-US/common";
import zhCNDashboard from "@/i18n/resources/zh-CN/dashboard";
import enUSDashboard from "@/i18n/resources/en-US/dashboard";
import zhCNExamples from "@/i18n/resources/zh-CN/examples";
import enUSExamples from "@/i18n/resources/en-US/examples";

export type AppLocale = "zh-CN" | "en-US";

export const fallbackLocale: AppLocale = "zh-CN";
export const localeStorageKey = "app-locale";
export const supportedLocales: readonly AppLocale[] = ["zh-CN", "en-US"];

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "zh-CN" || value === "en-US";
}

export function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();

  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  if (normalized.startsWith("en")) {
    return "en-US";
  }

  return null;
}

export function detectInitialLocale({
  storageValue,
  navigatorLanguage
}: {
  storageValue: string | null;
  navigatorLanguage: string | null | undefined;
}): AppLocale {
  return (
    normalizeLocale(storageValue) ??
    normalizeLocale(navigatorLanguage) ??
    fallbackLocale
  );
}

export function readStoredLocale(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(localeStorageKey);
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch {
    // Ignore storage failures and keep the UI interactive.
  }
}

export const resources = {
  "zh-CN": {
    common: zhCNCommon,
    dashboard: zhCNDashboard,
    examples: zhCNExamples
  },
  "en-US": {
    common: enUSCommon,
    dashboard: enUSDashboard,
    examples: enUSExamples
  }
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: fallbackLocale,
    fallbackLng: fallbackLocale,
    supportedLngs: [...supportedLocales],
    defaultNS: "common",
    ns: ["common", "dashboard", "examples"],
    resources,
    interpolation: {
      escapeValue: false
    }
  });
}

export { i18n };
```

- [ ] **Step 2: 新增 `I18nProvider`，在挂载时解析初始语言并同步持久化**

```tsx
import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import {
  detectInitialLocale,
  i18n,
  isAppLocale,
  readStoredLocale,
  writeStoredLocale
} from "@/i18n/config";

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    const nextLocale = detectInitialLocale({
      storageValue: readStoredLocale(),
      navigatorLanguage:
        typeof window !== "undefined" ? window.navigator.language : null
    });

    void i18n.changeLanguage(nextLocale);
  }, []);

  useEffect(() => {
    const handleLanguageChanged = (nextLocale: string) => {
      if (isAppLocale(nextLocale)) {
        writeStoredLocale(nextLocale);
      }
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
```

- [ ] **Step 3: 写入 `common` namespace 资源**

```ts
// apps/web/src/i18n/resources/zh-CN/common.ts
const zhCNCommon = {
  header: {
    preview: "预览",
    language: "切换语言",
    languageShort: {
      "zh-CN": "中文",
      "en-US": "EN"
    },
    languageOption: {
      "zh-CN": "中文",
      "en-US": "English"
    }
  },
  navigation: {
    title: "导航",
    dashboard: "仪表盘",
    embeddedExample: "壳内示例",
    standalonePreview: "独立预览"
  },
  brand: {
    standardScaffold: "Standard Scaffold"
  },
  pages: {
    dashboard: {
      title: "仪表盘",
      description: "一个最小可扩展的 shadcn-admin 风格后台框架。"
    },
    embeddedExample: {
      title: "壳内示例",
      description: "这个示例页面运行在后台壳内，用于验证菜单与内容区协同。"
    }
  }
} as const;

export default zhCNCommon;
```

```ts
// apps/web/src/i18n/resources/en-US/common.ts
const enUSCommon = {
  header: {
    preview: "Preview",
    language: "Switch language",
    languageShort: {
      "zh-CN": "ZH",
      "en-US": "EN"
    },
    languageOption: {
      "zh-CN": "Chinese",
      "en-US": "English"
    }
  },
  navigation: {
    title: "Navigation",
    dashboard: "Dashboard",
    embeddedExample: "Embedded Example",
    standalonePreview: "Standalone Preview"
  },
  brand: {
    standardScaffold: "Standard Scaffold"
  },
  pages: {
    dashboard: {
      title: "Dashboard",
      description: "A minimal, extensible shadcn-admin style console scaffold."
    },
    embeddedExample: {
      title: "Embedded Example",
      description: "This example runs inside the admin shell to verify shell and content coordination."
    }
  }
} as const;

export default enUSCommon;
```

- [ ] **Step 4: 写入 `dashboard` 与 `examples` namespace 资源**

```ts
// apps/web/src/i18n/resources/zh-CN/dashboard.ts
const zhCNDashboard = {
  stats: {
    activeModules: {
      label: "启用模块",
      description: "当前初始化接入的核心后台模块。"
    },
    sharedPackages: {
      label: "共享包",
      description: "继续复用 monorepo 内的共享配置与 UI 包。"
    },
    publicExamples: {
      label: "公开示例",
      description: "同时支持壳内页面和脱壳独立访问页面。"
    }
  }
} as const;

export default zhCNDashboard;
```

```ts
// apps/web/src/i18n/resources/en-US/dashboard.ts
const enUSDashboard = {
  stats: {
    activeModules: {
      label: "Active Modules",
      description: "Core admin modules wired into the initial scaffold."
    },
    sharedPackages: {
      label: "Shared Packages",
      description: "Continues reusing shared config and UI packages from the monorepo."
    },
    publicExamples: {
      label: "Public Examples",
      description: "Supports both shell-embedded pages and standalone routes."
    }
  }
} as const;

export default enUSDashboard;
```

```ts
// apps/web/src/i18n/resources/zh-CN/examples.ts
const zhCNExamples = {
  embedded: {
    title: "壳内示例",
    description: "这个页面运行在后台壳内，适合放业务表单、列表和看板。",
    quickSetup: "快速设置",
    quickSetupDescription: "演示 `FieldGroup + Field` 的后台表单布局。",
    workspaceName: "工作区名称",
    ownerEmail: "负责人邮箱",
    saveDraft: "保存草稿",
    layoutNotes: "布局说明",
    layoutNotesDescription: "这部分用于说明后台壳与内容区的职责边界。",
    noteOne: "导航和全局动作放在壳层，页面只负责业务内容。",
    noteTwo: "后续可以继续接表格、图表、权限或真实数据，而不需要重做路由骨架。",
    noteThree: "如果某个示例需要全屏展示，则可以直接走独立路由模式。"
  },
  standalone: {
    routeAccess: "直接路由访问",
    title: "独立示例",
    paragraphOne: "这个页面不经过后台壳，因此不会渲染菜单栏、标题栏或侧边栏。",
    paragraphTwo: "适合承载独立 Demo、分享页、登录页，或者需要全屏布局的说明页面。",
    returnToDashboard: "返回仪表盘",
    fullscreenDemo: "查看全屏 Demo"
  }
} as const;

export default zhCNExamples;
```

```ts
// apps/web/src/i18n/resources/en-US/examples.ts
const enUSExamples = {
  embedded: {
    title: "Embedded Example",
    description: "This page runs inside the admin shell and fits business forms, tables, and dashboards.",
    quickSetup: "Quick Setup",
    quickSetupDescription: "Demonstrates an admin form layout built with `FieldGroup + Field`.",
    workspaceName: "Workspace Name",
    ownerEmail: "Owner Email",
    saveDraft: "Save Draft",
    layoutNotes: "Layout Notes",
    layoutNotesDescription: "This section explains the responsibility boundary between the shell and the content area.",
    noteOne: "Navigation and global actions stay in the shell while the page focuses on business content.",
    noteTwo: "You can plug in tables, charts, permissions, or real data later without rebuilding the route scaffold.",
    noteThree: "If an example needs a fullscreen presentation, move it to a standalone route directly."
  },
  standalone: {
    routeAccess: "Direct Route Access",
    title: "Standalone Example",
    paragraphOne: "This page bypasses the admin shell, so it does not render the menu, header, or sidebar.",
    paragraphTwo: "It works well for standalone demos, shared pages, login flows, or any content that needs a fullscreen layout.",
    returnToDashboard: "Return to Dashboard",
    fullscreenDemo: "View Fullscreen Demo"
  }
} as const;

export default enUSExamples;
```

- [ ] **Step 5: 运行配置测试并确认通过**

Run: `pnpm --filter @repo/web test -- config.test.ts`
Expected: PASS，locale 归一化、默认语言解析和 fallback 行为测试全部通过

- [ ] **Step 6: 提交 i18n 基础设施**

```bash
git add apps/web/src/i18n/config.ts \
  apps/web/src/i18n/i18n-provider.tsx \
  apps/web/src/i18n/resources/zh-CN/common.ts \
  apps/web/src/i18n/resources/en-US/common.ts \
  apps/web/src/i18n/resources/zh-CN/dashboard.ts \
  apps/web/src/i18n/resources/en-US/dashboard.ts \
  apps/web/src/i18n/resources/zh-CN/examples.ts \
  apps/web/src/i18n/resources/en-US/examples.ts \
  apps/web/src/i18n/config.test.ts
git commit -m "feat: add web i18n foundation"
```

### Task 3: 接入全局 provider、语言切换入口和壳层文案

**Files:**
- Create: `apps/web/src/components/i18n/language-toggle.tsx`
- Modify: `apps/web/src/root-app.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
- Modify: `apps/web/src/app.test.tsx`
- Test: `apps/web/src/i18n/config.test.ts`

- [ ] **Step 1: 先扩展 `app.test.tsx`，描述默认中文渲染和语言切换行为**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n/config";
import { App } from "@/root-app";
import { setNavigatorLanguage } from "@/test/setup";

describe("App routing", () => {
  beforeEach(async () => {
    localStorage.clear();
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders Chinese shell copy by default", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    expect(
      await screen.findByRole("heading", { name: "仪表盘" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "仪表盘" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览" })).toBeInTheDocument();
  });

  it("switches shell copy to English from the header menu", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    fireEvent.pointerDown(await screen.findByRole("button", { name: "切换语言" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(localStorage.getItem("app-locale")).toBe("en-US");
  });
});
```

- [ ] **Step 2: 运行集成测试并确认失败**

Run: `pnpm --filter @repo/web test -- app.test.tsx`
Expected: FAIL，提示找不到 `切换语言` 按钮或默认标题仍然是硬编码英文

- [ ] **Step 3: 新增 `LanguageToggle` 组件**

```tsx
import { LanguagesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { fallbackLocale, i18n, normalizeLocale, type AppLocale } from "@/i18n/config";

const localeOptions: AppLocale[] = ["zh-CN", "en-US"];

export function LanguageToggle() {
  const { t } = useTranslation("common");
  const currentLocale = normalizeLocale(i18n.resolvedLanguage) ?? fallbackLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t("header.language")}>
          <LanguagesIcon />
          <span className="hidden sm:inline">
            {t(`header.languageShort.${currentLocale}`)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={currentLocale}
          onValueChange={(value) => {
            void i18n.changeLanguage(value);
          }}
        >
          {localeOptions.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {t(`header.languageOption.${locale}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: 在 `App` 顶层接入 `I18nProvider`**

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
import { I18nProvider } from "@/i18n/i18n-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DashboardPage } from "@/routes/dashboard";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { StandaloneExamplePage } from "@/routes/examples.standalone";
import "@/i18n/config";

type AppProps = {
  initialEntries?: string[];
};

function RootLayout() {
  return <Outlet />;
}

// existing route declarations stay unchanged

export function App({ initialEntries }: AppProps) {
  const router = createAppRouter(initialEntries);

  return (
    <I18nProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </I18nProvider>
  );
}
```

- [ ] **Step 5: 本地化 `AppHeader`、`AdminLayout` 和 `AppSidebar`**

```tsx
// apps/web/src/components/layout/app-header.tsx
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AppHeaderProps = {
  title: string;
  description: string;
};

export function AppHeader({ title, description }: AppHeaderProps) {
  const { t } = useTranslation("common");

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <SidebarTrigger />
      <div className="flex flex-1 flex-col gap-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <LanguageToggle />
      <ThemeToggle />
      <Button variant="outline" size="sm">
        {t("header.preview")}
      </Button>
    </header>
  );
}
```

```tsx
// apps/web/src/components/layout/admin-layout.tsx
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useRouterState } from "@tanstack/react-router";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

const pageCopy = {
  "/dashboard": {
    titleKey: "pages.dashboard.title",
    descriptionKey: "pages.dashboard.description"
  },
  "/examples/embedded": {
    titleKey: "pages.embeddedExample.title",
    descriptionKey: "pages.embeddedExample.description"
  }
} as const;

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });
  const { t } = useTranslation("common");

  const copy = useMemo(() => {
    const current =
      pageCopy[pathname as keyof typeof pageCopy] ?? pageCopy["/dashboard"];

    return {
      title: t(current.titleKey),
      description: t(current.descriptionKey)
    };
  }, [pathname, t]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={copy.title} description={copy.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

```tsx
// apps/web/src/components/layout/app-sidebar.tsx
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboardIcon,
  FileTextIcon,
  SquareArrowOutUpRightIcon,
  WorkflowIcon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });
  const { t } = useTranslation("common");

  const primaryItems = [
    {
      title: t("navigation.dashboard"),
      to: "/dashboard",
      icon: LayoutDashboardIcon
    },
    {
      title: t("navigation.embeddedExample"),
      to: "/examples/embedded",
      icon: FileTextIcon
    }
  ] as const;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/dashboard">
                <WorkflowIcon />
                <span>{t("brand.standardScaffold")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.title")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/examples/standalone">
                <SquareArrowOutUpRightIcon />
                <span>{t("navigation.standalonePreview")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 6: 运行集成测试并提交壳层国际化**

Run: `pnpm --filter @repo/web test -- app.test.tsx`
Expected: PASS，默认中文壳层和切换到英文的测试通过

```bash
git add apps/web/src/components/i18n/language-toggle.tsx \
  apps/web/src/root-app.tsx \
  apps/web/src/components/layout/app-header.tsx \
  apps/web/src/components/layout/admin-layout.tsx \
  apps/web/src/components/layout/app-sidebar.tsx \
  apps/web/src/app.test.tsx
git commit -m "feat: add app shell locale switching"
```

### Task 4: 迁移页面文案到 namespace 资源

**Files:**
- Modify: `apps/web/src/routes/dashboard.tsx`
- Modify: `apps/web/src/routes/examples.embedded.tsx`
- Modify: `apps/web/src/routes/examples.standalone.tsx`
- Modify: `apps/web/src/app.test.tsx`

- [ ] **Step 1: 扩展测试，描述页面内容也会随语言切换**

```tsx
it("switches page content to English", async () => {
  render(<App initialEntries={["/examples/standalone"]} />);

  expect(
    await screen.findByText("这个页面不经过后台壳，因此不会渲染菜单栏、标题栏或侧边栏。")
  ).toBeInTheDocument();

  fireEvent.pointerDown(screen.getByRole("button", { name: "切换语言" }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

  expect(
    await screen.findByText(
      "This page bypasses the admin shell, so it does not render the menu, header, or sidebar."
    )
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Return to Dashboard" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm --filter @repo/web test -- app.test.tsx`
Expected: FAIL，说明独立页面或仪表盘卡片文案仍然是硬编码内容

- [ ] **Step 3: 本地化 `dashboard.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { key: "activeModules", value: "05" },
  { key: "sharedPackages", value: "03" },
  { key: "publicExamples", value: "02" }
] as const;

export function DashboardPage() {
  const { t } = useTranslation("dashboard");

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.key}>
          <CardHeader>
            <CardDescription>{t(`stats.${stat.key}.label`)}</CardDescription>
            <CardTitle className="text-3xl">{stat.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t(`stats.${stat.key}.description`)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: 本地化 `examples.embedded.tsx` 和 `examples.standalone.tsx`**

```tsx
// apps/web/src/routes/examples.embedded.tsx
import { SendIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function EmbeddedExamplePage() {
  const { t } = useTranslation("examples");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("embedded.title")}</CardTitle>
          <CardDescription>{t("embedded.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend>{t("embedded.quickSetup")}</FieldLegend>
            <FieldDescription>{t("embedded.quickSetupDescription")}</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="workspace-name">
                  {t("embedded.workspaceName")}
                </FieldLabel>
                <Input id="workspace-name" defaultValue="Ruihui Console" />
              </Field>
              <Field>
                <FieldLabel htmlFor="owner-email">
                  {t("embedded.ownerEmail")}
                </FieldLabel>
                <Input id="owner-email" type="email" defaultValue="team@ruihui.dev" />
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
        <CardFooter>
          <Button>
            <SendIcon data-icon="inline-start" />
            {t("embedded.saveDraft")}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("embedded.layoutNotes")}</CardTitle>
          <CardDescription>{t("embedded.layoutNotesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>{t("embedded.noteOne")}</p>
          <p>{t("embedded.noteTwo")}</p>
          <p>{t("embedded.noteThree")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

```tsx
// apps/web/src/routes/examples.standalone.tsx
import { ArrowLeftIcon, SparklesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader
} from "@/components/ui/card";

export function StandaloneExamplePage() {
  const { t } = useTranslation("examples");

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription>{t("standalone.routeAccess")}</CardDescription>
          <h1 className="text-3xl font-semibold">{t("standalone.title")}</h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>{t("standalone.paragraphOne")}</p>
          <p>{t("standalone.paragraphTwo")}</p>
        </CardContent>
        <CardFooter className="gap-3">
          <Button asChild>
            <Link to="/dashboard">
              <ArrowLeftIcon data-icon="inline-start" />
              {t("standalone.returnToDashboard")}
            </Link>
          </Button>
          <Button variant="outline">
            <SparklesIcon data-icon="inline-start" />
            {t("standalone.fullscreenDemo")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
```

- [ ] **Step 5: 运行聚焦测试并提交页面国际化**

Run: `pnpm --filter @repo/web test -- app.test.tsx`
Expected: PASS，壳层和页面内容都能随语言切换

```bash
git add apps/web/src/routes/dashboard.tsx \
  apps/web/src/routes/examples.embedded.tsx \
  apps/web/src/routes/examples.standalone.tsx \
  apps/web/src/app.test.tsx
git commit -m "feat: localize web route content"
```

### Task 5: 完成验证并收尾

**Files:**
- Verify: `apps/web/src/i18n/config.ts`
- Verify: `apps/web/src/i18n/i18n-provider.tsx`
- Verify: `apps/web/src/components/i18n/language-toggle.tsx`
- Verify: `apps/web/src/components/layout/app-header.tsx`
- Verify: `apps/web/src/components/layout/admin-layout.tsx`
- Verify: `apps/web/src/components/layout/app-sidebar.tsx`
- Verify: `apps/web/src/routes/dashboard.tsx`
- Verify: `apps/web/src/routes/examples.embedded.tsx`
- Verify: `apps/web/src/routes/examples.standalone.tsx`
- Verify: `apps/web/src/app.test.tsx`

- [ ] **Step 1: 运行 Web 应用测试**

Run: `pnpm --filter @repo/web test`
Expected: PASS，`apps/web` 现有测试和新增国际化测试全部通过

- [ ] **Step 2: 运行 lint**

Run: `pnpm --filter @repo/web lint`
Expected: PASS，无新增 ESLint 错误

- [ ] **Step 3: 运行类型检查**

Run: `pnpm --filter @repo/web typecheck`
Expected: PASS，无新增 TypeScript 错误

- [ ] **Step 4: 运行构建**

Run: `pnpm --filter @repo/web build`
Expected: PASS，Vite 构建成功

- [ ] **Step 5: 最终提交**

```bash
git add apps/web/package.json \
  pnpm-lock.yaml \
  apps/web/src/i18n/config.ts \
  apps/web/src/i18n/i18n-provider.tsx \
  apps/web/src/i18n/config.test.ts \
  apps/web/src/i18n/resources/zh-CN/common.ts \
  apps/web/src/i18n/resources/en-US/common.ts \
  apps/web/src/i18n/resources/zh-CN/dashboard.ts \
  apps/web/src/i18n/resources/en-US/dashboard.ts \
  apps/web/src/i18n/resources/zh-CN/examples.ts \
  apps/web/src/i18n/resources/en-US/examples.ts \
  apps/web/src/components/i18n/language-toggle.tsx \
  apps/web/src/root-app.tsx \
  apps/web/src/components/layout/app-header.tsx \
  apps/web/src/components/layout/admin-layout.tsx \
  apps/web/src/components/layout/app-sidebar.tsx \
  apps/web/src/routes/dashboard.tsx \
  apps/web/src/routes/examples.embedded.tsx \
  apps/web/src/routes/examples.standalone.tsx \
  apps/web/src/test/setup.ts \
  apps/web/src/app.test.tsx
git commit -m "feat: add web i18n locale switching"
```
