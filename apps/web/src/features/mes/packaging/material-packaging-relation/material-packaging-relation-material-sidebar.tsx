import { SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MaterialOption } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { useMaterialOptionsQuery } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-queries";

type MaterialPackagingRelationMaterialSidebarProps = {
  selectedMaterial: MaterialOption | null;
  onSelect: (material: MaterialOption) => void;
  onClear: () => void;
};

export function MaterialPackagingRelationMaterialSidebar({
  selectedMaterial,
  onSelect,
  onClear,
}: MaterialPackagingRelationMaterialSidebarProps) {
  const { t } = useTranslation("common");
  const [keyword, setKeyword] = useState("");
  const [pageIndex, setPageIndex] = useState(1);

  const query = useMaterialOptionsQuery(keyword, pageIndex, "sidebar", true);
  const items = query.data?.items ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const canGoNext =
    items.length > 0 && pageIndex * 50 < totalCount;

  return (
    <aside
      className="flex min-h-0 w-64 shrink-0 flex-col gap-3 overflow-hidden rounded-md border p-3"
      data-testid="material-packaging-relation-sidebar"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t("pages.materialPackagingRelation.sidebar.title")}
        </h3>
        {selectedMaterial ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="material-packaging-relation-sidebar-clear"
            onClick={() => {
              setKeyword("");
              setPageIndex(1);
              onClear();
            }}
          >
            <XIcon data-icon="inline-start" size={14} />
            {t("pages.materialPackagingRelation.sidebar.clear")}
          </Button>
        ) : null}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPageIndex(1);
        }}
      >
        <Input
          aria-label={t("pages.materialPackagingRelation.sidebar.searchPlaceholder")}
          placeholder={t("pages.materialPackagingRelation.sidebar.searchPlaceholder")}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Button type="submit" size="icon" variant="outline">
          <SearchIcon size={16} />
        </Button>
      </form>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {query.isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("pages.materialPackagingRelation.sidebar.loading")}
          </p>
        ) : query.isError ? (
          <div className="space-y-2 py-2">
            <p className="text-center text-sm text-destructive">
              {t("pages.materialPackagingRelation.sidebar.error")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => void query.refetch()}
            >
              {t("pages.materialPackagingRelation.actions.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("pages.materialPackagingRelation.sidebar.empty")}
          </p>
        ) : (
          items.map((item) => {
            const isSelected =
              selectedMaterial?.materialCode === item.materialCode;

            return (
              <button
                key={item.materialCode}
                type="button"
                data-testid={`material-sidebar-item-${item.materialCode}`}
                className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => {
                  onSelect(item);
                  setKeyword("");
                }}
              >
                <div className="truncate font-medium">{item.materialCode}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.materialName}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pageIndex <= 1 || query.isLoading}
          onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
        >
          {t("pages.materialPackagingRelation.actions.previousPage")}
        </Button>
        <span>
          {t("pages.materialPackagingRelation.states.page", { page: pageIndex })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={query.isLoading || !canGoNext}
          onClick={() => setPageIndex((current) => current + 1)}
        >
          {t("pages.materialPackagingRelation.actions.nextPage")}
        </Button>
      </div>
    </aside>
  );
}
