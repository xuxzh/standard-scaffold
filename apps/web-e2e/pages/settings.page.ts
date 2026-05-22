import { expect, type Locator, type Page } from "@playwright/test";

export class SettingsPage {
  readonly themeToggle: Locator;
  readonly languageToggle: Locator;

  constructor(private readonly page: Page) {
    this.themeToggle = page.getByTestId("theme-toggle");
    this.languageToggle = page.getByTestId("language-toggle");
  }

  async selectTheme(label: string) {
    await this.themeToggle.click();
    const option = this.page.getByRole("menuitemradio", { name: label });
    await expect(option).toBeVisible();
    await option.click();
  }

  async selectLocale(label: string) {
    await this.languageToggle.click();
    const option = this.page.getByRole("menuitemradio", { name: label });
    await expect(option).toBeVisible();
    await option.click();
  }
}
