import { test as base } from "@playwright/test";
import { AppShellPage } from "../pages/app-shell.page";
import { SettingsPage } from "../pages/settings.page";

type Fixtures = {
  appShell: AppShellPage;
  settings: SettingsPage;
};

export const test = base.extend<Fixtures>({
  appShell: async ({ page }, use) => {
    await use(new AppShellPage(page));
  },
  settings: async ({ page }, use) => {
    await use(new SettingsPage(page));
  }
});
