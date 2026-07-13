import { expect, type Locator, type Page } from "@playwright/test";

export class AppShellPage {
  readonly shell: Locator;
  readonly header: Locator;
  readonly dashboardNav: Locator;
  readonly embeddedNav: Locator;
  readonly standaloneNav: Locator;

  constructor(page: Page) {
    this.shell = page.getByTestId("admin-shell");
    this.header = page.getByTestId("app-header");
    this.dashboardNav = page.getByTestId("sidebar-nav-dashboard");
    this.embeddedNav = page.getByTestId("sidebar-nav-embedded");
    this.standaloneNav = page.getByTestId("sidebar-nav-standalone");
  }

  async expectShellVisible() {
    await expect(this.shell).toBeVisible();
    await expect(this.header).toBeVisible();
  }

  async openEmbeddedExample() {
    await this.embeddedNav.click();
  }

  async openStandaloneExample() {
    await this.standaloneNav.click();
  }
}