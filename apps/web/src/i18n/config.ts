import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCNCommon from "@/i18n/resources/zh-CN/common";
import enUSCommon from "@/i18n/resources/en-US/common";
import zhCNDashboard from "@/i18n/resources/zh-CN/dashboard";
import enUSDashboard from "@/i18n/resources/en-US/dashboard";
import zhCNExamples from "@/i18n/resources/zh-CN/examples";
import enUSExamples from "@/i18n/resources/en-US/examples";

export type AppLocale = "zh-CN" | "en-US";

export const fallbackLocale: AppLocale = "zh-CN";
export const localeStorageKey = "app-locale";
export const supportedLocales: readonly AppLocale[] = ["zh-CN", "en-US"];

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "zh-CN" || value === "en-US";
}

export function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();

  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  if (normalized.startsWith("en")) {
    return "en-US";
  }

  return null;
}

export function detectInitialLocale({
  storageValue,
  navigatorLanguage
}: {
  storageValue: string | null;
  navigatorLanguage: string | null | undefined;
}): AppLocale {
  return normalizeLocale(storageValue) ?? normalizeLocale(navigatorLanguage) ?? fallbackLocale;
}

export function readStoredLocale(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(localeStorageKey);
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch {
    // Ignore storage failures and keep the UI interactive.
  }
}

export const resources = {
  "zh-CN": {
    common: zhCNCommon,
    dashboard: zhCNDashboard,
    examples: zhCNExamples
  },
  "en-US": {
    common: enUSCommon,
    dashboard: enUSDashboard,
    examples: enUSExamples
  }
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: fallbackLocale,
    fallbackLng: fallbackLocale,
    supportedLngs: [...supportedLocales],
    defaultNS: "common",
    ns: ["common", "dashboard", "examples"],
    resources,
    interpolation: {
      escapeValue: false
    }
  });
}

export { i18n };
