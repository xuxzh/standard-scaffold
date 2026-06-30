# 后台多 Tabs 快速切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven-development before implementation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在登录后的后台壳层中新增浏览器式页面 tabs，让用户访问过的后台页面可以在 tabs 区域快速切换。

**Architecture:** 将后台页面的路由、标题、描述、导航和 tab 展示信息收敛到一份共享元数据。`AdminLayout` 负责维护当前后台会话内已打开 tab 列表，新增 `AppRouteTabs` 负责渲染和切换；现有 `RouteActivityCache` 继续只保活包装管理页面。

**Tech Stack:** React 19、TanStack Router、TypeScript、Tailwind CSS v4、shadcn 本地组件、lucide-react、Vitest、Testing Library、Playwright。

## Global Constraints

- 任务级别为 `L2`，实现前必须在任务分支或隔离 worktree 中进行。
- 使用 `pnpm`，不要使用 `npm` 或 `yarn`。
- 所有新增用户可见文案必须同时补充 `zh-CN` 和 `en-US`。
- 代码中不要出现中文，中文只放在 i18n 资源和文档中。
- 不影响 `/login`、`/embed/*`、`/examples/standalone`。
- 不改变 Theme、i18n、Query、Router provider 顺序。
- 不扩大现有 keep-alive 范围；包装页状态保留继续依赖 `RouteActivityCache`。
- 首版不支持关闭 tab、拖拽排序、右键菜单、固定 tab、刷新后恢复或跨登录会话持久化。

---

## File Structure

- Create: `apps/web/src/components/layout/admin-shell-routes.ts`
  - 维护后台壳层内页面定义、导航分组、tab 可见性、标题和描述 i18n key。
- Create: `apps/web/src/components/layout/app-route-tabs.tsx`
  - 渲染已打开页面 tabs，并通过 TanStack Router 导航到对应 pathname。
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
  - 读取共享页面定义，维护本次后台会话内已打开 tab 列表，并在 header 下方渲染 tabs。
- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
  - 改为使用共享导航分组生成侧边栏菜单。
- Modify: `apps/web/src/root-app.tsx`
  - 复用共享页面定义中的包装页缓存定义，避免路径与标题重复维护。
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
  - 新增 tabs 文案。
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`
  - 新增 tabs 文案。
- Modify: `apps/web/src/app.test.tsx`
  - 增加 tabs 行为和 i18n 回归测试。
- Modify: `apps/web-e2e/tests/navigation.spec.ts`
  - 增加真实浏览器导航 tabs 回归。

## Task 1: 提取后台页面元数据

**Files:**

- Create: `apps/web/src/components/layout/admin-shell-routes.ts`
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
- Modify: `apps/web/src/root-app.tsx`

**Interfaces:**

- Produces:
  - `type AdminShellPathname = "/dashboard" | "/examples/embedded" | "/packaging/packaging-type" | "/packaging/packaging-level" | "/packaging/packaging-spec" | "/packaging/packaging-kit" | "/packaging/packaging-rule" | "/packaging/material-packaging-relation" | "/debug/ip-rewrite-proxy"`
  - `type AdminPageDefinition`
  - `type AdminNavigationGroup`
  - `adminPageDefinitions`
  - `adminNavigationGroups`
  - `getAdminPageDefinition(pathname: string)`
  - `packagingActivityDefinitions`

- [ ] **Step 1: Add failing shell metadata coverage**

Add tests to `apps/web/src/app.test.tsx` that still assert the sidebar order, header title, and packaging keep-alive behavior after metadata extraction.

Run:

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx -t "renders packaging navigation items in the expected order|renders the packaging module inside the admin shell|restores packaging page state after visiting another admin route"
```

Expected: PASS before refactor; these tests guard behavior during extraction.

- [ ] **Step 2: Create shared metadata**

Create `apps/web/src/components/layout/admin-shell-routes.ts` with:

```ts
import type { ComponentType } from "react";
import {
  ArchiveIcon,
  BoxIcon,
  FileTextIcon,
  LayersIcon,
  LayoutDashboardIcon,
  Link2,
  PackageIcon,
  RulerIcon,
  SquareArrowOutUpRightIcon,
  WorkflowIcon,
} from "lucide-react";
import type { RouteActivityDefinition } from "@/components/routing/route-activity-cache";
import { DashboardPage } from "@/routes/dashboard";
import { DebugIpRewriteProxyPage } from "@/routes/debug.ip-rewrite-proxy";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { MaterialPackagingRelationPage } from "@/routes/packaging.material-packaging-relation";
import { PackagingKitPage } from "@/routes/packaging.packaging-kit";
import { PackagingLevelPage } from "@/routes/packaging.packaging-level";
import { PackagingRulePage } from "@/routes/packaging.packaging-rule";
import { PackagingSpecPage } from "@/routes/packaging.packaging-spec";
import { PackagingTypePage } from "@/routes/packaging.packaging-type";

export type AdminShellPathname =
  | "/dashboard"
  | "/examples/embedded"
  | "/packaging/packaging-type"
  | "/packaging/packaging-level"
  | "/packaging/packaging-spec"
  | "/packaging/packaging-kit"
  | "/packaging/packaging-rule"
  | "/packaging/material-packaging-relation"
  | "/debug/ip-rewrite-proxy";

export type AdminPageDefinition = {
  cacheKey?: string;
  component?: ComponentType;
  descriptionKey: string;
  icon: ComponentType<{ className?: string }>;
  navTitleKey: string;
  pathname: AdminShellPathname;
  tabSlug: string;
  tabVisible: boolean;
  testId: string;
  titleKey: string;
};

export type AdminNavigationGroup = {
  key: "examples" | "packaging" | "debug";
  titleKey: string;
  icon: ComponentType<{ className?: string }>;
  items: readonly AdminPageDefinition[];
};

export const adminPageDefinitions = [
  {
    pathname: "/dashboard",
    tabSlug: "dashboard",
    tabVisible: true,
    titleKey: "pages.dashboard.title",
    descriptionKey: "pages.dashboard.description",
    navTitleKey: "navigation.dashboard",
    testId: "sidebar-nav-dashboard",
    icon: LayoutDashboardIcon,
    component: DashboardPage,
  },
  {
    pathname: "/examples/embedded",
    tabSlug: "examples-embedded",
    tabVisible: true,
    titleKey: "pages.embeddedExample.title",
    descriptionKey: "pages.embeddedExample.description",
    navTitleKey: "navigation.embeddedExample",
    testId: "sidebar-nav-embedded",
    icon: FileTextIcon,
    component: EmbeddedExamplePage,
  },
  {
    pathname: "/packaging/packaging-type",
    tabSlug: "packaging-packaging-type",
    tabVisible: true,
    cacheKey: "packaging-type",
    titleKey: "pages.packagingType.title",
    descriptionKey: "pages.packagingType.description",
    navTitleKey: "navigation.packagingTypeMaintenance",
    testId: "sidebar-nav-packaging-packaging-type",
    icon: PackageIcon,
    component: PackagingTypePage,
  },
  {
    pathname: "/packaging/packaging-level",
    tabSlug: "packaging-packaging-level",
    tabVisible: true,
    cacheKey: "packaging-level",
    titleKey: "pages.packagingLevel.title",
    descriptionKey: "pages.packagingLevel.description",
    navTitleKey: "navigation.packagingLevelMaintenance",
    testId: "sidebar-nav-packaging-packaging-level",
    icon: LayersIcon,
    component: PackagingLevelPage,
  },
  {
    pathname: "/packaging/packaging-spec",
    tabSlug: "packaging-packaging-spec",
    tabVisible: true,
    cacheKey: "packaging-spec",
    titleKey: "pages.packagingSpec.title",
    descriptionKey: "pages.packagingSpec.description",
    navTitleKey: "navigation.packagingSpecMaintenance",
    testId: "sidebar-nav-packaging-packaging-spec",
    icon: RulerIcon,
    component: PackagingSpecPage,
  },
  {
    pathname: "/packaging/packaging-kit",
    tabSlug: "packaging-packaging-kit",
    tabVisible: true,
    cacheKey: "packaging-kit",
    titleKey: "pages.packagingKit.title",
    descriptionKey: "pages.packagingKit.description",
    navTitleKey: "navigation.packagingKitMaintenance",
    testId: "sidebar-nav-packaging-packaging-kit",
    icon: ArchiveIcon,
    component: PackagingKitPage,
  },
  {
    pathname: "/packaging/packaging-rule",
    tabSlug: "packaging-packaging-rule",
    tabVisible: true,
    cacheKey: "packaging-rule",
    titleKey: "pages.packagingRule.title",
    descriptionKey: "pages.packagingRule.description",
    navTitleKey: "navigation.packagingRuleMaintenance",
    testId: "sidebar-nav-packaging-packaging-rule",
    icon: Link2,
    component: PackagingRulePage,
  },
  {
    pathname: "/packaging/material-packaging-relation",
    tabSlug: "packaging-material-packaging-relation",
    tabVisible: true,
    cacheKey: "material-packaging-relation",
    titleKey: "pages.materialPackagingRelation.title",
    descriptionKey: "pages.materialPackagingRelation.description",
    navTitleKey: "navigation.materialPackagingRelationMaintenance",
    testId: "sidebar-nav-packaging-material-packaging-relation",
    icon: BoxIcon,
    component: MaterialPackagingRelationPage,
  },
  {
    pathname: "/debug/ip-rewrite-proxy",
    tabSlug: "debug-ip-rewrite-proxy",
    tabVisible: true,
    titleKey: "pages.debugIpRewriteProxy.title",
    descriptionKey: "pages.debugIpRewriteProxy.description",
    navTitleKey: "navigation.debugIpRewriteProxy",
    testId: "sidebar-nav-debug-ip-rewrite-proxy",
    icon: Link2,
    component: DebugIpRewriteProxyPage,
  },
] as const satisfies readonly AdminPageDefinition[];

export const adminNavigationGroups = [
  {
    key: "examples",
    titleKey: "navigation.exampleManagement",
    icon: FileTextIcon,
    items: [
      adminPageDefinitions[1],
      {
        pathname: "/examples/standalone",
        tabSlug: "examples-standalone",
        tabVisible: false,
        titleKey: "pages.standaloneExample.title",
        descriptionKey: "pages.standaloneExample.description",
        navTitleKey: "navigation.standalonePreview",
        testId: "sidebar-nav-standalone",
        icon: SquareArrowOutUpRightIcon,
      },
    ],
  },
  {
    key: "packaging",
    titleKey: "navigation.packagingManagement",
    icon: PackageIcon,
    items: adminPageDefinitions.slice(2, 8),
  },
  {
    key: "debug",
    titleKey: "navigation.debugTools",
    icon: WorkflowIcon,
    items: [adminPageDefinitions[8]],
  },
] as const satisfies readonly AdminNavigationGroup[];

export function getAdminPageDefinition(pathname: string) {
  return adminPageDefinitions.find((definition) => definition.pathname === pathname);
}

export const packagingActivityDefinitions = adminPageDefinitions
  .filter((definition) => definition.cacheKey && definition.component)
  .map((definition) => ({
    cacheKey: definition.cacheKey,
    pathname: definition.pathname,
    component: definition.component,
  })) satisfies readonly RouteActivityDefinition[];
```

- [ ] **Step 3: Replace duplicate shell definitions**

Update `AdminLayout` to use `getAdminPageDefinition(pathname)` for header copy and `heightConstrainedRoutes` from the packaging pathnames.

Update `AppSidebar` to map `adminNavigationGroups` and preserve all current test ids.

Update `root-app.tsx` to import `packagingActivityDefinitions` from `admin-shell-routes`.

- [ ] **Step 4: Verify refactor**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx
```

Expected: PASS.

## Task 2: 新增后台路由 Tabs 组件

**Files:**

- Create: `apps/web/src/components/layout/app-route-tabs.tsx`
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`

**Interfaces:**

- Consumes:
  - `AdminPageDefinition`
  - `getAdminPageDefinition(pathname)`
- Produces:
  - `AppRouteTabs({ activePathname, tabs }: AppRouteTabsProps)`
  - `type OpenAdminTab = Pick<AdminPageDefinition, "pathname" | "tabSlug" | "titleKey" | "icon">`

- [ ] **Step 1: Add failing tabs tests**

Add tests to `apps/web/src/app.test.tsx`:

```ts
it("opens visited admin pages as route tabs and switches between them", async () => {
  renderAuthenticatedApp(["/dashboard"]);

  expect(await screen.findByTestId("admin-route-tabs")).toBeInTheDocument();
  expect(screen.getByTestId("admin-route-tab-dashboard")).toHaveTextContent("仪表盘");

  fireEvent.click(screen.getByTestId("sidebar-nav-packaging-packaging-type"));
  await screen.findByRole("heading", { name: "包装类型维护" });

  expect(screen.getByTestId("admin-route-tab-dashboard")).toBeInTheDocument();
  expect(screen.getByTestId("admin-route-tab-packaging-packaging-type")).toHaveTextContent("包装类型维护");

  fireEvent.click(screen.getByTestId("admin-route-tab-dashboard"));
  expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("admin-route-tab-packaging-packaging-type"));
  expect(await screen.findByRole("heading", { name: "包装类型维护" })).toBeInTheDocument();
});
```

Expected: FAIL because `admin-route-tabs` does not exist yet.

- [ ] **Step 2: Add i18n copy**

Add to `common.ts` resources:

```ts
tabs: {
  openPages: "已打开页面",
  currentPage: "当前页面",
}
```

English:

```ts
tabs: {
  openPages: "Open pages",
  currentPage: "Current page",
}
```

- [ ] **Step 3: Implement `AppRouteTabs`**

Create `app-route-tabs.tsx`:

```tsx
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { AdminPageDefinition } from "@/components/layout/admin-shell-routes";
import { cn } from "@/lib/utils";

export type OpenAdminTab = Pick<
  AdminPageDefinition,
  "icon" | "pathname" | "tabSlug" | "titleKey"
>;

type AppRouteTabsProps = {
  activePathname: string;
  tabs: readonly OpenAdminTab[];
};

export function AppRouteTabs({ activePathname, tabs }: AppRouteTabsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={t("tabs.openPages")}
      className="border-b bg-background/95 px-4 lg:px-6"
      data-testid="admin-route-tabs"
    >
      <div className="flex min-w-0 gap-1 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const isActive = tab.pathname === activePathname;
          const Icon = tab.icon;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex h-8 max-w-56 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              data-testid={`admin-route-tab-${tab.tabSlug}`}
              key={tab.pathname}
              onClick={() => {
                void navigate({ to: tab.pathname });
              }}
              title={isActive ? t("tabs.currentPage") : undefined}
              type="button"
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{t(tab.titleKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Wire session tabs in `AdminLayout`**

In `AdminLayout`, keep `openTabs` as component state. On pathname changes, append the matching `tabVisible` definition if absent. Render `AppRouteTabs` between `AppHeader` and the content wrapper.

The update effect must:

- ignore unknown pathnames;
- ignore definitions with `tabVisible: false`;
- preserve insertion order;
- never duplicate an existing pathname.

- [ ] **Step 5: Verify tabs behavior**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx -t "route tabs|restores packaging page state"
```

Expected: PASS.

## Task 3: Tabs i18n 和范围回归

**Files:**

- Modify: `apps/web/src/app.test.tsx`

**Interfaces:**

- Consumes:
  - `data-testid="admin-route-tabs"`
  - `data-testid="admin-route-tab-<slug>"`

- [ ] **Step 1: Add i18n regression**

Add a test that opens dashboard and packaging tabs, switches language to English, then asserts tab labels become `Dashboard` and `Packaging Type Maintenance`.

Run:

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx -t "switches shell copy to English"
```

Expected: FAIL until tabs labels use `t(tab.titleKey)` at render time.

- [ ] **Step 2: Add route scope regression**

Add assertions that `/examples/standalone` and `/embed/packaging/packaging-spec` still do not render `admin-route-tabs`.

Run:

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx -t "standalone|embed"
```

Expected: PASS.

- [ ] **Step 3: Verify full app test file**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx
```

Expected: PASS.

## Task 4: E2E 覆盖真实切换路径

**Files:**

- Modify: `apps/web-e2e/tests/navigation.spec.ts`

**Interfaces:**

- Consumes:
  - `data-testid="admin-route-tabs"`
  - `data-testid="admin-route-tab-dashboard"`
  - `data-testid="admin-route-tab-packaging-packaging-type"`

- [ ] **Step 1: Add failing E2E scenario**

Add:

```ts
test("switches visited admin pages from route tabs", async ({ appShell, page }) => {
  await page.goto(appRoutes.dashboard);

  await expect(page.getByTestId("admin-route-tabs")).toBeVisible();
  await expect(page.getByTestId("admin-route-tab-dashboard")).toBeVisible();

  await appShell.openPackagingType();
  await expect(page).toHaveURL(appRoutes.packagingType);
  await page.getByLabel("类型编码").fill("DRAFT-TYPE");

  await page.getByTestId("admin-route-tab-dashboard").click();
  await expect(page).toHaveURL(appRoutes.dashboard);

  await page.getByTestId("admin-route-tab-packaging-packaging-type").click();
  await expect(page).toHaveURL(appRoutes.packagingType);
  await expect(page.getByLabel("类型编码")).toHaveValue("DRAFT-TYPE");
});
```

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e tests/navigation.spec.ts --project=chromium
```

Expected: PASS after implementation.

## Task 5: Final Verification

- [ ] **Step 1: Run targeted web tests**

```bash
pnpm --filter @repo/web exec vitest run src/app.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run affected E2E**

```bash
pnpm --filter @repo/web-e2e test:e2e tests/navigation.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 3: Run web verification**

```bash
pnpm verify:web
```

Expected: PASS.

- [ ] **Step 4: Check diff hygiene**

```bash
git diff --check
git status --short
```

Expected: `git diff --check` reports no whitespace errors. `git status --short` only shows files changed for this feature and this plan.

## Assumptions

- 用户说的“登录的主页面”指登录后的后台壳层，不是登录表单页。
- “打开过的页面”指本次后台会话内访问过的后台菜单页。
- 首版 tabs 只提供快速切换能力，不提供关闭能力；关闭 tab 会引入缓存释放、当前页回退策略和未保存草稿处理，需单独设计。
- 当前 `RouteActivityCache` 已经满足包装页状态保留，本计划不改变它的缓存策略。
