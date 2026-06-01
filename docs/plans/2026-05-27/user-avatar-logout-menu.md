# User Avatar Logout Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a header avatar entry that shows the current username and supports confirmed logout inside the admin shell.

**Architecture:** Persist a minimal user display record alongside the existing token storage, then compose a dedicated `UserMenu` into `AppHeader`. Keep logout local-only by clearing both stores and reusing the existing login redirect helper. Validate the change with focused auth storage tests, login flow tests, and app-shell interaction tests.

**Tech Stack:** React 19, TypeScript, TanStack Router, react-i18next, Radix UI primitives, Vitest, Testing Library, pnpm

---

## File Structure

- Create: `apps/web/src/lib/auth/user-display-store.ts`
- Create: `apps/web/src/lib/auth/user-display-store.test.ts`
- Create: `apps/web/src/components/layout/user-menu.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/features/auth/login-page.tsx`
- Modify: `apps/web/src/features/auth/login-page.test.tsx`
- Modify: `apps/web/src/app.test.tsx`
- Modify: `apps/web/src/i18n/resources/zh-CN/auth.ts`
- Modify: `apps/web/src/i18n/resources/en-US/auth.ts`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`

### Task 1: Add Minimal User Display Storage

**Files:**
- Create: `apps/web/src/lib/auth/user-display-store.ts`
- Create: `apps/web/src/lib/auth/user-display-store.test.ts`

- [ ] **Step 1: Write the failing storage test**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearUserDisplay,
  getUserDisplay,
  setUserDisplay,
} from "@/lib/auth/user-display-store";

describe("user-display-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and clears the current user display", () => {
    setUserDisplay({
      userCode: "DemoAdmin",
      displayName: "DemoAdmin",
    });

    expect(getUserDisplay()).toEqual({
      userCode: "DemoAdmin",
      displayName: "DemoAdmin",
    });

    clearUserDisplay();

    expect(getUserDisplay()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
pnpm --filter @repo/web test -- --run src/lib/auth/user-display-store.test.ts
```

Expected: FAIL with module-not-found or missing export errors for `user-display-store`.

- [ ] **Step 3: Implement the minimal store**

```ts
const userDisplayStorageKey = "userDisplay";

export type UserDisplay = {
  userCode: string;
  displayName: string;
};

export function getUserDisplay(): UserDisplay | null {
  const rawValue = localStorage.getItem(userDisplayStorageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<UserDisplay>;

    if (typeof parsed.userCode !== "string" || typeof parsed.displayName !== "string") {
      return null;
    }

    return {
      userCode: parsed.userCode,
      displayName: parsed.displayName,
    };
  } catch {
    return null;
  }
}

export function setUserDisplay(userDisplay: UserDisplay) {
  localStorage.setItem(userDisplayStorageKey, JSON.stringify(userDisplay));
}

export function clearUserDisplay() {
  localStorage.removeItem(userDisplayStorageKey);
}
```

- [ ] **Step 4: Run the storage test to verify it passes**

Run:

```bash
pnpm --filter @repo/web test -- --run src/lib/auth/user-display-store.test.ts
```

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit the storage unit**

```bash
git add apps/web/src/lib/auth/user-display-store.ts apps/web/src/lib/auth/user-display-store.test.ts
git commit -m "feat(web): add user display storage"
```

### Task 2: Persist User Display Data During Login

**Files:**
- Modify: `apps/web/src/features/auth/login-page.tsx`
- Modify: `apps/web/src/features/auth/login-page.test.tsx`
- Modify: `apps/web/src/i18n/resources/zh-CN/auth.ts`
- Modify: `apps/web/src/i18n/resources/en-US/auth.ts`

- [ ] **Step 1: Extend the login page test with the new expectation**

Update the first test in `apps/web/src/features/auth/login-page.test.tsx` so it also checks persisted user display data:

```ts
expect(localStorage.getItem("accessToken")).toBe("access-1");
expect(localStorage.getItem("refreshToken")).toBe("refresh-1");
expect(localStorage.getItem("userDisplay")).toBe(
  JSON.stringify({
    userCode: "DemoAdmin",
    displayName: "DemoAdmin",
  }),
);
```

- [ ] **Step 2: Run the login page test to verify it fails**

Run:

```bash
pnpm --filter @repo/web test -- --run src/features/auth/login-page.test.tsx
```

Expected: FAIL because `userDisplay` is still `null`.

- [ ] **Step 3: Persist user display after successful login**

Add the new import in `apps/web/src/features/auth/login-page.tsx`:

```ts
import { setUserDisplay } from "@/lib/auth/user-display-store";
```

Update `onSubmit()` to write the display record immediately after `setAuthToken(token)`:

```ts
setAuthToken(token);
setUserDisplay({
  userCode: values.userCode,
  displayName: values.userCode,
});
```

Keep the navigation and toast behavior unchanged.

- [ ] **Step 4: Run the login page test to verify it passes**

Run:

```bash
pnpm --filter @repo/web test -- --run src/features/auth/login-page.test.tsx
```

Expected: PASS with all existing login cases still green.

- [ ] **Step 5: Commit the login persistence change**

```bash
git add apps/web/src/features/auth/login-page.tsx apps/web/src/features/auth/login-page.test.tsx
git commit -m "feat(web): persist user display after login"
```

### Task 3: Add the Header User Menu

**Files:**
- Create: `apps/web/src/components/layout/user-menu.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Modify: `apps/web/src/app.test.tsx`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts`

- [ ] **Step 1: Extend shell rendering tests for the avatar trigger and username**

In `apps/web/src/app.test.tsx`, make `renderAuthenticatedApp()` seed both token and user display:

```ts
function renderAuthenticatedApp(initialEntries: string[]) {
  localStorage.setItem("tokenType", "Bearer");
  localStorage.setItem("accessToken", "access-1");
  localStorage.setItem("refreshToken", "refresh-1");
  localStorage.setItem("expiresIn", "604800");
  localStorage.setItem(
    "userDisplay",
    JSON.stringify({
      userCode: "DemoAdmin",
      displayName: "DemoAdmin",
    }),
  );

  render(<App initialEntries={initialEntries} />);
}
```

Add a focused interaction test:

```ts
it("shows the current username inside the header user menu", async () => {
  renderAuthenticatedApp(["/dashboard"]);

  fireEvent.pointerDown(await screen.findByRole("button", { name: "打开用户菜单" }));

  expect(await screen.findByText("DemoAdmin")).toBeInTheDocument();
  expect(screen.getByText("退出登录")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run:

```bash
pnpm --filter @repo/web test -- --run src/app.test.tsx
```

Expected: FAIL because the user menu trigger does not exist yet.

- [ ] **Step 3: Implement `UserMenu` and compose it into `AppHeader`**

Create `apps/web/src/components/layout/user-menu.tsx` with the following shape:

```tsx
import { useMemo, useState } from "react";
import { LogOutIcon, UserCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLoginPath } from "@/lib/auth/auth-redirect";
import { clearAuthToken } from "@/lib/auth/token-store";
import { clearUserDisplay, getUserDisplay } from "@/lib/auth/user-display-store";

function getInitial(displayName: string | undefined) {
  return displayName?.trim().charAt(0).toUpperCase() || "U";
}

export function UserMenu() {
  const { t } = useTranslation(["auth", "common"]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const userDisplay = getUserDisplay();
  const displayName = userDisplay?.displayName || t("user.fallbackName", { ns: "auth" });
  const avatarInitial = useMemo(() => getInitial(userDisplay?.displayName), [userDisplay?.displayName]);

  function handleConfirmLogout() {
    clearUserDisplay();
    clearAuthToken();
    window.history.replaceState({}, "", getLoginPath("/dashboard"));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t("header.userMenu", { ns: "common" })}
            data-testid="user-menu-trigger"
            size="icon"
            variant="outline"
          >
            <span aria-hidden="true">{avatarInitial}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium">{displayName}</div>
          <Button
            className="w-full justify-start"
            onClick={() => setConfirmOpen(true)}
            type="button"
            variant="ghost"
          >
            <LogOutIcon data-icon="inline-start" />
            {t("logout.action", { ns: "auth" })}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("logout.confirmTitle", { ns: "auth" })}</DialogTitle>
            <DialogDescription>{t("logout.confirmDescription", { ns: "auth" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmOpen(false)} type="button" variant="outline">
              {t("logout.cancel", { ns: "auth" })}
            </Button>
            <Button onClick={handleConfirmLogout} type="button" variant="destructive">
              <UserCircleIcon data-icon="inline-start" />
              {t("logout.action", { ns: "auth" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

Compose it into `apps/web/src/components/layout/app-header.tsx`:

```tsx
import { UserMenu } from "@/components/layout/user-menu";

// inside the header action area
<LanguageToggle />
<ThemeToggle />
<Button variant="outline" size="sm">
  {t("header.preview")}
</Button>
<UserMenu />
```

Add the new i18n keys:

```ts
// apps/web/src/i18n/resources/zh-CN/common.ts
header: {
  preview: "预览",
  language: "切换语言",
  userMenu: "打开用户菜单",
}
```

```ts
// apps/web/src/i18n/resources/en-US/common.ts
header: {
  preview: "Preview",
  language: "Switch language",
  userMenu: "Open user menu",
}
```

```ts
// apps/web/src/i18n/resources/zh-CN/auth.ts
logout: {
  action: "退出登录",
  cancel: "取消",
  confirmTitle: "确认退出登录",
  confirmDescription: "退出后需要重新登录才能继续访问后台。",
  fallbackName: "当前用户",
}
```

```ts
// apps/web/src/i18n/resources/en-US/auth.ts
logout: {
  action: "Sign Out",
  cancel: "Cancel",
  confirmTitle: "Confirm sign out",
  confirmDescription: "You need to sign in again to continue using the admin shell.",
  fallbackName: "Current User",
}
```

- [ ] **Step 4: Run the shell test to verify it passes**

Run:

```bash
pnpm --filter @repo/web test -- --run src/app.test.tsx
```

Expected: PASS with the new user menu test green and existing shell tests still passing.

- [ ] **Step 5: Commit the user menu shell integration**

```bash
git add apps/web/src/components/layout/user-menu.tsx apps/web/src/components/layout/app-header.tsx apps/web/src/app.test.tsx apps/web/src/i18n/resources/zh-CN/common.ts apps/web/src/i18n/resources/en-US/common.ts apps/web/src/i18n/resources/zh-CN/auth.ts apps/web/src/i18n/resources/en-US/auth.ts
git commit -m "feat(web): add header user menu"
```

### Task 4: Add Confirmed Logout Behavior

**Files:**
- Modify: `apps/web/src/components/layout/user-menu.tsx`
- Modify: `apps/web/src/app.test.tsx`

- [ ] **Step 1: Add a failing logout flow test**

Append a new app-shell test:

```ts
it("confirms logout before clearing session and redirecting to login", async () => {
  renderAuthenticatedApp(["/dashboard"]);

  fireEvent.pointerDown(await screen.findByRole("button", { name: "打开用户菜单" }));
  fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

  expect(await screen.findByRole("heading", { name: "确认退出登录" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

  expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
  expect(localStorage.getItem("accessToken")).toBeNull();
  expect(localStorage.getItem("userDisplay")).toBeNull();
});
```

- [ ] **Step 2: Run the logout flow test to verify it fails**

Run:

```bash
pnpm --filter @repo/web test -- --run src/app.test.tsx
```

Expected: FAIL because the first user menu implementation does not yet open the confirmation dialog and clear the full local session.

- [ ] **Step 3: Refine `UserMenu` to support menu semantics and redirect preservation**

Update `apps/web/src/components/layout/user-menu.tsx` to use menu items instead of plain buttons inside the menu. Extend `apps/web/src/components/ui/dropdown-menu.tsx` only if needed to export `DropdownMenuItem`.

Target interaction code:

```tsx
import { getCurrentRedirectPath, redirectToLogin } from "@/lib/auth/auth-redirect";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const [menuOpen, setMenuOpen] = useState(false);

function handleOpenLogoutConfirm() {
  setMenuOpen(false);
  setConfirmOpen(true);
}

function handleConfirmLogout() {
  const redirect = getCurrentRedirectPath();

  clearUserDisplay();
  clearAuthToken();
  setConfirmOpen(false);
  redirectToLogin(redirect);
}

<DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
  <DropdownMenuTrigger asChild>
    {/* trigger stays the same */}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56">
    <div className="px-2 py-1.5 text-sm font-medium">{displayName}</div>
    <DropdownMenuItem onSelect={handleOpenLogoutConfirm}>
      <LogOutIcon data-icon="inline-start" />
      {t("logout.action", { ns: "auth" })}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

If `DropdownMenuItem` is missing, add this export to `apps/web/src/components/ui/dropdown-menu.tsx`:

```tsx
function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}
```

and include it in the export list:

```ts
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
};
```

- [ ] **Step 4: Run focused verification and full web checks**

Run:

```bash
pnpm --filter @repo/web test -- --run src/app.test.tsx src/features/auth/login-page.test.tsx src/lib/auth/user-display-store.test.ts
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

Expected:

- the focused tests PASS
- `typecheck` exits `0`
- `lint` exits `0`

- [ ] **Step 5: Commit the confirmed logout flow**

```bash
git add apps/web/src/components/layout/user-menu.tsx apps/web/src/components/ui/dropdown-menu.tsx apps/web/src/app.test.tsx
git commit -m "feat(web): add confirmed logout flow"
```

## Self-Review

- Spec coverage:
  - avatar trigger in header: Task 3
  - username display in menu: Task 3
  - confirmed logout dialog: Task 4
  - clear local auth and display state: Tasks 1, 2, 4
  - bilingual copy: Task 3
  - focused verification: Task 4
- Placeholder scan:
  - no `TODO`, `TBD`, or deferred implementation markers remain
  - each code-changing step includes concrete code to add or update
- Type consistency:
  - `UserDisplay`, `getUserDisplay()`, `setUserDisplay()`, and `clearUserDisplay()` are used consistently
  - `logout.action`, `logout.cancel`, `logout.confirmTitle`, `logout.confirmDescription`, and `header.userMenu` are the only new i18n keys referenced
