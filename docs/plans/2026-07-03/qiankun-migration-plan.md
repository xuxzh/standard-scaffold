# Qiankun Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `standard-scaffold/apps/web` 从 MES `rh-mes-frontend` 中的 wujie 嵌入方式迁移为 qiankun 嵌入方式，并先用包装类型页面完成可回滚 POC。

**Architecture:** 保留 MES 现有 Angular 路由结构，用新的 `QiankunWrapperComponent` 在路由组件生命周期内调用 qiankun `loadMicroApp` 手动挂载。子应用继续保持 standalone 能力，在 qiankun 环境下通过生命周期函数接收 `hostContext`、`initialPath` 和后续 `update(props)` 推送。

**Tech Stack:** Angular 16 + Nx + qiankun 2.10.x；React 19 + Vite 7 + TypeScript + Vitest + vite-plugin-qiankun-lite；pnpm workspace。

## Global Constraints

- 变更级别：L2，跨父/子应用边界、启动入口、构建配置、运行时通信协议。
- 禁止在 `main` / `master` 直接修改业务代码；执行前必须先创建独立分支或 `.worktrees/` 隔离工作区。
- 父应用仓库：`/Users/xuxz/repos/ruihui/rh-standard-product-platform`，默认稳定分支 `master`。
- 子应用仓库：`/Users/xuxz/repos/ruihui/standard-scaffold`，默认稳定分支 `main`。
- 父应用当前主工作树可能已有无关未提交改动；执行时不得覆盖、暂存、提交这些改动。
- 第一阶段只迁移 `standard-scaffold/apps/web` 对应的 6 个包装页面；不迁移安灯 `environment.subAppBaseUrl` 旧子应用。
- 第一阶段优先用 `loadMicroApp` 手动挂载，不用 `registerMicroApps` 全局路由注册。
- 子应用 `apps/web` 必须继续支持 standalone 运行、测试和构建。
- 子应用 provider 顺序保持 `HostContextProvider -> I18nProvider -> ThemeProvider -> QueryClientProvider -> RouterProvider + Toaster`。
- 文档、注释和计划优先中文；代码内新增用户可见文案不得直接写中文，需走现有 i18n。
- 命令统一使用 `pnpm`，探索/执行 shell 命令按本机约定加 `rtk` 前缀。

---

## File Structure

### Parent App: `rh-standard-product-platform`

- Modify: `package.json`
  - Remove/keep decision for `wujie` happens after POC. First phase adds `qiankun` and keeps `wujie` so old 安灯子应用不受影响。
- Create: `apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/qiankun-wrapper.component.ts`
  - Angular standalone route component. Reads route data, mounts/unmounts qiankun micro app, pushes host context through props/update.
- Create: `apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/micro-host-context.service.ts`
  - Neutral replacement for `WujieHostContextService`, exposes same context shape without wujie naming.
- Modify: `apps/rh-mes-frontend/src/app/routes/main/factory-modelling/factory-modelling.routes.ts`
  - Switch only the 6 packaging routes from `WujieWrapperComponent` to `QiankunWrapperComponent`.
- Modify: `apps/rh-mes-frontend/src/app/app.component.ts`
  - Keep existing wujie preload for 安灯. Add qiankun prefetch for scaffold entry if POC confirms value; otherwise defer.
- Modify: `apps/rh-mes-frontend/src/app/core/init/start-i18n.service.ts`
  - Inject `MicroHostContextService` and call `notifyHostContextChanged`.
- Modify: `apps/rh-mes-frontend/src/app/routes/main/main.service.ts`
  - Inject `MicroHostContextService` and call `notifyHostContextChanged`.
- Test: `apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/qiankun-wrapper.component.spec.ts`
  - Verifies `loadMicroApp`, `update`, `unmount`, and route data mapping.
- Test: `apps/rh-mes-frontend/src/app/app.component.spec.ts`
  - Adjust mocks if qiankun prefetch is introduced.

### Child App: `standard-scaffold`

- Modify: `package.json`
  - Add `vite-plugin-qiankun-lite` dev dependency.
- Modify: `apps/web/vite.config.ts`
  - Add qiankun Vite plugin with app name `scaffold-web`.
- Modify: `apps/web/src/main.tsx`
  - Replace wujie lifecycle detection with qiankun lifecycle exports while preserving standalone bootstrap.
- Modify: `apps/web/src/lib/host-context/host-context-source.ts`
  - Replace `window.__WUJIE` bus reading with local external store updated by qiankun `mount/update` props.
- Modify: `apps/web/src/lib/host-context/host-context-types.ts`
  - Rename comments from wujie-specific to host-neutral; add qiankun prop types.
- Modify: `apps/web/src/lib/auth/host-token-bridge.ts`
  - Rename detection from `isRunningInWujie` to `isRunningInMicroHost`; continue mapping `hostContext.userSession` to token store.
- Modify: `apps/web/src/lib/auth/auth-embed.ts`
  - Replace wujie-specific branch with qiankun/micro-host branch.
- Modify: `apps/web/src/styles.css`
  - Replace `html[data-wujie]` selectors with `html[data-micro-host]`. Keep old selector temporarily only if tests prove rollback compatibility is needed.
- Test: `apps/web/src/main.test.tsx`
  - Replace wujie bootstrap tests with qiankun mount/unmount/update tests.
- Test: `apps/web/src/lib/host-context/*.test.ts`
  - Add or update tests for initial props, subscription, update, and standalone no-op.
- Test: `apps/web/src/lib/auth/*.test.ts`
  - Update mocked globals and expectations from wujie to qiankun/micro-host.

---

### Task 0: Create Isolated Branches And Worktrees

**Files:**
- No code files modified.
- Worktrees created under each repository's `.worktrees/`.

**Interfaces:**
- Consumes: clean `main` in `standard-scaffold`, clean `master` in `rh-standard-product-platform`.
- Produces: two isolated worktrees, both on branch `codex-qiankun-migration`.

- [x] **Step 1: Inspect both repositories before branching**

```bash
rtk git -C /Users/xuxz/repos/ruihui/standard-scaffold status --short
rtk git -C /Users/xuxz/repos/ruihui/rh-standard-product-platform status --short
```

Expected:
- `standard-scaffold` should be clean or contain only this plan document if the plan was created before execution.
- `rh-standard-product-platform` may show the existing unrelated IMICS file. Do not stage or modify it.

- [x] **Step 2: Create child-app worktree**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold
rtk git worktree add .worktrees/codex-qiankun-migration -b codex-qiankun-migration main
```

Expected: `.worktrees/codex-qiankun-migration` exists and `git branch --show-current` inside it returns `codex-qiankun-migration`.

- [x] **Step 3: Create parent-app worktree**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform
rtk git worktree add .worktrees/codex-qiankun-migration -b codex-qiankun-migration master
```

Expected: `.worktrees/codex-qiankun-migration` exists and `git branch --show-current` inside it returns `codex-qiankun-migration`.

- [x] **Step 4: Confirm implementation paths**

```bash
rtk git -C /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration branch --show-current
rtk git -C /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration branch --show-current
```

Expected: both commands print `codex-qiankun-migration`.

- [x] **Step 5: Commit plan document if it is not already committed**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold
rtk git status --short docs/plans/2026-07-03/qiankun-migration-plan.md
rtk git add docs/plans/2026-07-03/qiankun-migration-plan.md
rtk git commit -m "docs: add qiankun migration plan"
```

Expected: commit succeeds if the plan file is uncommitted. If it was already committed, skip this step.

---

### Task 1: Add Qiankun Dependency To Parent App

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/package.json`
- Modify: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/pnpm-lock.yaml`

**Interfaces:**
- Consumes: parent worktree from Task 0.
- Produces: `qiankun` importable by Angular app code.

- [x] **Step 1: Add dependency**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm add qiankun@^2.10.16
```

Expected: `package.json` contains `"qiankun": "^2.10.16"` and lockfile updates.

- [x] **Step 2: Verify package resolution**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm list qiankun --depth 0
```

Expected: output includes `qiankun 2.10.x`.

- [x] **Step 3: Commit**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk git add package.json pnpm-lock.yaml
rtk git commit -m "chore: add qiankun dependency"
```

Expected: commit succeeds with only dependency files staged.

---

### Task 2: Add Vite Qiankun Adapter To Child App

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/package.json`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/pnpm-lock.yaml`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/vite.config.ts`

**Interfaces:**
- Consumes: child worktree from Task 0.
- Produces: Vite build/dev output compatible with qiankun for app name `scaffold-web`.

- [x] **Step 1: Add Vite plugin**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm add -D vite-plugin-qiankun-lite@^1.3.0 --filter @repo/web
```

Expected: `apps/web/package.json` or workspace lockfile reflects the new dev dependency according to pnpm's workspace behavior.

- [x] **Step 2: Update Vite config**

In `apps/web/vite.config.ts`, import the plugin:

```ts
import qiankun from "vite-plugin-qiankun-lite";
```

Change the plugins line from:

```ts
plugins: [react(), tailwindcss()],
```

to:

```ts
plugins: [
  react(),
  tailwindcss(),
  qiankun({
    name: "scaffold-web",
    sandbox: true,
  }),
],
```

Keep the existing `server.host`, `server.cors`, `server.headers`, `server.origin`, `server.hmr`, `proxy`, `build.rollupOptions`, and `resolve.alias` blocks unchanged.

- [x] **Step 3: Typecheck Vite config**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web typecheck
```

Expected: TypeScript completes without errors from `vite.config.ts` or plugin types.

- [x] **Step 4: Commit**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk git add apps/web/package.json package.json pnpm-lock.yaml apps/web/vite.config.ts
rtk git commit -m "chore: add qiankun vite adapter"
```

Expected: commit includes only dependency and Vite config changes.

---

### Task 3: Convert Child Host Context Store To Qiankun Props

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/host-context/host-context-types.ts`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/host-context/host-context-source.ts`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/host-context/host-context-provider.tsx`
- Test: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/host-context/host-context-source.test.ts`

**Interfaces:**
- Produces:
  - `type MicroHostProps = { hostContext?: HostContextValue | null; initialPath?: string }`
  - `isRunningInMicroHost(): boolean`
  - `readInitialHostContext(): HostContextValue | null`
  - `subscribeHostContext(listener: HostContextListener): () => void`
  - `applyMicroHostProps(props: MicroHostProps): void`

- [x] **Step 1: Write failing host-context tests**

Create `apps/web/src/lib/host-context/host-context-source.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyMicroHostProps,
  isRunningInMicroHost,
  readInitialHostContext,
  resetMicroHostContextForTest,
  subscribeHostContext,
} from "./host-context-source";
import type { HostContextValue } from "./host-context-types";

function makeContext(currentLang: string): HostContextValue {
  return {
    userInfo: null,
    menuInfo: [],
    functions: [],
    menuFunctions: [],
    roles: [],
    languageInfo: {
      currentLang,
      defaultLang: "zh_CN",
    },
    languageDict: {},
    userSession: null,
  };
}

describe("host-context-source qiankun store", () => {
  afterEach(() => {
    resetMicroHostContextForTest();
  });

  it("reports standalone before qiankun props are applied", () => {
    expect(isRunningInMicroHost()).toBe(false);
    expect(readInitialHostContext()).toBeNull();
  });

  it("stores the latest hostContext from qiankun props", () => {
    const ctx = makeContext("en_US");

    applyMicroHostProps({ hostContext: ctx, initialPath: "/embed/packaging/packaging-type" });

    expect(isRunningInMicroHost()).toBe(true);
    expect(readInitialHostContext()).toBe(ctx);
  });

  it("notifies subscribers when qiankun props update", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHostContext(listener);
    const ctx = makeContext("vi_VN");

    applyMicroHostProps({ hostContext: ctx });

    expect(listener).toHaveBeenCalledWith(ctx);
    unsubscribe();
    applyMicroHostProps({ hostContext: makeContext("zh_CN") });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 2: Run test to verify failure**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web test -- src/lib/host-context/host-context-source.test.ts
```

Expected: FAIL because `applyMicroHostProps` and `resetMicroHostContextForTest` do not exist yet.

- [x] **Step 3: Implement host-context source**

Replace `apps/web/src/lib/host-context/host-context-source.ts` with:

```ts
import type { HostContextValue, MicroHostProps } from "./host-context-types";

let runningInMicroHost = false;
let currentHostContext: HostContextValue | null = null;
const listeners = new Set<HostContextListener>();

export type HostContextListener = (ctx: HostContextValue | null) => void;

export function isRunningInMicroHost(): boolean {
  return runningInMicroHost;
}

export function readInitialHostContext(): HostContextValue | null {
  return currentHostContext;
}

export function subscribeHostContext(listener: HostContextListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyMicroHostProps(props: MicroHostProps): void {
  runningInMicroHost = true;
  currentHostContext = props.hostContext ?? null;
  for (const listener of listeners) {
    listener(currentHostContext);
  }
}

export function resetMicroHostContextForTest(): void {
  runningInMicroHost = false;
  currentHostContext = null;
  listeners.clear();
}
```

Update `apps/web/src/lib/host-context/host-context-types.ts` by adding:

```ts
export interface MicroHostProps {
  hostContext?: HostContextValue | null;
  initialPath?: string;
}
```

Keep the existing `HostContextValue` shape unchanged.

- [x] **Step 4: Update provider import references**

In `apps/web/src/lib/host-context/host-context-provider.tsx`, no behavior change is needed if it already imports `readInitialHostContext` and `subscribeHostContext`. Update comments to say "micro host" instead of "wujie".

- [x] **Step 5: Run host-context tests**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web test -- src/lib/host-context/host-context-source.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk git add apps/web/src/lib/host-context
rtk git commit -m "refactor: store micro host context from qiankun props"
```

Expected: commit includes host-context source, types, provider comments, and tests.

---

### Task 4: Convert Child Bootstrap From Wujie Hooks To Qiankun Lifecycles

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/main.tsx`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/main.test.tsx`

**Interfaces:**
- Consumes: `applyMicroHostProps(props: MicroHostProps)` from Task 3.
- Produces: qiankun lifecycle hooks exposed by `vite-plugin-qiankun-lite`.

- [x] **Step 1: Update main bootstrap test**

Replace wujie-specific expectations in `apps/web/src/main.test.tsx` with tests that verify:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/host-token-bridge", () => ({
  disposeHostTokenBridge: vi.fn(),
}));

vi.mock("@/root-app", () => ({
  App: ({ initialEntries }: { initialEntries?: string[] }) => (
    <div data-testid="app">{initialEntries?.[0] ?? "standalone"}</div>
  ),
}));

describe("main qiankun bootstrap", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-micro-host");
    vi.resetModules();
  });

  it("renders standalone when not mounted by qiankun", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    expect(document.querySelector("[data-testid='app']")?.textContent).toBe("standalone");
  });
});
```

If `vite-plugin-qiankun-lite` exposes lifecycle helpers that can be invoked directly in tests, add mount/unmount/update tests in the same file. If the helper is not test-friendly, keep lifecycle behavior covered by extracting local `render` and `disposeRoot` functions.

- [x] **Step 2: Run test to verify failure**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web test -- src/main.test.tsx
```

Expected: FAIL until main bootstrap is converted.

- [x] **Step 3: Implement qiankun lifecycle**

In `apps/web/src/main.tsx`, replace wujie globals with qiankun plugin helpers. The resulting structure should be:

```ts
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { disposeHostTokenBridge } from "@/lib/auth/host-token-bridge";
import { applyMicroHostProps } from "@/lib/host-context";
import type { MicroHostProps } from "@/lib/host-context";
import { App } from "./root-app";
import { isApiMockingEnabled } from "./mocks/config";
import "./styles.css";

let currentRoot: Root | null = null;
let currentRootElement: HTMLElement | null = null;
let currentInitialEntries: string[] | undefined;

async function enableApiMocking() {
  if (!isApiMockingEnabled()) {
    return;
  }

  const { worker } = await import("./mocks/browser");

  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

function render(container: ParentNode = document, initialEntries?: string[]) {
  const rootEl = container.querySelector<HTMLElement>("#root");
  if (!rootEl) {
    return;
  }

  if (currentRoot && currentRootElement === rootEl) {
    return;
  }

  currentRoot?.unmount();
  currentInitialEntries = initialEntries;
  currentRoot = createRoot(rootEl);
  currentRootElement = rootEl;
  currentRoot.render(
    <StrictMode>
      <App initialEntries={currentInitialEntries} />
    </StrictMode>,
  );
}

function disposeRoot() {
  disposeHostTokenBridge();
  currentRoot?.unmount();
  currentRoot = null;
  currentRootElement = null;
  currentInitialEntries = undefined;
}

function initialEntriesFromProps(props: MicroHostProps): string[] | undefined {
  return props.initialPath ? [props.initialPath] : undefined;
}

export async function bootstrap() {}

export async function mount(props: MicroHostProps & { container?: ParentNode }) {
  document.documentElement.setAttribute("data-micro-host", "");
  applyMicroHostProps(props);
  render(props.container ?? document, initialEntriesFromProps(props));
}

export async function update(props: MicroHostProps) {
  applyMicroHostProps(props);
}

export async function unmount() {
  document.documentElement.removeAttribute("data-micro-host");
  disposeRoot();
}

if (!(window as Window & { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__) {
  void enableApiMocking().then(() => render());
}
```

If `vite-plugin-qiankun-lite` requires a different export helper, adapt only the lifecycle export lines and keep the local `render/update/unmount` semantics identical.

- [x] **Step 4: Run main bootstrap tests**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web test -- src/main.test.tsx
```

Expected: PASS.

- [x] **Step 5: Run child typecheck**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web typecheck
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk git add apps/web/src/main.tsx apps/web/src/main.test.tsx
rtk git commit -m "refactor: expose qiankun lifecycles"
```

Expected: commit includes only bootstrap and related tests.

---

### Task 5: Update Child Auth Bridge From Wujie To Micro Host

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/auth/host-token-bridge.ts`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/auth/auth-embed.ts`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/auth/host-token-bridge.test.ts`
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/lib/auth/auth-embed.test.ts`

**Interfaces:**
- Consumes: `isRunningInMicroHost`, `readInitialHostContext`, `subscribeHostContext`.
- Produces: auth token acquisition from qiankun props/update.

- [x] **Step 1: Update tests to use micro host props**

In auth tests, replace any mocked `window.__POWERED_BY_WUJIE__` and `window.__WUJIE` setup with calls to:

```ts
import { applyMicroHostProps, resetMicroHostContextForTest } from "@/lib/host-context";
```

Use:

```ts
applyMicroHostProps({
  hostContext: {
    userInfo: null,
    menuInfo: [],
    functions: [],
    menuFunctions: [],
    roles: [],
    languageInfo: {
      currentLang: "zh_CN",
      defaultLang: "zh_CN",
    },
    languageDict: {},
    userSession: {
      Token: {
        AccessToken: "qiankun-access",
        RefreshToken: "qiankun-refresh",
        ExpiresIn: 7200,
        TokenType: "Bearer",
      },
    },
  },
});
```

Expected assertions should use `qiankun-access` instead of `wujie-access`.

- [x] **Step 2: Run auth tests to verify failure**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web test -- src/lib/auth/host-token-bridge.test.ts src/lib/auth/auth-embed.test.ts
```

Expected: FAIL until auth code imports the new micro host detection.

- [x] **Step 3: Update auth bridge imports and comments**

In `host-token-bridge.ts` and `auth-embed.ts`, replace:

```ts
isRunningInWujie
```

with:

```ts
isRunningInMicroHost
```

Keep `readInitialHostContext`, `subscribeHostContext`, and token mapping behavior unchanged. Update comments to say "micro host" or "qiankun host" instead of "wujie".

- [x] **Step 4: Run auth tests**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web test -- src/lib/auth/host-token-bridge.test.ts src/lib/auth/auth-embed.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk git add apps/web/src/lib/auth apps/web/src/lib/host-context
rtk git commit -m "refactor: read auth context from qiankun props"
```

Expected: commit includes auth bridge and tests.

---

### Task 6: Replace Wujie-Specific Child Styles With Micro Host Styles

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/apps/web/src/styles.css`
- Modify comments only if needed: dialog and alert dialog files under `apps/web/src/components/ui/`

**Interfaces:**
- Consumes: `data-micro-host` attribute set by Task 4.
- Produces: scroll-lock compensation still works without wujie naming.

- [x] **Step 1: Update CSS selector**

In `apps/web/src/styles.css`, replace:

```css
html[data-wujie] body[data-scroll-locked] {
```

with:

```css
html[data-micro-host] body[data-scroll-locked] {
```

Update the block comment to explain qiankun/non-iframe embedding and body scroll-lock compensation. Keep the CSS declarations unchanged:

```css
html[data-micro-host] body[data-scroll-locked] {
  margin-right: 0 !important;
  margin-left: 0 !important;
  margin-top: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  padding-top: 0 !important;
}
```

- [x] **Step 2: Search for remaining wujie references in child code**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk rg -n "wujie|Wujie|__WUJIE|__POWERED_BY_WUJIE__|data-wujie|__WUJIE_MOUNT__|__WUJIE_UNMOUNT__" apps/web/src
```

Expected: no runtime references remain. Historical comments may remain only if they describe previous behavior in tests or migration docs; prefer updating comments touched by this task.

- [x] **Step 3: Run child tests**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web test
```

Expected: PASS.

- [x] **Step 4: Commit**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk git add apps/web/src/styles.css apps/web/src/components/ui/dialog.tsx apps/web/src/components/ui/alert-dialog.tsx
rtk git commit -m "refactor: remove wujie-specific style hooks"
```

Expected: commit succeeds. If dialog files did not change, omit them from `git add`.

---

### Task 7: Add Parent Micro Host Context Service

**Files:**
- Create: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/micro-host-context.service.ts`
- Test: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/micro-host-context.service.spec.ts`

**Interfaces:**
- Produces:
  - `MicroHostContext` interface, same fields as existing `WujieHostContext`.
  - `MicroHostContextService.buildContext(): MicroHostContext`
  - `MicroHostContextService.buildProps(extraProps?: Record<string, unknown>): Record<string, unknown>`
  - `MicroHostContextService.contextChanges$: Observable<MicroHostContext>`
  - `MicroHostContextService.notifyHostContextChanged(): void`

- [x] **Step 1: Create failing service test**

Create `micro-host-context.service.spec.ts` with a focused test:

```ts
import { TestBed } from '@angular/core/testing';
import { AppService } from '@core';
import { RhI18nService } from 'rh-base/core';
import { MicroHostContextService } from './micro-host-context.service';

describe('MicroHostContextService', () => {
  it('builds hostContext props from user session and i18n state', () => {
    TestBed.configureTestingModule({
      providers: [
        MicroHostContextService,
        {
          provide: AppService,
          useValue: {
            getUserSession: () => ({
              User: { UserName: 'tester' },
              RelativeMenuDatas: {
                Menus: [{ MenuCode: 'M1' }],
                Functions: [{ FunctionCode: 'F1' }],
                MenuFunctions: [{ MenuCode: 'M1', FunctionCode: 'F1' }]
              },
              Roles: [{ RoleCode: 'R1' }],
              Token: { AccessToken: 'token' }
            })
          }
        },
        {
          provide: RhI18nService,
          useValue: {
            currentLang: 'zh_CN',
            defaultLang: 'zh_CN',
            _locale: { hello: '你好' }
          }
        }
      ]
    });

    const service = TestBed.inject(MicroHostContextService);
    const props = service.buildProps({ initialPath: '/embed/packaging/packaging-type' });

    expect(props['initialPath']).toBe('/embed/packaging/packaging-type');
    expect(props['hostContext']).toMatchObject({
      userInfo: { UserName: 'tester' },
      menuInfo: [{ MenuCode: 'M1' }],
      functions: [{ FunctionCode: 'F1' }],
      menuFunctions: [{ MenuCode: 'M1', FunctionCode: 'F1' }],
      roles: [{ RoleCode: 'R1' }],
      languageInfo: {
        currentLang: 'zh_CN',
        defaultLang: 'zh_CN'
      },
      languageDict: { hello: '你好' }
    });
  });
});
```

- [x] **Step 2: Run test to verify failure**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm nx test rh-mes-frontend --skipNxCache --runInBand --outputStyle=static --testFile=apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/micro-host-context.service.spec.ts
```

Expected: FAIL because service file does not exist.

- [x] **Step 3: Implement service**

Create `micro-host-context.service.ts` by copying the behavior of existing `WujieHostContextService`, renaming types to `MicroHostContext`, and replacing window events with an RxJS `Subject`:

```ts
import { Injectable } from '@angular/core';
import { AppService } from '@core';
import { RhSafeAny } from 'rh-base/model';
import { RhI18nService } from 'rh-base/core';
import { Subject } from 'rxjs';

export interface MicroHostContext {
  userInfo: RhSafeAny | null;
  menuInfo: RhSafeAny[];
  functions: RhSafeAny[];
  menuFunctions: RhSafeAny[];
  roles: RhSafeAny[];
  languageInfo: {
    currentLang: string;
    defaultLang: string;
  };
  languageDict: Record<string, unknown>;
  userSession: RhSafeAny | null;
}

@Injectable({
  providedIn: 'root'
})
export class MicroHostContextService {
  private readonly contextChangesSubject = new Subject<MicroHostContext>();
  readonly contextChanges$ = this.contextChangesSubject.asObservable();

  constructor(private readonly appService: AppService, private readonly i18nService: RhI18nService) {}

  private asLanguageDict(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private getLanguageDict(): Record<string, unknown> {
    const i18nService = this.i18nService as RhSafeAny;

    return this.asLanguageDict(i18nService?._locale) || {};
  }

  buildContext(): MicroHostContext {
    const userSession = (this.appService.getUserSession(true) || this.appService.getUserSession() || null) as RhSafeAny;

    return {
      userInfo: userSession?.User || null,
      menuInfo: userSession?.RelativeMenuDatas?.Menus || [],
      functions: userSession?.RelativeMenuDatas?.Functions || [],
      menuFunctions: userSession?.RelativeMenuDatas?.MenuFunctions || [],
      roles: userSession?.Roles || [],
      languageInfo: {
        currentLang: this.i18nService.currentLang || this.i18nService.defaultLang || 'zh_CN',
        defaultLang: this.i18nService.defaultLang || 'zh_CN'
      },
      languageDict: this.getLanguageDict(),
      userSession
    };
  }

  buildProps(extraProps: Record<string, unknown> = {}) {
    return {
      ...extraProps,
      hostContext: this.buildContext()
    };
  }

  notifyHostContextChanged() {
    this.contextChangesSubject.next(this.buildContext());
  }
}
```

- [x] **Step 4: Run service test**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm nx test rh-mes-frontend --skipNxCache --runInBand --outputStyle=static --testFile=apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/micro-host-context.service.spec.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk git add apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper
rtk git commit -m "feat: add micro host context service"
```

Expected: commit includes service and service test.

---

### Task 8: Add Parent Qiankun Wrapper Component

**Files:**
- Create: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/qiankun-wrapper.component.ts`
- Test: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/qiankun-wrapper.component.spec.ts`

**Interfaces:**
- Consumes: `MicroHostContextService.buildProps()` and `contextChanges$`.
- Produces: route component accepting `data.name`, `data.entry`, `data.initialPath`, `data.alive`, `data.props`.

- [x] **Step 1: Create failing wrapper test**

Create `qiankun-wrapper.component.spec.ts` that mocks `qiankun`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { loadMicroApp } from 'qiankun';
import { QiankunWrapperComponent } from './qiankun-wrapper.component';
import { MicroHostContextService } from './micro-host-context.service';

jest.mock('qiankun', () => ({
  loadMicroApp: jest.fn()
}));

describe('QiankunWrapperComponent', () => {
  let fixture: ComponentFixture<QiankunWrapperComponent>;
  const contextChanges = new Subject<unknown>();
  const microApp = {
    update: jest.fn(),
    unmount: jest.fn()
  };

  beforeEach(async () => {
    jest.mocked(loadMicroApp).mockReturnValue(microApp as never);

    await TestBed.configureTestingModule({
      imports: [QiankunWrapperComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: new Subject()
          }
        },
        {
          provide: MicroHostContextService,
          useValue: {
            contextChanges$: contextChanges.asObservable(),
            buildProps: (extra: Record<string, unknown> = {}) => ({
              ...extra,
              hostContext: { userSession: { Token: { AccessToken: 'token' } } }
            })
          }
        }
      ]
    }).compileComponents();
  });

  it('loads qiankun micro app from route data and updates host context', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.data as Subject<unknown>).next({
      name: 'scaffold-web',
      entry: 'http://localhost:5173',
      initialPath: '/embed/packaging/packaging-type',
      alive: false
    });

    fixture = TestBed.createComponent(QiankunWrapperComponent);
    fixture.detectChanges();

    expect(loadMicroApp).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'scaffold-web',
        entry: 'http://localhost:5173',
        props: expect.objectContaining({
          initialPath: '/embed/packaging/packaging-type'
        })
      }),
      expect.objectContaining({
        sandbox: expect.objectContaining({
          experimentalStyleIsolation: true
        })
      })
    );

    contextChanges.next({ userSession: null });
    expect(microApp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        hostContext: { userSession: null }
      })
    );
  });

  afterEach(() => {
    fixture?.destroy();
    jest.clearAllMocks();
  });
});
```

- [x] **Step 2: Run wrapper test to verify failure**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm nx test rh-mes-frontend --skipNxCache --runInBand --outputStyle=static --testFile=apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/qiankun-wrapper.component.spec.ts
```

Expected: FAIL because component file does not exist.

- [x] **Step 3: Implement wrapper component**

Create `qiankun-wrapper.component.ts`:

```ts
import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { loadMicroApp, type MicroApp } from 'qiankun';
import { Subject, takeUntil } from 'rxjs';
import { MicroHostContextService } from './micro-host-context.service';

@Component({
  selector: 'app-qiankun-wrapper',
  template: '<div #qiankunContainer class="qiankun-container"></div>',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .qiankun-container {
        width: 100%;
        height: 100%;
        overflow: auto;
      }
    `
  ],
  standalone: true
})
export class QiankunWrapperComponent implements AfterViewInit, OnDestroy {
  @Input() name?: string;
  @Input() entry?: string;
  @Input() initialPath?: string;
  @Input() alive = false;
  @Input() props: Record<string, unknown> = {};

  @ViewChild('qiankunContainer', { static: true }) qiankunContainer!: ElementRef<HTMLElement>;

  private actualName = '';
  private actualEntry = '';
  private actualInitialPath = '';
  private microApp?: MicroApp;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private hostContextService: MicroHostContextService
  ) {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.actualName = this.name || data['name'] || '';
      this.actualEntry = this.entry || data['entry'] || data['url'] || '';
      this.actualInitialPath = this.initialPath || data['initialPath'] || '';
      if (data['alive'] !== undefined) {
        this.alive = data['alive'];
      }
      if (data['props']) {
        this.props = { ...this.props, ...data['props'] };
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.actualName || !this.actualEntry) {
      console.error('QiankunWrapper: name and entry are required. Please provide them via @Input or route data.');
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.microApp = loadMicroApp(
        {
          name: this.actualName,
          entry: this.actualEntry,
          container: this.qiankunContainer.nativeElement,
          props: this.buildProps()
        },
        {
          sandbox: {
            experimentalStyleIsolation: true
          },
          singular: false
        }
      );

      this.hostContextService.contextChanges$.pipe(takeUntil(this.destroy$)).subscribe((context) => {
        this.microApp?.update?.(
          this.hostContextService.buildProps({
            ...this.props,
            initialPath: this.actualInitialPath,
            hostContext: context
          })
        );
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (!this.alive) {
      void this.microApp?.unmount();
    }
  }

  private buildProps() {
    return this.hostContextService.buildProps({
      ...this.props,
      initialPath: this.actualInitialPath
    });
  }
}
```

- [x] **Step 4: Run wrapper tests**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm nx test rh-mes-frontend --skipNxCache --runInBand --outputStyle=static --testFile=apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper/qiankun-wrapper.component.spec.ts
```

Expected: PASS. If TypeScript reports `MicroApp` type incompatibility, adjust to the exact exported qiankun type or use a local minimal interface with `update?: (props: Record<string, unknown>) => Promise<unknown> | unknown` and `unmount: () => Promise<unknown> | unknown`.

- [x] **Step 5: Commit**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk git add apps/rh-mes-frontend/src/app/shared/components/qiankun-wrapper
rtk git commit -m "feat: add qiankun wrapper component"
```

Expected: commit includes wrapper component and tests.

---

### Task 9: Switch Packaging Routes To Qiankun Wrapper

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/routes/main/factory-modelling/factory-modelling.routes.ts`

**Interfaces:**
- Consumes: `QiankunWrapperComponent`.
- Produces: 6 packaging routes loading `standard-scaffold/apps/web` via qiankun.

- [x] **Step 1: Replace route component imports lazily**

In each packaging route, replace:

```ts
loadComponent: () => import('@shared/components/wujie-wrapper/wujie-wrapper.component').then((m) => m.WujieWrapperComponent),
data: {
  name: 'packaging-type',
  url: `${environment.scaffoldWebUrl}/embed/packaging/packaging-type`,
  alive: false,
  sync: false
}
```

with:

```ts
loadComponent: () => import('@shared/components/qiankun-wrapper/qiankun-wrapper.component').then((m) => m.QiankunWrapperComponent),
data: {
  name: 'scaffold-web-packaging-type',
  entry: environment.scaffoldWebUrl,
  initialPath: '/embed/packaging/packaging-type',
  alive: false
}
```

Use these route-specific names and paths:

```ts
[
  ['packaging-type', 'scaffold-web-packaging-type', '/embed/packaging/packaging-type'],
  ['packaging-level', 'scaffold-web-packaging-level', '/embed/packaging/packaging-level'],
  ['packaging-spec', 'scaffold-web-packaging-spec', '/embed/packaging/packaging-spec'],
  ['packaging-kit', 'scaffold-web-packaging-kit', '/embed/packaging/packaging-kit'],
  ['packaging-rule', 'scaffold-web-packaging-rule', '/embed/packaging/packaging-rule'],
  ['material-packaging-relation', 'scaffold-web-material-packaging-relation', '/embed/packaging/material-packaging-relation']
]
```

- [x] **Step 2: Run TypeScript compile for parent app**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm -s tsc -p apps/rh-mes-frontend/tsconfig.app.json --noEmit
```

Expected: PASS.

Execution note: the exact command failed in `@types/readable-stream`; rerunning with
`rtk proxy pnpm -s exec tsc -p apps/rh-mes-frontend/tsconfig.app.json --noEmit --skipLibCheck`
passed.

- [x] **Step 3: Commit**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk git add apps/rh-mes-frontend/src/app/routes/main/factory-modelling/factory-modelling.routes.ts
rtk git commit -m "feat: load packaging pages with qiankun"
```

Expected: commit includes only route changes.

---

### Task 10: Wire Parent Context Refresh To Neutral Service

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/core/init/start-i18n.service.ts`
- Modify: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/routes/main/main.service.ts`

**Interfaces:**
- Consumes: `MicroHostContextService.notifyHostContextChanged`.
- Produces: i18n and session refresh updates reaching qiankun child apps.

- [x] **Step 1: Replace imports**

In both files, replace:

```ts
import { WujieHostContextService } from '@shared/components/wujie-wrapper/wujie-host-context.service';
```

with:

```ts
import { MicroHostContextService } from '@shared/components/qiankun-wrapper/micro-host-context.service';
```

Replace constructor parameter types and property names:

```ts
private wujieHostContextSer: WujieHostContextService
```

with:

```ts
private microHostContextSer: MicroHostContextService
```

Replace calls:

```ts
this.wujieHostContextSer.notifyHostContextChanged();
```

with:

```ts
this.microHostContextSer.notifyHostContextChanged();
```

- [x] **Step 2: Run parent app tests or compile**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm -s tsc -p apps/rh-mes-frontend/tsconfig.app.json --noEmit
```

Expected: PASS.

Execution note: verified with
`rtk proxy pnpm -s exec tsc -p apps/rh-mes-frontend/tsconfig.app.json --noEmit --skipLibCheck`
because the exact command is blocked by third-party `@types/readable-stream` declarations.

- [x] **Step 3: Commit**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk git add apps/rh-mes-frontend/src/app/core/init/start-i18n.service.ts apps/rh-mes-frontend/src/app/routes/main/main.service.ts
rtk git commit -m "refactor: push host context through qiankun service"
```

Expected: commit includes only the two service consumers.

---

### Task 11: Optional Qiankun Prefetch For Scaffold Web

**Files:**
- Modify: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/app.component.ts`
- Modify: `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration/apps/rh-mes-frontend/src/app/app.component.spec.ts`

**Interfaces:**
- Consumes: `prefetchApps` from `qiankun`.
- Produces: preload of scaffold root entry only.

- [ ] **Step 1: Decide whether to implement**

Implement this task only after Task 9 opens the first packaging page successfully. Skip this task if first-load reliability is more important than warm loading during POC.

- [ ] **Step 2: Add import**

In `app.component.ts`, add:

```ts
import { prefetchApps } from 'qiankun';
```

Keep existing:

```ts
import { preloadApp } from 'wujie';
```

because 安灯 routes still use wujie in first phase.

- [ ] **Step 3: Add scaffold prefetch inside idle preload task**

After existing wujie preload calls, add:

```ts
prefetchApps([
  {
    name: 'scaffold-web',
    entry: environment.scaffoldWebUrl
  }
]);
```

Do not pass `hostContext` through prefetch. Runtime context is passed by wrapper `mount/update`.

- [ ] **Step 4: Update test mock**

In `app.component.spec.ts`, mock qiankun:

```ts
jest.mock('qiankun', () => ({
  prefetchApps: jest.fn()
}));
```

If the existing spec does not cover preload behavior, only add the mock to avoid import errors.

- [ ] **Step 5: Run app component tests**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm nx test rh-mes-frontend --skipNxCache --runInBand --outputStyle=static --testFile=apps/rh-mes-frontend/src/app/app.component.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit or explicitly skip**

If implemented:

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk git add apps/rh-mes-frontend/src/app/app.component.ts apps/rh-mes-frontend/src/app/app.component.spec.ts
rtk git commit -m "perf: prefetch scaffold qiankun entry"
```

If skipped, record the skip reason in the final implementation summary.

---

### Task 12: Local Integration Verification

**Files:**
- No required source edits.
- Temporary local environment edits are allowed only if not committed.

**Interfaces:**
- Consumes: parent and child worktrees with Tasks 1-10 complete.
- Produces: evidence that qiankun can mount at least one packaging route.

- [ ] **Step 1: Start child app**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web dev
```

Expected: Vite dev server starts on configured port, normally `http://localhost:5173`.

- [ ] **Step 2: Start parent MES app**

In a second terminal:

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm start:mes
```

Expected: Angular dev server starts.

- [ ] **Step 3: Open packaging type route manually**

Open MES in the browser, log in, then navigate to the MES route that maps to `factory-modelling/packaging-type`.

Expected:
- The page renders `standard-scaffold` content.
- Browser console does not show qiankun lifecycle errors.
- Network panel loads child `index.html` and JS/CSS assets from `environment.scaffoldWebUrl`.

- [ ] **Step 4: Inspect runtime flags**

In browser DevTools console while focused on the page:

```js
document.documentElement.hasAttribute("data-micro-host")
```

Expected: `true` inside the child app document context.

- [ ] **Step 5: Verify auth and host context**

In child app UI:
- Page should not redirect to `/login` or `/embed/auth-error`.
- API calls should carry the token mapped from MES `hostContext.userSession.Token`.
- If parent language/session refresh is triggered, the child should receive an `update(props)` call without remounting.

- [ ] **Step 6: Verify UI regressions**

On `packaging-type`, test:
- Open normal dialog.
- Open delete confirmation dialog.
- Use combobox/dropdown inside dialog.
- Scroll table/content area.
- Toggle fullscreen dialog if available.

Expected: clicks register normally, overlay does not block buttons, no horizontal body shift.

---

### Task 13: Automated Verification

**Files:**
- No required source edits unless tests reveal a defect.

**Interfaces:**
- Consumes: completed migration.
- Produces: passing verification commands for both repositories.

- [ ] **Step 1: Verify child web app**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web typecheck
rtk pnpm --filter @repo/web test
rtk pnpm --filter @repo/web lint
```

Expected: all PASS.

- [ ] **Step 2: Verify child production build**

```bash
cd /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration
rtk pnpm --filter @repo/web build
```

Expected: build succeeds and output under `apps/web/dist/ruihui-next` or configured dist path contains qiankun-compatible entry assets.

- [ ] **Step 3: Verify parent MES compile and tests**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm -s tsc -p apps/rh-mes-frontend/tsconfig.app.json --noEmit
rtk pnpm nx test rh-mes-frontend --skipNxCache --runInBand --outputStyle=static
```

Expected: both PASS.

- [ ] **Step 4: Verify parent production build if local time allows**

```bash
cd /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration
rtk pnpm build-site:mes
```

Expected: build succeeds. If it is too slow or fails for unrelated historical reasons, record exact failure output and run the narrower compile/test commands above.

---

### Task 14: Final Review And Rollback Notes

**Files:**
- Create or modify implementation note if needed:
  - `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/docs/plans/2026-07-03/qiankun-migration-result.md`

**Interfaces:**
- Produces: implementation summary with verification evidence and rollback path.

- [ ] **Step 1: Check diffs by repository**

```bash
rtk git -C /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration status --short
rtk git -C /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration status --short
rtk git -C /Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration log --oneline main..HEAD
rtk git -C /Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration log --oneline master..HEAD
```

Expected: only intended files changed; each repo has clear, reviewable commits.

- [ ] **Step 2: Record rollback path**

Rollback for POC:
- Parent: revert the route commit from Task 9 to return packaging pages to `WujieWrapperComponent`.
- Parent: keep `qiankun` dependency temporarily if rollback is urgent; remove dependency in a cleanup commit later.
- Child: qiankun lifecycle changes are backward-incompatible with wujie; rollback requires reverting Tasks 2-6 together.

- [ ] **Step 3: Prepare final handoff summary**

Include:
- Branch names and worktree paths.
- Changed route list.
- Verification commands and pass/fail results.
- Known risks: style isolation, Vite qiankun plugin behavior, production static server fallback.
- Decision on Task 11 prefetch implemented or skipped.

---

## Self-Review

- Spec coverage: Plan covers branch/worktree isolation, parent dependency, child Vite adapter, child lifecycle, hostContext/token bridge, CSS hooks, parent wrapper, route migration, refresh propagation, optional prefetch, manual integration, automated verification, and rollback.
- Placeholder scan: No task contains open-ended implementation placeholders. Optional Task 11 has an explicit skip condition and required summary if skipped.
- Type consistency: `MicroHostProps`, `HostContextValue`, `applyMicroHostProps`, `isRunningInMicroHost`, `MicroHostContextService`, and `QiankunWrapperComponent` names are consistent across tasks.
