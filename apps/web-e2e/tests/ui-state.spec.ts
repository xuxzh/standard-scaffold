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
