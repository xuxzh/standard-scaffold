import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { appRoutes } from "../helpers/routes";

test("loads WMS packaging type data from API mocks", async ({ appShell, page }) => {
  await page.goto(appRoutes.packagingType);

  await appShell.expectShellVisible();
  await expect(page.getByRole("heading", { name: "包装类型维护" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "PKG_TYPE_001" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "纸箱", exact: true })).toBeVisible();
});
