import { test as base } from "@playwright/test";
import { shouldUseApiMocks } from "../helpers/env";
import { storageKeys } from "../helpers/storage";
import { AppShellPage } from "../pages/app-shell.page";
import { SettingsPage } from "../pages/settings.page";

type Fixtures = {
  appShell: AppShellPage;
  settings: SettingsPage;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    if (shouldUseApiMocks()) {
      await page.addInitScript((keys) => {
        window.localStorage.setItem(keys.tokenType, "Bearer");
        window.localStorage.setItem(keys.accessToken, "e2e-access-token");
        window.localStorage.setItem(keys.refreshToken, "e2e-refresh-token");
        window.localStorage.setItem(keys.expiresIn, "604800");
      }, storageKeys);
    }

    await use(page);
  },
  appShell: async ({ page }, use) => {
    await use(new AppShellPage(page));
  },
  settings: async ({ page }, use) => {
    await use(new SettingsPage(page));
  }
});
