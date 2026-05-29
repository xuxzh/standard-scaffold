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

test("filters packaging types by type code and recyclable status", async ({
  packagingTypePage,
}) => {
  await packagingTypePage.goto();

  await packagingTypePage.filter({
    typeCode: "PKG_TYPE_003",
    isRecyclable: "false",
  });

  await packagingTypePage.expectRowVisible("PKG_TYPE_003");
  await packagingTypePage.expectRowHidden("PKG_TYPE_001");
});

test("creates a packaging type from the create sheet", async ({ packagingTypePage }) => {
  await packagingTypePage.goto();

  await packagingTypePage.openCreateSheet();
  await packagingTypePage.fillForm({
    typeCode: "PKG_TYPE_900",
    typeName: "周转箱",
    isRecyclable: true,
    description: "E2E created record",
  });
  await packagingTypePage.submitForm();

  await packagingTypePage.expectRowVisible("PKG_TYPE_900");
  await packagingTypePage.expectTextVisible("周转箱");
});

test("updates an existing packaging type", async ({ packagingTypePage }) => {
  await packagingTypePage.goto();

  await packagingTypePage.openEditSheet("PKG_TYPE_001");
  await packagingTypePage.fillForm({
    typeName: "加固纸箱",
    isRecyclable: false,
    description: "updated by e2e",
  });
  await packagingTypePage.submitForm();

  await packagingTypePage.expectTextVisible("加固纸箱");
  await packagingTypePage.expectTextVisible("updated by e2e");
});
