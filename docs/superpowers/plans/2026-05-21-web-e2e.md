# Web E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `apps/web-e2e` Playwright workspace that covers the current web app's navigation and UI state flows locally first, then can target a staging base URL later without forking the test suite.

**Architecture:** Keep browser automation isolated in `apps/web-e2e` and keep `apps/web` focused on product code. Add a small set of stable selectors and root markers in the web app, then implement Playwright fixtures, page objects, and two focused specs for navigation and UI state. Use environment-driven config so the same suite runs against local dev server and staging.

**Tech Stack:** `pnpm`, `turbo`, `Vite`, `React`, `TypeScript`, `Playwright`

---

## File Map

- Create: `apps/web-e2e/package.json`
- Create: `apps/web-e2e/tsconfig.json`
- Create: `apps/web-e2e/playwright.config.ts`
- Create: `apps/web-e2e/.env.example`
- Create: `apps/web-e2e/helpers/env.ts`
- Create: `apps/web-e2e/helpers/routes.ts`
- Create: `apps/web-e2e/helpers/storage.ts`
- Create: `apps/web-e2e/fixtures/test.ts`
- Create: `apps/web-e2e/pages/app-shell.page.ts`
- Create: `apps/web-e2e/pages/settings.page.ts`
- Create: `apps/web-e2e/tests/navigation.spec.ts`
- Create: `apps/web-e2e/tests/ui-state.spec.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
- Modify: `apps/web/src/components/i18n/language-toggle.tsx`
- Modify: `apps/web/src/components/theme/theme-toggle.tsx`
- Modify: `apps/web/src/routes/examples.standalone.tsx`
- Modify: `turbo.json`
- Modify: `package.json`

### Task 1: Scaffold The `apps/web-e2e` Workspace

**Files:**
- Create: `apps/web-e2e/package.json`
- Create: `apps/web-e2e/tsconfig.json`
- Create: `apps/web-e2e/playwright.config.ts`
- Create: `apps/web-e2e/.env.example`
- Create: `apps/web-e2e/helpers/env.ts`
- Create: `apps/web-e2e/helpers/routes.ts`
- Create: `apps/web-e2e/helpers/storage.ts`

- [ ] **Step 1: Verify the workspace does not exist yet**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e
```

Expected: command fails because `@repo/web-e2e` is not in the workspace yet.

- [ ] **Step 2: Create the workspace manifest**

Create `apps/web-e2e/package.json`:

```json
{
  "name": "@repo/web-e2e",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:staging": "E2E_MODE=staging playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.56.1",
    "@types/node": "^25.9.1",
    "dotenv": "^17.2.3",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 3: Create TypeScript config**

Create `apps/web-e2e/tsconfig.json`:

```json
{
  "extends": "../../packages/typescript-config/base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "types": ["node", "@playwright/test"],
    "noEmit": true
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 4: Add environment helpers**

Create `apps/web-e2e/helpers/env.ts`:

```ts
import { config as loadEnv } from "dotenv";

loadEnv();

export type E2EMode = "local" | "staging";

const defaultBaseUrl = "http://127.0.0.1:4173";

export function getE2EMode(): E2EMode {
  return process.env.E2E_MODE === "staging" ? "staging" : "local";
}

export function getBaseURL(): string {
  if (getE2EMode() === "staging") {
    const stagingBaseUrl = process.env.E2E_BASE_URL;

    if (!stagingBaseUrl) {
      throw new Error("E2E_BASE_URL is required when E2E_MODE=staging");
    }

    return stagingBaseUrl;
  }

  return process.env.E2E_BASE_URL ?? defaultBaseUrl;
}

export function isLocalMode() {
  return getE2EMode() === "local";
}
```

Create `apps/web-e2e/helpers/routes.ts`:

```ts
export const appRoutes = {
  dashboard: "/dashboard",
  embeddedExample: "/examples/embedded",
  standaloneExample: "/examples/standalone"
} as const;
```

Create `apps/web-e2e/helpers/storage.ts`:

```ts
export const storageKeys = {
  themeMode: "app-theme-mode",
  locale: "app-locale"
} as const;
```

- [ ] **Step 5: Create Playwright config**

Create `apps/web-e2e/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { getBaseURL, isLocalMode } from "./helpers/env";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: getBaseURL(),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: isLocalMode()
    ? {
        command: "pnpm --filter @repo/web dev --host 127.0.0.1 --port 4173",
        url: getBaseURL(),
        reuseExistingServer: !process.env.CI,
        cwd: "../../"
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
```

- [ ] **Step 6: Add example environment file**

Create `apps/web-e2e/.env.example`:

```bash
E2E_MODE=local
E2E_BASE_URL=http://127.0.0.1:4173
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile updates and the new Playwright workspace is installed successfully.

- [ ] **Step 8: Verify Playwright config loads**

Run:

```bash
pnpm --filter @repo/web-e2e exec playwright test --list
```

Expected: command exits successfully and prints `Total: 0 tests in 0 files`.

- [ ] **Step 9: Commit the scaffolding**

Run:

```bash
git add apps/web-e2e package.json pnpm-lock.yaml
git commit -m "test: scaffold web e2e workspace"
```

### Task 2: Add Stable Selectors And E2E Hooks In `apps/web`

**Files:**
- Modify: `apps/web/src/components/layout/admin-layout.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
- Modify: `apps/web/src/components/i18n/language-toggle.tsx`
- Modify: `apps/web/src/components/theme/theme-toggle.tsx`
- Modify: `apps/web/src/routes/examples.standalone.tsx`
- Test: `apps/web/src/app.test.tsx`

- [ ] **Step 1: Write the failing assertions for testability markers**

Update `apps/web/src/app.test.tsx` with assertions like:

```tsx
it("renders stable e2e markers for shell and toggles", async () => {
  render(<App initialEntries={["/dashboard"]} />);

  expect(await screen.findByTestId("admin-shell")).toBeInTheDocument();
  expect(screen.getByTestId("sidebar-nav-dashboard")).toBeInTheDocument();
  expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
});

it("renders standalone pages outside the admin shell", async () => {
  render(<App initialEntries={["/examples/standalone"]} />);

  expect(await screen.findByTestId("standalone-page")).toBeInTheDocument();
  expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the app tests and confirm they fail**

Run:

```bash
pnpm --filter @repo/web test -- --runInBand
```

Expected: FAIL with missing `data-testid` markers.

- [ ] **Step 3: Add shell and route markers**

Update `apps/web/src/components/layout/admin-layout.tsx`:

```tsx
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset data-testid="admin-shell">
        <AppHeader title={copy.title} description={copy.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
```

Update `apps/web/src/routes/examples.standalone.tsx`:

```tsx
  return (
    <main data-testid="standalone-page" className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
```

- [ ] **Step 4: Add toggle and navigation markers**

Update `apps/web/src/components/layout/app-sidebar.tsx`:

```tsx
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to}>
                    <Link data-testid={`sidebar-nav-${item.to === "/dashboard" ? "dashboard" : "embedded"}`} to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
```

And:

```tsx
              <Link data-testid="sidebar-nav-standalone" to="/examples/standalone">
```

Update `apps/web/src/components/theme/theme-toggle.tsx`:

```tsx
        <Button data-testid="theme-toggle" variant="outline" size="sm" aria-label="主题切换">
```

Update `apps/web/src/components/i18n/language-toggle.tsx`:

```tsx
        <Button data-testid="language-toggle" variant="outline" size="sm" aria-label={t("header.language")}>
```

Update `apps/web/src/components/layout/app-header.tsx`:

```tsx
    <header data-testid="app-header" className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
```

- [ ] **Step 5: Run the app tests and verify they pass**

Run:

```bash
pnpm --filter @repo/web test
```

Expected: PASS for the updated app-level tests.

- [ ] **Step 6: Commit the UI test hooks**

Run:

```bash
git add apps/web/src/components/layout apps/web/src/components/i18n/language-toggle.tsx apps/web/src/components/theme/theme-toggle.tsx apps/web/src/routes/examples.standalone.tsx apps/web/src/app.test.tsx
git commit -m "test: add stable selectors for web e2e"
```

### Task 3: Build Shared Playwright Fixtures And Page Objects

**Files:**
- Create: `apps/web-e2e/fixtures/test.ts`
- Create: `apps/web-e2e/pages/app-shell.page.ts`
- Create: `apps/web-e2e/pages/settings.page.ts`
- Test: `apps/web-e2e/tests/navigation.spec.ts`

- [ ] **Step 1: Write the first failing navigation spec using the future fixtures**

Create `apps/web-e2e/tests/navigation.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { appRoutes } from "../helpers/routes";

test("redirects root requests to the dashboard shell", async ({ appShell, page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(appRoutes.dashboard);
  await appShell.expectShellVisible();
});
```

- [ ] **Step 2: Run the spec and confirm it fails**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e apps/web-e2e/tests/navigation.spec.ts
```

Expected: FAIL because `../fixtures/test` and the page objects do not exist yet.

- [ ] **Step 3: Add the page object for shell interactions**

Create `apps/web-e2e/pages/app-shell.page.ts`:

```ts
import { expect, type Locator, type Page } from "@playwright/test";

export class AppShellPage {
  readonly shell: Locator;
  readonly header: Locator;
  readonly dashboardNav: Locator;
  readonly embeddedNav: Locator;
  readonly standaloneNav: Locator;

  constructor(private readonly page: Page) {
    this.shell = page.getByTestId("admin-shell");
    this.header = page.getByTestId("app-header");
    this.dashboardNav = page.getByTestId("sidebar-nav-dashboard");
    this.embeddedNav = page.getByTestId("sidebar-nav-embedded");
    this.standaloneNav = page.getByTestId("sidebar-nav-standalone");
  }

  async expectShellVisible() {
    await expect(this.shell).toBeVisible();
    await expect(this.header).toBeVisible();
  }

  async openEmbeddedExample() {
    await this.embeddedNav.click();
  }

  async openStandaloneExample() {
    await this.standaloneNav.click();
  }
}
```

- [ ] **Step 4: Add the page object for theme and locale actions**

Create `apps/web-e2e/pages/settings.page.ts`:

```ts
import { type Locator, type Page } from "@playwright/test";

export class SettingsPage {
  readonly themeToggle: Locator;
  readonly languageToggle: Locator;

  constructor(private readonly page: Page) {
    this.themeToggle = page.getByTestId("theme-toggle");
    this.languageToggle = page.getByTestId("language-toggle");
  }

  async openThemeMenu() {
    await this.themeToggle.click();
  }

  async openLanguageMenu() {
    await this.languageToggle.click();
  }

  async selectTheme(label: string) {
    await this.openThemeMenu();
    await this.page.getByRole("menuitemradio", { name: label }).click();
  }

  async selectLocale(label: string) {
    await this.openLanguageMenu();
    await this.page.getByRole("menuitemradio", { name: label }).click();
  }
}
```

- [ ] **Step 5: Add the shared fixture file**

Create `apps/web-e2e/fixtures/test.ts`:

```ts
import { test as base } from "@playwright/test";
import { AppShellPage } from "../pages/app-shell.page";
import { SettingsPage } from "../pages/settings.page";

type Fixtures = {
  appShell: AppShellPage;
  settings: SettingsPage;
};

export const test = base.extend<Fixtures>({
  appShell: async ({ page }, use) => {
    await use(new AppShellPage(page));
  },
  settings: async ({ page }, use) => {
    await use(new SettingsPage(page));
  }
});
```

- [ ] **Step 6: Re-run the spec and verify it passes**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e apps/web-e2e/tests/navigation.spec.ts --project=chromium
```

Expected: PASS for the root redirect test.

- [ ] **Step 7: Commit the shared E2E test layer**

Run:

```bash
git add apps/web-e2e/fixtures apps/web-e2e/pages apps/web-e2e/tests/navigation.spec.ts
git commit -m "test: add web e2e page objects"
```

### Task 4: Implement Navigation Coverage

**Files:**
- Modify: `apps/web-e2e/tests/navigation.spec.ts`

- [ ] **Step 1: Extend the spec with failing navigation scenarios**

Update `apps/web-e2e/tests/navigation.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { appRoutes } from "../helpers/routes";

test("redirects root requests to the dashboard shell", async ({ appShell, page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(appRoutes.dashboard);
  await appShell.expectShellVisible();
});

test("navigates from the dashboard to the embedded example page", async ({ appShell, page }) => {
  await page.goto(appRoutes.dashboard);

  await appShell.openEmbeddedExample();

  await expect(page).toHaveURL(appRoutes.embeddedExample);
  await expect(page.getByRole("heading", { name: "嵌入式示例" })).toBeVisible();
});

test("opens the standalone page without rendering the admin shell", async ({ appShell, page }) => {
  await page.goto(appRoutes.dashboard);

  await appShell.openStandaloneExample();

  await expect(page).toHaveURL(appRoutes.standaloneExample);
  await expect(page.getByTestId("standalone-page")).toBeVisible();
  await expect(appShell.shell).toHaveCount(0);
});
```

- [ ] **Step 2: Run the spec and confirm which assertions fail**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e tests/navigation.spec.ts --project=chromium
```

Expected: any failures should be limited to route text or missing markers, not to Playwright bootstrapping.

- [ ] **Step 3: Adjust the spec to match the actual localized UI copy if needed**

If the heading text differs, keep the structure but update the assertion to the exact visible title, for example:

```ts
  await expect(page.getByRole("heading", { name: "嵌入式示例页面" })).toBeVisible();
```

The final text must match the actual translation resource in the running app.

- [ ] **Step 4: Run the spec again and verify it passes**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e tests/navigation.spec.ts --project=chromium
```

Expected: PASS for all three navigation scenarios.

- [ ] **Step 5: Commit the navigation coverage**

Run:

```bash
git add apps/web-e2e/tests/navigation.spec.ts
git commit -m "test: cover web navigation flows"
```

### Task 5: Implement UI State Coverage

**Files:**
- Create: `apps/web-e2e/tests/ui-state.spec.ts`
- Modify: `apps/web-e2e/pages/settings.page.ts`

- [ ] **Step 1: Write the failing UI state spec**

Create `apps/web-e2e/tests/ui-state.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { appRoutes } from "../helpers/routes";
import { storageKeys } from "../helpers/storage";

test("switches to dark theme and persists the preference", async ({ page, settings }) => {
  await page.goto(appRoutes.dashboard);

  await settings.selectTheme("深色");

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), storageKeys.themeMode)).toBe("dark");

  await page.reload();

  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("switches language to English and keeps the locale after reload", async ({ page, settings }) => {
  await page.goto(appRoutes.dashboard);

  await settings.selectLocale("English");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), storageKeys.locale)).toBe("en-US");

  await page.reload();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

- [ ] **Step 2: Run the spec and confirm it fails**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e tests/ui-state.spec.ts --project=chromium
```

Expected: FAIL until the page object supports the exact menu interactions and the assertions match the current app copy.

- [ ] **Step 3: Refine the settings page object if menu interactions are flaky**

Update `apps/web-e2e/pages/settings.page.ts` so selections always wait on visible menu items:

```ts
import { expect, type Locator, type Page } from "@playwright/test";

export class SettingsPage {
  readonly themeToggle: Locator;
  readonly languageToggle: Locator;

  constructor(private readonly page: Page) {
    this.themeToggle = page.getByTestId("theme-toggle");
    this.languageToggle = page.getByTestId("language-toggle");
  }

  async selectTheme(label: string) {
    await this.themeToggle.click();
    const option = this.page.getByRole("menuitemradio", { name: label });
    await expect(option).toBeVisible();
    await option.click();
  }

  async selectLocale(label: string) {
    await this.languageToggle.click();
    const option = this.page.getByRole("menuitemradio", { name: label });
    await expect(option).toBeVisible();
    await option.click();
  }
}
```

- [ ] **Step 4: Run the UI state spec again and verify it passes**

Run:

```bash
pnpm --filter @repo/web-e2e test:e2e tests/ui-state.spec.ts --project=chromium
```

Expected: PASS for theme persistence and locale persistence.

- [ ] **Step 5: Commit the UI state coverage**

Run:

```bash
git add apps/web-e2e/tests/ui-state.spec.ts apps/web-e2e/pages/settings.page.ts
git commit -m "test: cover web ui state flows"
```

### Task 6: Wire Workspace Scripts And Final Verification

**Files:**
- Modify: `package.json`
- Modify: `turbo.json`

- [ ] **Step 1: Add failing root-level commands to the plan**

Run:

```bash
pnpm test:e2e
```

Expected: FAIL because the root package does not expose an E2E command yet.

- [ ] **Step 2: Add root scripts**

Update `package.json`:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test:e2e": "pnpm --filter @repo/web-e2e test:e2e",
    "test:e2e:headed": "pnpm --filter @repo/web-e2e test:e2e:headed",
    "test:e2e:staging": "pnpm --filter @repo/web-e2e test:e2e:staging"
  }
}
```

- [ ] **Step 3: Add an explicit Turbo task**

Update `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test:e2e": {
      "cache": false,
      "dependsOn": []
    }
  }
}
```

- [ ] **Step 4: Run the focused verification commands**

Run:

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web-e2e exec playwright test --list
pnpm --filter @repo/web-e2e test:e2e tests/navigation.spec.ts --project=chromium
pnpm --filter @repo/web-e2e test:e2e tests/ui-state.spec.ts --project=chromium
```

Expected: all commands PASS.

- [ ] **Step 5: Run the final aggregated verification**

Run:

```bash
pnpm test:e2e
```

Expected: PASS and an HTML report is generated under Playwright's default report output.

- [ ] **Step 6: Commit the integration wiring**

Run:

```bash
git add package.json turbo.json
git commit -m "build: wire web e2e commands"
```

## Self-Review

- Spec coverage: the plan covers workspace creation, environment switching, stable selectors, page objects, navigation coverage, UI state coverage, and root-level command wiring.
- Placeholder scan: no `TODO`, `TBD`, or undefined implementation steps remain; each task includes explicit files, commands, and code snippets.
- Type consistency: the plan consistently uses `@repo/web-e2e`, `AppShellPage`, `SettingsPage`, `appRoutes`, `storageKeys`, `E2E_MODE`, and `E2E_BASE_URL`.
