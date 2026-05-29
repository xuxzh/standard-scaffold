import { expect } from "@playwright/test";
import { test } from "../../../fixtures/test";
import { appRoutes } from "../../../helpers/routes";

test("loads packaging type list from a reset mock session", async ({
  appShell,
  page,
  packagingTypePage,
}) => {
  await packagingTypePage.goto();

  await appShell.expectShellVisible();
  await expect(page).toHaveURL(appRoutes.packagingType);
  await expect(page.getByRole("heading", { name: "包装类型维护" })).toBeVisible();
  await packagingTypePage.expectRowVisible("PKG_TYPE_001");
});
