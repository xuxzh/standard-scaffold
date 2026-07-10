import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function getPaginationItems(
  pageIndex: number,
  totalPages: number,
): PaginationItem[] {
  const windowSize = 5;

  if (totalPages <= windowSize + 1) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const lastWindowPage = totalPages - 1;
  const currentWindowPage = Math.min(pageIndex, lastWindowPage);
  const latestWindowStart = lastWindowPage - windowSize + 1;
  const windowStart = Math.max(
    1,
    Math.min(currentWindowPage - Math.floor(windowSize / 2), latestWindowStart),
  );
  const windowPages = Array.from(
    { length: windowSize },
    (_, index) => windowStart + index,
  );
  const items: PaginationItem[] = [];

  if (windowStart > 1) {
    items.push("ellipsis-start");
  }

  items.push(...windowPages);

  if (windowPages[windowPages.length - 1] < lastWindowPage) {
    items.push("ellipsis-end");
  }

  items.push(totalPages);

  return items;
}

export type DataTablePaginationProps = {
  /** 1-based page index (matches backend convention) */
  pageIndex: number;
  /** Page size */
  pageSize: number;
  /** Total number of items across all pages */
  totalCount: number;
  /** Number of currently selected items (default 0) */
  selectedCount?: number;
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
  selectedCount = 0,
  onPageIndexChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showPageSizeSelector = true,
  className,
}: DataTablePaginationProps) {
  const { t } = useTranslation("common");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginationItems = getPaginationItems(pageIndex, totalPages);

  const canGoPrevious = pageIndex > 1 && !loading;
  const canGoNext = pageIndex < totalPages && !loading;

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 py-1",
        className,
      )}
    >
      <span
        className="text-sm font-semibold text-foreground"
        aria-label={t("pagination.summaryAria", {
          total: totalCount,
          selected: selectedCount,
        })}
      >
        <Trans
          i18nKey="pagination.summary"
          ns="common"
          values={{ total: totalCount, selected: selectedCount }}
          components={{
            total: (
              <strong className="rounded-sm bg-primary px-1 font-semibold text-primary-foreground tabular-nums" />
            ),
            selected: (
              <strong className="rounded-sm bg-primary px-1 font-semibold text-primary-foreground tabular-nums" />
            ),
          }}
        />
      </span>
      <nav
        aria-label={t("pagination.paginationLabel")}
        className="flex flex-wrap items-center justify-end gap-1"
      >
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
        {paginationItems.map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              type="button"
              variant="outline"
              size="icon-sm"
              className={cn(
                item === pageIndex &&
                  "border-primary text-primary hover:bg-primary/10 hover:text-primary",
              )}
              disabled={loading || totalCount === 0}
              aria-current={item === pageIndex ? "page" : undefined}
              aria-label={t("pagination.goToPage", { page: item })}
              onClick={() => onPageIndexChange(item)}
            >
              {item}
            </Button>
          ) : (
            <span
              key={item}
              aria-hidden="true"
              className="flex size-8 items-center justify-center text-muted-foreground"
            >
              …
            </span>
          ),
        )}
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
        {showPageSizeSelector ? (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange?.(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[6.5rem]"
              aria-label={t("pagination.pageSize")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {t("pagination.pageSizeOption", { size })}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}
      </nav>
    </div>
  );
}

export { DataTablePagination };
