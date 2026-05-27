# Login Dev Default Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only in development, prefill the login form with `DemoAdmin` and `Icpt1357!!` while keeping non-development environments blank.

**Architecture:** Keep the change local to `LoginPage` by deriving `useForm` default values from `import.meta.env.DEV`. Add one focused test that explicitly stubs the dev environment and asserts the inputs render with the expected defaults, without changing the existing submit and validation flow.

**Tech Stack:** React 19, Vite, TypeScript, React Hook Form, Vitest, Testing Library

---

### Task 1: Add a failing test for development-only default values

**Files:**
- Modify: `apps/web/src/features/auth/login-page.test.tsx`
- Test: `apps/web/src/features/auth/login-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
it("prefills demo credentials in development", async () => {
  vi.stubEnv("DEV", "true");

  render(<App initialEntries={["/login"]} />);

  expect(await screen.findByLabelText("用户编码")).toHaveValue("DemoAdmin");
  expect(screen.getByLabelText("密码")).toHaveValue("Icpt1357!!");
});
```

- [ ] **Step 2: Update cleanup to restore environment state**

```ts
afterEach(() => {
  resetAppTransportForTests();
  vi.unstubAllEnvs();
});
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run: `pnpm --filter @repo/web test -- login-page`
Expected: FAIL because `LoginPage` still initializes both fields with empty strings.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/login-page.test.tsx
git commit -m "test: cover dev login default credentials"
```

### Task 2: Implement development-only default form values

**Files:**
- Modify: `apps/web/src/features/auth/login-page.tsx`
- Test: `apps/web/src/features/auth/login-page.test.tsx`

- [ ] **Step 1: Add focused constants and derive defaults from `import.meta.env.DEV`**

```ts
const DEV_DEFAULT_LOGIN_FORM_VALUES: LoginFormValues = {
  userCode: "DemoAdmin",
  password: "Icpt1357!!",
};

const EMPTY_LOGIN_FORM_VALUES: LoginFormValues = {
  userCode: "",
  password: "",
};
```

```ts
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: import.meta.env.DEV
      ? DEV_DEFAULT_LOGIN_FORM_VALUES
      : EMPTY_LOGIN_FORM_VALUES,
  });
```

- [ ] **Step 2: Run the focused test and verify it passes**

Run: `pnpm --filter @repo/web test -- login-page`
Expected: PASS with the new development-prefill assertion and the existing login flow tests still green.

- [ ] **Step 3: Run type verification**

Run: `pnpm --filter @repo/web typecheck`
Expected: PASS with no new TypeScript errors.

- [ ] **Step 4: Run diagnostics for recently edited files**

Check:
- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/features/auth/login-page.test.tsx`

Expected: no new diagnostics introduced by the change.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/auth/login-page.tsx apps/web/src/features/auth/login-page.test.tsx
git commit -m "feat: prefill login form in development"
```
