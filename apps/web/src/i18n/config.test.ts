import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import { detectInitialLocale, fallbackLocale, normalizeLocale } from "@/i18n/config";

describe("normalizeLocale", () => {
  it("maps Chinese variants to zh-CN", () => {
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-Hans")).toBe("zh-CN");
    expect(normalizeLocale("zh-CN")).toBe("zh-CN");
  });

  it("maps English variants to en-US", () => {
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("en-GB")).toBe("en-US");
    expect(normalizeLocale("en-US")).toBe("en-US");
  });

  it("returns null for unsupported locales", () => {
    expect(normalizeLocale("ja-JP")).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
  });
});

describe("detectInitialLocale", () => {
  it("prefers stored locale over navigator language", () => {
    expect(
      detectInitialLocale({
        storageValue: "en-US",
        navigatorLanguage: "zh-CN"
      })
    ).toBe("en-US");
  });

  it("falls back to navigator language when storage is missing", () => {
    expect(
      detectInitialLocale({
        storageValue: null,
        navigatorLanguage: "en-GB"
      })
    ).toBe("en-US");
  });

  it("falls back to the default locale when both sources are invalid", () => {
    expect(
      detectInitialLocale({
        storageValue: "broken",
        navigatorLanguage: "fr-FR"
      })
    ).toBe(fallbackLocale);
  });
});

describe("i18next fallback behavior", () => {
  it("uses the fallback locale for missing keys", async () => {
    const instance = createInstance();

    await instance.init({
      lng: "en-US",
      fallbackLng: fallbackLocale,
      resources: {
        "zh-CN": {
          common: {
            fallbackOnly: "仅中文回退值"
          }
        },
        "en-US": {
          common: {}
        }
      }
    });

    expect(instance.t("fallbackOnly", { ns: "common" })).toBe("仅中文回退值");
  });
});
