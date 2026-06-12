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

test("restores packaging filter state after visiting the dashboard", async ({
  appShell,
  page,
}) => {
  await page.goto(appRoutes.packagingType);
  await page.getByLabel("类型编码").fill("DRAFT-TYPE");

  await appShell.dashboardNav.click();
  await expect(page).toHaveURL(appRoutes.dashboard);

  await page.goBack();
  await expect(page).toHaveURL(appRoutes.packagingType);
  await expect(page.getByLabel("类型编码")).toHaveValue("DRAFT-TYPE");

  await page.goForward();
  await expect(page).toHaveURL(appRoutes.dashboard);

  await appShell.openPackagingType();
  await expect(page).toHaveURL(appRoutes.packagingType);
  await expect(page.getByLabel("类型编码")).toHaveValue("DRAFT-TYPE");
});

test("hides and restores an open packaging form draft", async ({
  appShell,
  page,
}) => {
  await page.goto(appRoutes.packagingType);
  await page.getByRole("button", { name: "新增类型" }).click();
  await page
    .getByTestId("packaging-type-form-type-name")
    .fill("未提交草稿");

  await appShell.dashboardNav.evaluate((element: HTMLElement) =>
    element.click(),
  );
  await expect(page).toHaveURL(appRoutes.dashboard);
  await expect(page.getByTestId("packaging-type-form-sheet")).toBeHidden();

  await appShell.openPackagingType();
  await expect(page).toHaveURL(appRoutes.packagingType);
  await expect(page.getByTestId("packaging-type-form-sheet")).toBeVisible();
  await expect(
    page.getByTestId("packaging-type-form-type-name"),
  ).toHaveValue("未提交草稿");
});
