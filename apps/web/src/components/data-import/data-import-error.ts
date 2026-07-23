import type { TFunction } from "i18next";

// Format the inline error banner shown by both data-import dialogs. The
// backend `Message` (e.g. "Excel 第 5 行编码重复") is rendered as a
// sub-line behind the i18n "import failed" prefix so users can see both
// the failure mode and the underlying reason.
export function formatImportError(
  t: TFunction,
  detail?: string | null,
): string {
  const trimmed = detail?.trim();

  return trimmed
    ? t("pages.dataImport.importFailedWithDetail", { message: trimmed })
    : t("pages.dataImport.importFailed");
}
