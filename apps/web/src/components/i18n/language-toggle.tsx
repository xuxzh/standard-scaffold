import { LanguagesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { fallbackLocale, i18n, normalizeLocale, type AppLocale } from "@/i18n/config";

const localeOptions: AppLocale[] = ["zh-CN", "en-US"];

export function LanguageToggle() {
  const { t } = useTranslation("common");
  const currentLocale = normalizeLocale(i18n.resolvedLanguage) ?? fallbackLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="language-toggle" variant="outline" size="sm" aria-label={t("header.language")}>
          <LanguagesIcon />
          <span className="hidden sm:inline">{t(`header.languageShort.${currentLocale}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={currentLocale}
          onValueChange={(value) => {
            void i18n.changeLanguage(value);
          }}
        >
          {localeOptions.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {t(`header.languageOption.${locale}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
