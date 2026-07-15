import { expect, type Locator, type Page } from "@playwright/test";

export class AppShellPage {
  readonly shell: Locator;
  readonly header: Locator;
  readonly dashboardNav: Locator;
  readonly embeddedNav: Locator;
  readonly standaloneNav: Locator;
  readonly packagingTypeNav: Locator;
  readonly packagingLevelNav: Locator;
  readonly packagingSpecNav: Locator;
  readonly packagingKitNav: Locator;
  readonly packagingRuleNav: Locator;
  readonly materialPackagingRelationNav: Locator;
  readonly packagingNavLinks: readonly Locator[];

  constructor(page: Page) {
    this.shell = page.getByTestId("admin-shell");
    this.header = page.getByTestId("app-header");
    this.dashboardNav = page.getByTestId("sidebar-nav-dashboard");
    this.embeddedNav = page.getByTestId("sidebar-nav-embedded");
    this.standaloneNav = page.getByTestId("sidebar-nav-standalone");
    this.packagingTypeNav = page.getByTestId(
      "sidebar-nav-packaging-packaging-type",
    );
    this.packagingLevelNav = page.getByTestId(
      "sidebar-nav-packaging-packaging-level",
    );
    this.packagingSpecNav = page.getByTestId(
      "sidebar-nav-packaging-packaging-spec",
    );
    this.packagingKitNav = page.getByTestId(
      "sidebar-nav-packaging-packaging-kit",
    );
    this.packagingRuleNav = page.getByTestId(
      "sidebar-nav-packaging-packaging-rule",
    );
    this.materialPackagingRelationNav = page.getByTestId(
      "sidebar-nav-packaging-material-packaging-relation",
    );
    this.packagingNavLinks = [
      this.packagingTypeNav,
      this.packagingLevelNav,
      this.packagingSpecNav,
      this.packagingKitNav,
      this.packagingRuleNav,
      this.materialPackagingRelationNav,
    ];
  }

  async expectShellVisible() {
    await expect(this.shell).toBeVisible();
    await expect(this.header).toBeVisible();
  }

  async expectPackagingNavVisible() {
    for (const link of this.packagingNavLinks) {
      await expect(link).toBeVisible();
    }
  }

  async openEmbeddedExample() {
    await this.embeddedNav.click();
  }

  async openStandaloneExample() {
    await this.standaloneNav.click();
  }

  async openPackagingType() {
    await this.packagingTypeNav.click();
  }

  async openPackagingLevel() {
    await this.packagingLevelNav.click();
  }

  async openPackagingSpec() {
    await this.packagingSpecNav.click();
  }

  async openPackagingKit() {
    await this.packagingKitNav.click();
  }

  async openPackagingRule() {
    await this.packagingRuleNav.click();
  }

  async openMaterialPackagingRelation() {
    await this.materialPackagingRelationNav.click();
  }
}