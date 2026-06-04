import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type DataTablePaginationProps = {
  /** 1-based page index (matches backend convention) */
  pageIndex: number;
  /** Page size */
  pageSize: number;
  /** Total number of items across all pages */
  totalCount: number;
  /** Called when page changes (1-based) */
  onPageIndexChange: (pageIndex: number) => void;
  /** Called when page size changes; caller should reset pageIndex to 1 */
  onPageSizeChange?: (pageSize: number) => void;
  /** Disable all navigation during loading */
  loading?: boolean;
  /** Page size options (default [10, 20, 50, 100]) */
  pageSizeOptions?: readonly number[];
  /** Show page size selector (default true) */
  showPageSizeSelector?: boolean;
  className?: string;
};

function DataTablePagination({
  pageIndex,
  pageSize,
  totalCount,
  onPageIndexChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showPageSizeSelector = true,
  className,
}: DataTablePaginationProps) {
  const { t } = useTranslation("common");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const to = Math.min(pageIndex * pageSize, totalCount);

  const canGoPrevious = pageIndex > 1 && !loading;
  const canGoNext = pageIndex < totalPages && !loading;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-2 py-1",
        className,
      )}
    >
      {showPageSizeSelector ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("pagination.pageSize")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange?.(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div />
      )}
      <span className="text-sm text-muted-foreground">
        {t("pagination.showing", { from, to, total: totalCount })}
      </span>
      <nav className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canGoPrevious}
          onClick={() => onPageIndexChange(1)}
          aria-label={t("pagination.firstPage")}
        >
          <ChevronsLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canGoPrevious}
          onClick={() => onPageIndexChange(pageIndex - 1)}
          aria-label={t("pagination.previousPage")}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-[6rem] text-center text-sm text-muted-foreground tabular-nums">
          {t("pagination.page", { current: pageIndex, total: totalPages })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canGoNext}
          onClick={() => onPageIndexChange(pageIndex + 1)}
          aria-label={t("pagination.nextPage")}
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canGoNext}
          onClick={() => onPageIndexChange(totalPages)}
          aria-label={t("pagination.lastPage")}
        >
          <ChevronsRight />
        </Button>
      </nav>
    </div>
  );
}

export { DataTablePagination };
