import { CheckIcon, ChevronLeftIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MaterialOption } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
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
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({ keyword: "" });
  const [pageIndex, setPageIndex] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const query = useMaterialOptionsQuery(
    filters.keyword,
    pageIndex,
    "form-material",
    true,
  );

  const items = query.data?.items ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const canGoNext =
    items.length > 0 && pageIndex * 50 < totalCount;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setPageIndex(1);
              setFilters({ keyword });
            }}
          >
            <Input
              aria-label={t(
                "pages.materialPackagingRelation.materialDialog.searchPlaceholder",
              )}
              placeholder={t(
                "pages.materialPackagingRelation.materialDialog.searchPlaceholder",
              )}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Button type="submit">
              <SearchIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.search")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setKeyword("");
                setFilters({ keyword: "" });
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

          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="w-16 px-4 py-3">#</th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.materialDialog.materialCode",
                    )}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.materialDialog.materialName",
                    )}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.materialDialog.materialType",
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading || query.isFetching ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={4}>
                      {t(
                        "pages.materialPackagingRelation.materialDialog.loading",
                      )}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={4}>
                      {t("pages.materialPackagingRelation.materialDialog.empty")}
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const isSelected =
                      selectedCode === item.materialCode;

                    return (
                      <tr key={item.materialCode} className="border-t">
                        <td className="px-4 py-3">
                          <input
                            aria-label={item.materialCode}
                            checked={isSelected}
                            data-testid={`material-dialog-select-${item.materialCode}`}
                            type="radio"
                            name="material-dialog-selection"
                            onChange={() =>
                              setSelectedCode(item.materialCode)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          {(pageIndex - 1) * 50 + index + 1}
                        </td>
                        <td className="px-4 py-3">{item.materialCode}</td>
                        <td className="px-4 py-3">
                          {item.materialName}
                        </td>
                        <td className="px-4 py-3">
                          {item.materialTypeName || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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
    </Dialog>
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
