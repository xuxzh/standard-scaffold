import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { appRoutes } from "../helpers/routes";

test("keeps the admin shell mounted while navigating between every packaging page", async ({
  appShell,
  page,
}) => {
  // 顺序按 admin-shell-routes.ts:202 的 adminPageDefinitions.slice(2, 8)，
  // 与侧边栏渲染顺序保持一致。
  const openPackagingPages = [
    () => appShell.openPackagingType(),
    () => appShell.openPackagingLevel(),
    () => appShell.openPackagingSpec(),
    () => appShell.openPackagingKit(),
    () => appShell.openPackagingRule(),
    () => appShell.openMaterialPackagingRelation(),
  ];

  for (const open of openPackagingPages) {
    await open();
    await appShell.expectShellVisible();
    await appShell.expectPackagingNavVisible();
    await expect(page.getByTestId("admin-route-tabs")).toBeVisible();
  }
});

const packagingPages = [
  {
    route: appRoutes.packagingType,
    heading: "包装类型维护",
    tabSlug: "packaging-packaging-type",
  },
  {
    route: appRoutes.packagingLevel,
    heading: "包装层级维护",
    tabSlug: "packaging-packaging-level",
  },
  {
    route: appRoutes.packagingSpec,
    heading: "包装规格维护",
    tabSlug: "packaging-packaging-spec",
  },
  {
    route: appRoutes.packagingKit,
    heading: "套包信息维护",
    tabSlug: "packaging-packaging-kit",
  },
  {
    route: appRoutes.packagingRule,
    heading: "包装规则维护",
    tabSlug: "packaging-packaging-rule",
  },
  {
    route: appRoutes.materialPackagingRelation,
    heading: "物料包装关系",
    tabSlug: "packaging-material-packaging-relation",
  },
] as const;

for (const p of packagingPages) {
  test(`renders the ${p.route} page inside the admin shell`, async ({
    appShell,
    page,
  }) => {
    await page.goto(p.route);
    await expect(page).toHaveURL(p.route);

    await appShell.expectShellVisible();

    await expect(page.getByRole("heading", { name: p.heading })).toBeVisible();

    await expect(page.getByTestId("admin-route-tabs")).toBeVisible();
    await expect(page.getByTestId(`admin-route-tab-${p.tabSlug}`)).toBeVisible();

    // 侧边栏对应项处于 aria-current="page"（AppRouteTabs:54 用同款属性，
    // 这里复用以避免依赖未导出的样式类）。
    const navTestId = `sidebar-nav-packaging-${p.tabSlug.replace(
      /^packaging-/,
      "",
    )}`;
    await expect(page.getByTestId(navTestId)).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
}