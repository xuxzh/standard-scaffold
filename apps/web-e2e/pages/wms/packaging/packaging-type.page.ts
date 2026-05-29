import { expect, type Locator, type Page } from "@playwright/test";
import { appRoutes } from "../../../helpers/routes";

export class PackagingTypePage {
  readonly heading: Locator;
  readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "包装类型维护" });
    this.createButton = page.getByRole("button", { name: "新增类型" });
  }

  async goto() {
    await this.page.goto(appRoutes.packagingType);
    await expect(this.heading).toBeVisible();
  }

  async expectRowVisible(text: string) {
    await expect(this.page.getByRole("cell", { name: text })).toBeVisible();
  }
}
