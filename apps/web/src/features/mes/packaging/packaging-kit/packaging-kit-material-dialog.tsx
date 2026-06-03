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
  packagingKitDefaultMaterialFilters,
  packagingKitMaterialPageSize,
  type PackagingKitMaterialOption,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import { usePackagingKitMaterialOptionsQuery } from "@/features/mes/packaging/packaging-kit/packaging-kit-queries";

type PackagingKitMaterialDialogContentProps = {
  mode: "main" | "children";
  selectedCodes?: string[];
  selectedItems?: PackagingKitMaterialOption[];
  onConfirm: (rows: PackagingKitMaterialOption[]) => void;
  onOpenChange: (open: boolean) => void;
};

function PackagingKitMaterialDialogContent({
  mode,
  selectedCodes = [],
  selectedItems = [],
  onConfirm,
  onOpenChange,
}: PackagingKitMaterialDialogContentProps) {
  const { t } = useTranslation("common");
  const [draftFilters, setDraftFilters] = useState(packagingKitDefaultMaterialFilters);
  const [filters, setFilters] = useState(packagingKitDefaultMaterialFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [currentSelectedCodes, setCurrentSelectedCodes] = useState<string[]>(selectedCodes);
  const [selectedItemsByCode, setSelectedItemsByCode] = useState<Record<string, PackagingKitMaterialOption>>(
    () => Object.fromEntries(selectedItems.map((item) => [item.code, item] as const)),
  );
  const query = usePackagingKitMaterialOptionsQuery(filters, pageIndex, mode, true);

  const items = query.data?.items ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const canGoNext = items.length > 0 && pageIndex * packagingKitMaterialPageSize < totalCount;
  const titleKey =
    mode === "main"
      ? "pages.packagingKit.materialDialog.mainTitle"
      : "pages.packagingKit.materialDialog.childrenTitle";

  function toggleCode(item: PackagingKitMaterialOption) {
    setCurrentSelectedCodes((current) => {
      if (mode === "main") {
        return current.includes(item.code) ? [] : [item.code];
      }

      return current.includes(item.code)
        ? current.filter((code) => code !== item.code)
        : [...current, item.code];
    });

    setSelectedItemsByCode((current) => {
      if (mode === "main") {
        return currentSelectedCodes.includes(item.code) ? {} : { [item.code]: item };
      }

      if (currentSelectedCodes.includes(item.code)) {
        const next = { ...current };
        delete next[item.code];
        return next;
      }

      return {
        ...current,
        [item.code]: item,
      };
    });
  }

  function handleConfirm() {
    const selected = currentSelectedCodes
      .map((code) => selectedItemsByCode[code])
      .filter((item): item is PackagingKitMaterialOption => Boolean(item));

    onConfirm(selected);
    onOpenChange(false);
  }

  const columns = useMemo<ColumnDef<PackagingKitMaterialOption>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => {
          const checked = currentSelectedCodes.includes(row.original.code);
          return (
            <input
              aria-label={row.original.code}
              checked={checked}
              data-testid={`packaging-kit-material-select-${row.original.code}`}
              type={mode === "main" ? "radio" : "checkbox"}
              onChange={() => toggleCode(row.original)}
            />
          );
        },
      },
      {
        accessorKey: "code",
        header: t("pages.packagingKit.materialDialog.materialCode"),
      },
      {
        accessorKey: "name",
        header: t("pages.packagingKit.materialDialog.materialName"),
      },
      {
        accessorKey: "typeName",
        header: t("pages.packagingKit.materialDialog.materialType"),
        cell: ({ getValue }) => (getValue() as string) || "-",
      },
    ],
    [currentSelectedCodes, mode, t],
  );

  return (
    <DialogContent
      className="w-[min(100%-2rem,72rem)] max-w-none gap-0 overflow-hidden p-0"
    >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>

        <div
          className="flex flex-col gap-4 px-6 py-4"
          data-testid={query.isLoading || query.isFetching ? undefined : "packaging-kit-material-dialog"}
        >
          <form
            className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setPageIndex(1);
              setFilters(draftFilters);
            }}
          >
            <Input
              aria-label={t("pages.packagingKit.materialDialog.materialCode")}
              placeholder={t("pages.packagingKit.materialDialog.materialCodePlaceholder")}
              value={draftFilters.materialCode}
              onChange={(event) => {
                setDraftFilters((current) => ({ ...current, materialCode: event.target.value }));
              }}
            />
            <Input
              aria-label={t("pages.packagingKit.materialDialog.materialName")}
              placeholder={t("pages.packagingKit.materialDialog.materialNamePlaceholder")}
              value={draftFilters.materialName}
              onChange={(event) => {
                setDraftFilters((current) => ({ ...current, materialName: event.target.value }));
              }}
            />
            <Button type="submit">
              <SearchIcon data-icon="inline-start" />
              {t("pages.packagingKit.actions.search")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftFilters(packagingKitDefaultMaterialFilters);
                setFilters(packagingKitDefaultMaterialFilters);
                setPageIndex(1);
              }}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t("pages.packagingKit.actions.reset")}
            </Button>
          </form>

          {query.isError ? (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex-1">
                <p className="font-medium">{t("pages.packagingKit.materialDialog.errorTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("pages.packagingKit.materialDialog.errorDescription")}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => void query.refetch()}>
                {t("pages.packagingKit.actions.retry")}
              </Button>
            </div>
          ) : null}

          <DataTable
            className="max-h-80"
            columns={columns}
            data={items}
            getRowId={(row) => row.code}
            loading={query.isLoading || query.isFetching}
            loadingLabel={t("pages.packagingKit.materialDialog.loading")}
            emptyLabel={t("pages.packagingKit.materialDialog.empty")}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t("pages.packagingKit.materialDialog.selectedCount", {
                count: currentSelectedCodes.length,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pageIndex <= 1 || query.isLoading}
                onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
              >
                {t("pages.packagingKit.actions.previousPage")}
              </Button>
              <span>{t("pages.packagingKit.states.page", { page: pageIndex })}</span>
              <Button
                type="button"
                variant="outline"
                disabled={query.isLoading || !canGoNext}
                onClick={() => setPageIndex((current) => current + 1)}
              >
                {t("pages.packagingKit.actions.nextPage")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <ChevronLeftIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.back")}
          </Button>
          <Button
            data-testid="packaging-kit-material-confirm"
            type="button"
            disabled={currentSelectedCodes.length === 0}
            onClick={handleConfirm}
          >
            <CheckIcon data-icon="inline-start" />
            {t("pages.packagingKit.actions.confirm")}
          </Button>
        </DialogFooter>
    </DialogContent>
  );
}

type PackagingKitMaterialDialogProps = {
  open: boolean;
  mode: "main" | "children";
  selectedCodes?: string[];
  selectedItems?: PackagingKitMaterialOption[];
  onConfirm: (rows: PackagingKitMaterialOption[]) => void;
  onOpenChange: (open: boolean) => void;
};

export function PackagingKitMaterialDialog({
  open,
  mode,
  selectedCodes = [],
  selectedItems = [],
  onConfirm,
  onOpenChange,
}: PackagingKitMaterialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PackagingKitMaterialDialogContent
          mode={mode}
          selectedCodes={selectedCodes}
          selectedItems={selectedItems}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}