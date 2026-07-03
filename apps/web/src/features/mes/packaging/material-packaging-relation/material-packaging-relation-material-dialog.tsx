import { CheckIcon, ChevronLeftIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  materialOptionPageSize,
  type MaterialOption,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { useMaterialOptionsQuery } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-queries";

type MaterialPackagingRelationMaterialDialogContentProps = {
  onConfirm: (material: MaterialOption) => void;
  onOpenChange: (open: boolean) => void;
};

function MaterialPackagingRelationMaterialDialogContent({
  onConfirm,
  onOpenChange,
}: MaterialPackagingRelationMaterialDialogContentProps) {
  const { t } = useTranslation("common");
  const [materialCode, setMaterialCode] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [filters, setFilters] = useState({ materialCode: "", materialName: "" });
  const [pageIndex, setPageIndex] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const query = useMaterialOptionsQuery(
    filters.materialCode,
    filters.materialName,
    pageIndex,
    "form-material",
    true,
  );

  const items = query.data?.items ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const canGoNext =
    items.length > 0 && pageIndex * materialOptionPageSize < totalCount;

  const columns = useMemo<ColumnDef<MaterialOption>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => {
          const isSelected = selectedCode === row.original.materialCode;
          return (
            <input
              aria-label={row.original.materialCode}
              checked={isSelected}
              data-testid={`material-dialog-select-${row.original.materialCode}`}
              type="radio"
              name="material-dialog-selection"
              onChange={() => setSelectedCode(row.original.materialCode)}
            />
          );
        },
      },
      {
        accessorKey: "materialCode",
        header: t(
          "pages.materialPackagingRelation.materialDialog.materialCode",
        ),
      },
      {
        accessorKey: "materialName",
        header: t(
          "pages.materialPackagingRelation.materialDialog.materialName",
        ),
      },
      {
        accessorKey: "materialTypeName",
        header: t(
          "pages.materialPackagingRelation.materialDialog.materialType",
        ),
        cell: ({ getValue }) => (getValue() as string) || "-",
      },
    ],
    [selectedCode, t],
  );

  function handleConfirm() {
    if (!selectedCode) {
      return;
    }

    const material = items.find((item) => item.materialCode === selectedCode);

    if (material) {
      onConfirm(material);
      onOpenChange(false);
    }
  }

  return (
    <DialogContent
      className="w-[min(100%-2rem,48rem)] max-w-none gap-0 overflow-hidden p-0"
      data-testid="material-packaging-relation-material-dialog"
    >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {t("pages.materialPackagingRelation.materialDialog.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-4">
          <form
            className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setPageIndex(1);
              setFilters({ materialCode, materialName });
            }}
          >
            <Input
              aria-label={t(
                "pages.materialPackagingRelation.materialDialog.materialCode",
              )}
              placeholder={t(
                "pages.materialPackagingRelation.materialDialog.materialCode",
              )}
              value={materialCode}
              onChange={(event) => setMaterialCode(event.target.value)}
            />
            <Input
              aria-label={t(
                "pages.materialPackagingRelation.materialDialog.materialName",
              )}
              placeholder={t(
                "pages.materialPackagingRelation.materialDialog.materialName",
              )}
              value={materialName}
              onChange={(event) => setMaterialName(event.target.value)}
            />
            <Button type="submit">
              <SearchIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.search")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMaterialCode("");
                setMaterialName("");
                setFilters({ materialCode: "", materialName: "" });
                setPageIndex(1);
                setSelectedCode(null);
              }}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.reset")}
            </Button>
          </form>

          {query.isError ? (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex-1">
                <p className="font-medium text-destructive">
                  {t("pages.materialPackagingRelation.materialDialog.errorTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("pages.materialPackagingRelation.materialDialog.errorDescription")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void query.refetch()}
              >
                {t("pages.materialPackagingRelation.actions.retry")}
              </Button>
            </div>
          ) : null}

          <DataTable
            className="max-h-[60vh]"
            columns={columns}
            data={items}
            getRowId={(row) => row.materialCode}
            rowNumber={{
              startIndex: (pageIndex - 1) * materialOptionPageSize + 1,
            }}
            loading={query.isLoading || query.isFetching}
            loadingLabel={t(
              "pages.materialPackagingRelation.materialDialog.loading",
            )}
            emptyLabel={t(
              "pages.materialPackagingRelation.materialDialog.empty",
            )}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {selectedCode
                ? t(
                    "pages.materialPackagingRelation.materialDialog.selected",
                    { code: selectedCode },
                  )
                : t(
                    "pages.materialPackagingRelation.materialDialog.noneSelected",
                  )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageIndex <= 1 || query.isLoading}
                onClick={() =>
                  setPageIndex((current) => Math.max(1, current - 1))
                }
              >
                {t("pages.materialPackagingRelation.actions.previousPage")}
              </Button>
              <span>
                {t("pages.materialPackagingRelation.states.page", {
                  page: pageIndex,
                })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={query.isLoading || !canGoNext}
                onClick={() => setPageIndex((current) => current + 1)}
              >
                {t("pages.materialPackagingRelation.actions.nextPage")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            {t("pages.materialPackagingRelation.actions.back")}
          </Button>
          <Button
            data-testid="material-dialog-confirm"
            type="button"
            disabled={!selectedCode}
            onClick={handleConfirm}
          >
            <CheckIcon data-icon="inline-start" />
            {t("pages.materialPackagingRelation.actions.confirm")}
          </Button>
        </DialogFooter>
    </DialogContent>
  );
}

type MaterialPackagingRelationMaterialDialogProps = {
  open: boolean;
  onConfirm: (material: MaterialOption) => void;
  onOpenChange: (open: boolean) => void;
};

export function MaterialPackagingRelationMaterialDialog({
  open,
  onConfirm,
  onOpenChange,
}: MaterialPackagingRelationMaterialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <MaterialPackagingRelationMaterialDialogContent
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}
