import {
  ArrowDownIcon,
  ArrowUpIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  getMetadataDatas,
  storeMetaDatas,
} from "@/components/data-import/data-import-service";
import type {
  DataImportTemplateMetadata,
  ImportModuleKey,
} from "@/components/data-import/data-import-contract";

export type DataImportTemplateDialogProps = {
  open: boolean;
  moduleKey: ImportModuleKey;
  businessKey: string;
  onOpenChange: (open: boolean) => void;
};

function sortBySortId(rows: DataImportTemplateMetadata[]) {
  return [...rows].sort((a, b) => a.SortId - b.SortId);
}

function renumberRows(rows: DataImportTemplateMetadata[]) {
  return rows.map((row, index) => ({ ...row, SortId: index + 1 }));
}

function moveRow(
  rows: DataImportTemplateMetadata[],
  sourceIndex: number,
  direction: "up" | "down",
) {
  const targetIndex = direction === "up" ? sourceIndex - 1 : sourceIndex + 1;

  if (targetIndex < 0 || targetIndex >= rows.length) {
    return rows;
  }

  const next = [...rows];
  const [moved] = next.splice(sourceIndex, 1);

  next.splice(targetIndex, 0, moved!);

  return renumberRows(next);
}

export function DataImportTemplateDialog({
  open,
  moduleKey,
  businessKey,
  onOpenChange,
}: DataImportTemplateDialogProps) {
  const { t } = useTranslation("common");
  const [rows, setRows] = useState<DataImportTemplateMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    // Reset state for this load. React's compiler flags synchronous setState
    // inside effects, but this is the documented "sync state inside effect"
    // pattern (initial load, no upstream data). The warnings are silenced
    // at the call site because we already gate on `open` to avoid recursion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMessage(null);

    getMetadataDatas(
      { ModuleKey: moduleKey, BusinessKey: businessKey },
      moduleKey,
    )
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.Success) {
          setRows(sortBySortId(result.Attach));
        } else {
          setErrorMessage(result.Message);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, moduleKey, businessKey]);

  const sortedRows = useMemo(() => rows, [rows]);

  function updateRow(
    fieldName: string,
    patch: Partial<DataImportTemplateMetadata>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.FieldName === fieldName ? { ...row, ...patch } : row,
      ),
    );
  }

  function handleToggleUse(row: DataImportTemplateMetadata, value: boolean) {
    const patch: Partial<DataImportTemplateMetadata> = { IsUse: value };

    if (!value) {
      patch.IsRequired = false;
    }

    updateRow(row.FieldName, patch);
  }

  function handleMove(index: number, direction: "up" | "down") {
    setRows((current) => moveRow(current, index, direction));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMessage(null);

    try {
      const result = await storeMetaDatas(
        renumberRows(sortedRows),
        moduleKey,
        businessKey,
      );

      if (!result.Success) {
        setErrorMessage(result.Message);
        return;
      }

      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Constrain the dialog so the field table scrolls within the body
        instead of pushing the title or footer off-screen when there are
        many fields. The body row (`1fr`) gets `min-h-0 overflow-auto` so
        the long table can scroll vertically while the header and footer
        stay pinned.
      */}
      <DialogContent
        data-testid="data-import-template-dialog"
        className="grid max-h-[min(calc(100vh-2rem),42rem)] w-[min(100%-2rem,48rem)] max-w-none grid-rows-[auto_1fr_auto] gap-3 overflow-hidden p-4"
        showFullscreenButton={false}
      >
        <DialogHeader>
          <DialogTitle>{t("pages.dataImport.templateDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div
          className="min-h-0 overflow-auto"
          data-testid="data-import-template-body"
        >
          {errorMessage ? (
            <p
              role="alert"
              className="mb-3 text-sm text-destructive"
              data-testid="data-import-template-error"
            >
              {errorMessage}
            </p>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pages.dataImport.sequence")}</TableHead>
                <TableHead>{t("pages.dataImport.fieldDisplayName")}</TableHead>
                <TableHead>{t("pages.dataImport.enabled")}</TableHead>
                <TableHead>{t("pages.dataImport.required")}</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    ...
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row, index) => {
                  const systemRequired = Boolean(row.IsSystemRequired);
                  const useChecked = row.IsUse;

                  return (
                    <TableRow
                      key={row.FieldName}
                      data-testid={`template-row-${row.FieldName}`}
                    >
                      <TableCell>{row.SortId}</TableCell>
                      <TableCell>{row.FieldDisplayName}</TableCell>
                      <TableCell>
                        {systemRequired ? (
                          <span className="text-sm text-muted-foreground">
                            {t("pages.dataImport.required")}
                          </span>
                        ) : (
                          <Switch
                            checked={useChecked}
                            onCheckedChange={(value) =>
                              handleToggleUse(row, value)
                            }
                            aria-label={`enable-${row.FieldName}`}
                            data-testid={`switch-use-${row.FieldName}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {systemRequired ? (
                          <span className="text-sm text-muted-foreground">
                            {t("pages.dataImport.required")}
                          </span>
                        ) : (
                          <Switch
                            checked={row.IsRequired && useChecked}
                            disabled={!useChecked}
                            onCheckedChange={(value) =>
                              updateRow(row.FieldName, { IsRequired: value })
                            }
                            aria-label={`require-${row.FieldName}`}
                            data-testid={`switch-required-${row.FieldName}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={index === 0}
                            aria-label={t("pages.dataImport.moveUp")}
                            onClick={() => handleMove(index, "up")}
                          >
                            <ArrowUpIcon />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={index === sortedRows.length - 1}
                            aria-label={t("pages.dataImport.moveDown")}
                            onClick={() => handleMove(index, "down")}
                          >
                            <ArrowDownIcon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <XIcon data-icon="inline-start" />
            {t("pages.dataImport.close")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving || loading}
          >
            <SaveIcon data-icon="inline-start" />
            {t("pages.dataImport.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
