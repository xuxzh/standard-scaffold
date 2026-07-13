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
  await expect(page.getByRole("heading", { name: "壳内示例" })).toBeVisible();
});

test("opens the standalone page without rendering the admin shell", async ({ appShell, page }) => {
  await page.goto(appRoutes.dashboard);

  await appShell.openStandaloneExample();

  await expect(page).toHaveURL(appRoutes.standaloneExample);
  await expect(page.getByTestId("standalone-page")).toBeVisible();
  await expect(appShell.shell).toHaveCount(0);
});