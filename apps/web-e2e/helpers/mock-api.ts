import type { Page } from "@playwright/test";

export async function resetPackagingTypeMocks(page: Page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const status = await page.evaluate(async () => {
      const response = await fetch("/__mock__/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: "packaging-type",
        }),
      });

      return response.status;
    });

    if (status >= 200 && status < 300) {
      return;
    }

    await page.waitForTimeout(100);
  }

  throw new Error("Failed to reset packaging type mocks after waiting for MSW");
}
