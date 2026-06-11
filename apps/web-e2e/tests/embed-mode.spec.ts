import { test as base, expect } from "@playwright/test";
import { appRoutes } from "../helpers/routes";

// Use the bare `test` so the default fixture does NOT pre-seed the auth
// token in localStorage — embed mode has its own acquisition protocol.
const test = base;

test.describe("embed mode auth flow", () => {
  test("redirects to /embed/auth-error?embedError=NO_TOKEN when accessed without a token in a top-level window", async ({
    page,
  }) => {
    await page.goto(appRoutes.embedPackagingType);

    await expect(page).toHaveURL(/\/embed\/auth-error\?.*embedError=NO_TOKEN/);
    await expect(page.getByTestId("embed-error-page")).toBeVisible();
    await expect(
      page.getByText("无法加载嵌入式页面", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByTestId("embed-error-code-message"),
    ).toContainText("未检测到访问令牌");
  });

  test("renders the embedded page (chrome-less) when given a JSON token in the URL", async ({
    page,
  }) => {
    const token = encodeURIComponent(
      JSON.stringify({
        tokenType: "Bearer",
        accessToken: "embed-access",
        refreshToken: "embed-refresh",
        expiresIn: 3600,
      }),
    );

    await page.goto(`${appRoutes.embedPackagingType}?token=${token}`);

    // The admin shell chrome (sidebar, header with title) must NOT be present.
    await expect(page.getByTestId("admin-shell")).toHaveCount(0);

    // The page body renders the action bar from the feature component.
    await expect(
      page.getByRole("button", { name: "新增类型" }),
    ).toBeVisible();
  });

  test("renders the embedded page when given a plain access token in the URL", async ({
    page,
  }) => {
    await page.goto(`${appRoutes.embedPackagingType}?token=opaque-access`);

    await expect(page.getByTestId("admin-shell")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "新增类型" }),
    ).toBeVisible();
  });

  test("preserves the embedError code when retrying with a top-level window", async ({
    page,
  }) => {
    await page.goto(appRoutes.embedAuthError + "?embedError=TIMEOUT");

    await expect(page.getByTestId("embed-error-page")).toBeVisible();
    await expect(
      page.getByTestId("embed-error-code-message"),
    ).toContainText("等待主平台传递令牌超时");
  });

  test("'ignore token' button enters the originally-requested page in preview mode", async ({
    page,
  }) => {
    // Land on the embedded packaging-type page; the auth check should
    // redirect us to the error screen.
    await page.goto(appRoutes.embedPackagingType);
    await expect(page).toHaveURL(/\/embed\/auth-error\?embedError=NO_TOKEN/);
    await expect(page.getByTestId("embed-error-page")).toBeVisible();

    // Click the "ignore token" button.
    await page.getByTestId("embed-error-ignore-button").click();

    // The skip-auth flag should now be set in localStorage.
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("embedSkipAuth")),
      )
      .toBe("true");

    // We should land on the originally requested path (chrome-less).
    await expect(page).toHaveURL(appRoutes.embedPackagingType);
    await expect(page.getByTestId("admin-shell")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "新增类型" }),
    ).toBeVisible();

    // The flag persists across subsequent navigations within /embed/*.
    await page.goto(appRoutes.embedPackagingSpec);
    await expect(page).toHaveURL(appRoutes.embedPackagingSpec);
    await expect(page.getByTestId("embed-error-page")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "包装规格维护" }),
    ).toHaveCount(0); // chrome-less, no AppHeader heading
    await expect(
      page.getByRole("button", { name: "新增规格" }),
    ).toBeVisible();
  });
});
