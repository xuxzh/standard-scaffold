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
import type { PackagingRuleOption } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { usePackagingRuleOptionsQuery } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-queries";

type MaterialPackagingRelationRuleDialogContentProps = {
  onConfirm: (rule: PackagingRuleOption) => void;
  onOpenChange: (open: boolean) => void;
};

function MaterialPackagingRelationRuleDialogContent({
  onConfirm,
  onOpenChange,
}: MaterialPackagingRelationRuleDialogContentProps) {
  const { t } = useTranslation("common");
  const [ruleCode, setRuleCode] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [filters, setFilters] = useState({
    ruleCode: "",
    ruleName: "",
  });
  const [pageIndex, setPageIndex] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const query = usePackagingRuleOptionsQuery(
    filters.ruleCode,
    filters.ruleName,
    pageIndex,
    true,
  );

  const items = query.data?.items ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const canGoNext =
    items.length > 0 && pageIndex * 20 < totalCount;

  function handleConfirm() {
    if (!selectedCode) {
      return;
    }

    const rule = items.find((item) => item.ruleCode === selectedCode);

    if (rule) {
      onConfirm(rule);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%-2rem,48rem)] max-w-none gap-0 overflow-hidden p-0"
        data-testid="material-packaging-relation-rule-dialog"
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {t("pages.materialPackagingRelation.ruleDialog.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4 max-h-[calc(100vh-14rem)]">
          <form
            className="grid gap-4 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setPageIndex(1);
              setFilters({ ruleCode, ruleName });
            }}
          >
            <Input
              aria-label={t(
                "pages.materialPackagingRelation.ruleDialog.ruleCode",
              )}
              placeholder={t(
                "pages.materialPackagingRelation.ruleDialog.ruleCodePlaceholder",
              )}
              value={ruleCode}
              onChange={(event) => setRuleCode(event.target.value)}
            />
            <Input
              aria-label={t(
                "pages.materialPackagingRelation.ruleDialog.ruleName",
              )}
              placeholder={t(
                "pages.materialPackagingRelation.ruleDialog.ruleNamePlaceholder",
              )}
              value={ruleName}
              onChange={(event) => setRuleName(event.target.value)}
            />
            <Button type="submit">
              <SearchIcon data-icon="inline-start" />
              {t("pages.materialPackagingRelation.actions.search")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRuleCode("");
                setRuleName("");
                setFilters({ ruleCode: "", ruleName: "" });
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
                  {t("pages.materialPackagingRelation.ruleDialog.errorTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("pages.materialPackagingRelation.ruleDialog.errorDescription")}
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
                    {t("pages.materialPackagingRelation.ruleDialog.ruleCode")}
                  </th>
                  <th className="px-4 py-3">
                    {t("pages.materialPackagingRelation.ruleDialog.ruleName")}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "pages.materialPackagingRelation.ruleDialog.detailCount",
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading || query.isFetching ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={4}>
                      {t("pages.materialPackagingRelation.ruleDialog.loading")}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={4}>
                      {t("pages.materialPackagingRelation.ruleDialog.empty")}
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const isSelected =
                      selectedCode === item.ruleCode;

                    return (
                      <tr key={item.ruleCode} className="border-t">
                        <td className="px-4 py-3">
                          <input
                            aria-label={item.ruleCode}
                            checked={isSelected}
                            data-testid={`rule-dialog-select-${item.ruleCode}`}
                            type="radio"
                            name="rule-dialog-selection"
                            onChange={() =>
                              setSelectedCode(item.ruleCode)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          {(pageIndex - 1) * 20 + index + 1}
                        </td>
                        <td className="px-4 py-3">{item.ruleCode}</td>
                        <td className="px-4 py-3">{item.ruleName}</td>
                        <td className="px-4 py-3">
                          {item.details.length}
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
                    "pages.materialPackagingRelation.ruleDialog.selected",
                    { code: selectedCode },
                  )
                : t(
                    "pages.materialPackagingRelation.ruleDialog.noneSelected",
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
            data-testid="rule-dialog-confirm"
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

type MaterialPackagingRelationRuleDialogProps = {
  open: boolean;
  onConfirm: (rule: PackagingRuleOption) => void;
  onOpenChange: (open: boolean) => void;
};

export function MaterialPackagingRelationRuleDialog({
  open,
  onConfirm,
  onOpenChange,
}: MaterialPackagingRelationRuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <MaterialPackagingRelationRuleDialogContent
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}
