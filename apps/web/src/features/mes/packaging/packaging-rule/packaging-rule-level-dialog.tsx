import { AlertCircleIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PackagingRuleLevelOption } from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";

type PackagingRuleLevelDialogProps = {
  /**
   * Whether to show the dialog. The parent owns selection, filter, and
   * loading state; this dialog only retains local drafts while `open=true`.
   */
  open: boolean;
  /** All available level options, supplied by the parent query. */
  levelOptions: PackagingRuleLevelOption[];
  /** Whether the chain load is pending; disables the confirm button and swaps the label. */
  loading: boolean;
  /** Chain load error message; non-empty values show a destructive banner and keep the dialog open. */
  error: string | null;
  /** Open change callback; close should not reset the parent form. */
  onOpenChange: (open: boolean) => void;
  /**
   * Receives the final `levelCode` and triggers the parent chain load.
   * The parent owns its own error cleanup; this component does not need to
   * know mutation internals.
   */
  onConfirm: (levelCode: string) => Promise<void> | void;
};

type LevelFilters = {
  levelCode: string;
  levelName: string;
};

const emptyFilters: LevelFilters = {
  levelCode: "",
  levelName: "",
};

const RADIO_GROUP_NAME = "packaging-rule-level";

/**
 * Dialog for selecting a packaging level.
 *
 * Responsibilities:
 * 1. Offer code + name local fuzzy filtering through the filter UI.
 * 2. Maintain the draft single selection locally to avoid polluting the
 *    parent form.
 * 3. Report the final `levelCode` back via `onConfirm`.
 *
 * This component does not call `/PackagingLevelApi/GetLevelChain`; that is
 * the responsibility of the parent mutation.
 */
export function PackagingRuleLevelDialog({
  open,
  levelOptions,
  loading,
  error,
  onOpenChange,
  onConfirm,
}: PackagingRuleLevelDialogProps) {
  const { t } = useTranslation("common");
  const [draftFilters, setDraftFilters] = useState<LevelFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<LevelFilters>(emptyFilters);
  const [selectedLevelCode, setSelectedLevelCode] = useState("");

  // Drafts are intentionally local; the parent remounts this component by
  // bumping its `key` on each open transition so a stale selection never
  // leaks across sessions (instead of resetting in an effect, which would
  // cause cascading renders).

  const filteredLevelOptions = useMemo(
    () =>
      levelOptions.filter((option) => {
        const levelCode = appliedFilters.levelCode.trim().toLowerCase();
        const levelName = appliedFilters.levelName.trim().toLowerCase();

        return (
          (!levelCode ||
            option.levelCode.toLowerCase().includes(levelCode)) &&
          (!levelName ||
            option.levelName.toLowerCase().includes(levelName))
        );
      }),
    [
      appliedFilters.levelCode,
      appliedFilters.levelName,
      levelOptions,
    ],
  );

  // Disable the confirm button whenever no option is available, no level
  // is selected, or a load is in progress.
  const confirmDisabled =
    loading || !selectedLevelCode || filteredLevelOptions.length === 0;

  const emptyHintKey = levelOptions.length
    ? "pages.packagingRule.levelDialog.noLevelFound"
    : "pages.packagingRule.levelDialog.empty";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%-2rem,56rem)] max-w-none"
        data-testid="packaging-rule-level-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {t("pages.packagingRule.levelDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("pages.packagingRule.levelDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedFilters(draftFilters);
              // Clear any previous selection when filters change so that
              // "select A then filter to keep only B" cannot yield illegal submits.
              setSelectedLevelCode("");
            }}
          >
            <Field>
              <FieldLabel htmlFor="packaging-rule-level-filter-code">
                {t("pages.packagingRule.form.detailLevelCode")}
              </FieldLabel>
              <Input
                id="packaging-rule-level-filter-code"
                data-testid="packaging-rule-level-filter-code"
                value={draftFilters.levelCode}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    levelCode: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="packaging-rule-level-filter-name">
                {t("pages.packagingRule.form.detailLevelName")}
              </FieldLabel>
              <Input
                id="packaging-rule-level-filter-name"
                data-testid="packaging-rule-level-filter-name"
                value={draftFilters.levelName}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    levelName: event.target.value,
                  }))
                }
              />
            </Field>
            <Button
              type="submit"
              className="self-end"
              data-testid="packaging-rule-level-filter-submit"
            >
              {t("pages.packagingRule.actions.search")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="self-end"
              data-testid="packaging-rule-level-filter-reset"
              onClick={() => {
                setDraftFilters(emptyFilters);
                setAppliedFilters(emptyFilters);
                setSelectedLevelCode("");
              }}
            >
              {t("pages.packagingRule.actions.reset")}
            </Button>
          </form>

          <Table containerClassName="max-h-[22rem] rounded-md border">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {t("pages.packagingRule.levelDialog.select")}
                </TableHead>
                <TableHead>
                  {t("pages.packagingRule.form.detailLevelCode")}
                </TableHead>
                <TableHead>
                  {t("pages.packagingRule.form.detailLevelName")}
                </TableHead>
                <TableHead>
                  {t("pages.packagingRule.form.detailLevelSequence")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLevelOptions.length ? (
                filteredLevelOptions.map((option) => {
                  const isSelected =
                    selectedLevelCode === option.levelCode;
                  return (
                    <TableRow
                      key={option.levelCode}
                      data-state={isSelected ? "selected" : undefined}
                      data-testid={`packaging-rule-level-row-${option.levelCode}`}
                      onClick={() => setSelectedLevelCode(option.levelCode)}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          name={RADIO_GROUP_NAME}
                          aria-label={option.levelCode}
                          checked={isSelected}
                          onChange={() =>
                            setSelectedLevelCode(option.levelCode)
                          }
                        />
                      </TableCell>
                      <TableCell>{option.levelCode}</TableCell>
                      <TableCell>{option.levelName}</TableCell>
                      <TableCell>{option.levelSequence}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t(emptyHintKey)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {error ? (
            <div
              className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="packaging-rule-level-error"
            >
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("pages.packagingRule.actions.cancel")}
          </Button>
          <Button
            type="button"
            data-testid="packaging-rule-level-confirm"
            disabled={confirmDisabled}
            onClick={() => {
              if (selectedLevelCode) {
                void onConfirm(selectedLevelCode);
              }
            }}
          >
            {loading
              ? t("pages.packagingRule.levelDialog.loading")
              : t("pages.packagingRule.actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
