import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import {
  detectInitialLocale,
  i18n,
  isAppLocale,
  readStoredLocale,
  writeStoredLocale
} from "@/i18n/config";

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    const nextLocale = detectInitialLocale({
      storageValue: readStoredLocale()
    });

    void i18n.changeLanguage(nextLocale);
  }, []);

  useEffect(() => {
    const handleLanguageChanged = (nextLocale: string) => {
      if (isAppLocale(nextLocale)) {
        writeStoredLocale(nextLocale);
      }
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
