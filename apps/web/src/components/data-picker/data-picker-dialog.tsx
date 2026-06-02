import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type DataPickerSearchParams<TFilters> = {
  filters: TFilters;
  pageIndex: number;
  pageSize: number;
  signal?: AbortSignal;
};

export type DataPickerSearchResult<TRecord> = {
  items: TRecord[];
  totalCount: number;
};

export type DataPickerRenderFiltersContext<TFilters> = {
  values: TFilters;
  setValues: React.Dispatch<React.SetStateAction<TFilters>>;
  submit: () => void;
  reset: () => void;
  loading: boolean;
};

export type DataPickerDialogMessages = {
  loading: string;
  empty: string;
  select: string;
  back: string;
  previousPage?: string;
  nextPage?: string;
  page?: (pageIndex: number) => string;
  total?: (totalCount: number) => string;
  errorTitle?: string;
  errorDescription?: string;
  retry?: string;
};

export type DataPickerDialogProps<TRecord, TFilters> = {
  open: boolean;
  title: string;
  queryKey: readonly unknown[];
  defaultFilters: TFilters;
  pageSize?: number;
  columns: ColumnDef<TRecord>[];
  getRowId: (record: TRecord) => string;
  search: (
    params: DataPickerSearchParams<TFilters>,
  ) => Promise<DataPickerSearchResult<TRecord>>;
  renderFilters: (
    context: DataPickerRenderFiltersContext<TFilters>,
  ) => React.ReactNode;
  onSelect: (record: TRecord) => void;
  onOpenChange: (open: boolean) => void;
  messages: DataPickerDialogMessages;
  className?: string;
};

type DataPickerDialogBodyProps<TRecord, TFilters> = Omit<
  DataPickerDialogProps<TRecord, TFilters>,
  "open"
> & {
  pageSize: number;
};

function DataPickerDialogBody<TRecord, TFilters>({
  title,
  queryKey,
  defaultFilters,
  pageSize,
  columns,
  getRowId,
  search,
  renderFilters,
  onSelect,
  onOpenChange,
  messages,
  className,
}: DataPickerDialogBodyProps<TRecord, TFilters>) {
  const [values, setValues] = React.useState(defaultFilters);
  const [submittedFilters, setSubmittedFilters] =
    React.useState(defaultFilters);
  const [pageIndex, setPageIndex] = React.useState(1);

  const query = useQuery({
    queryKey: [...queryKey, submittedFilters, pageIndex, pageSize],
    queryFn: async ({ signal }) =>
      await search({
        filters: submittedFilters,
        pageIndex,
        pageSize,
        signal,
      }),
  });

  const records = query.data?.items ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const canGoPrevious = pageIndex > 1 && !query.isFetching;
  const canGoNext =
    records.length > 0 && pageIndex * pageSize < totalCount && !query.isFetching;

  const pickerColumns = React.useMemo<ColumnDef<TRecord>[]>(
    () => [
      ...columns,
      {
        id: "actions",
        header: messages.select,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() => {
              onSelect(row.original);
              onOpenChange(false);
            }}
          >
            <PlusIcon data-icon="inline-start" />
            {messages.select}
          </Button>
        ),
      },
    ],
    [columns, messages.select, onOpenChange, onSelect],
  );

  function submit() {
    setPageIndex(1);
    setSubmittedFilters(values);
  }

  function reset() {
    setValues(defaultFilters);
    setPageIndex(1);
    setSubmittedFilters(defaultFilters);
  }

  return (
    <DialogContent
      className={cn(
        "grid max-h-[min(90vh,48rem)] w-[min(100%-2rem,72rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0",
        className,
      )}
    >
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-4 px-6 py-4">
        {renderFilters({
          values,
          setValues,
          submit,
          reset,
          loading: query.isFetching,
        })}

        {query.isError ? (
          <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex-1">
              {messages.errorTitle ? (
                <p className="font-medium">{messages.errorTitle}</p>
              ) : null}
              {messages.errorDescription ? (
                <p className="text-sm text-muted-foreground">
                  {messages.errorDescription}
                </p>
              ) : null}
            </div>
            {messages.retry ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void query.refetch()}
              >
                {messages.retry}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 overflow-auto">
          <DataTable
            columns={pickerColumns}
            data={query.isError ? [] : records}
            getRowId={(record) => getRowId(record)}
            loading={query.isLoading || query.isFetching}
            loadingLabel={messages.loading}
            emptyLabel={messages.empty}
            rowNumber={{
              startIndex: (pageIndex - 1) * pageSize + 1,
            }}
          />
        </div>
      </div>

      <DialogFooter className="border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {messages.total ? <span>{messages.total(totalCount)}</span> : null}
          {messages.page ? <span>{messages.page(pageIndex)}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {messages.previousPage ? (
            <Button
              type="button"
              variant="outline"
              disabled={!canGoPrevious}
              onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              {messages.previousPage}
            </Button>
          ) : null}
          {messages.nextPage ? (
            <Button
              type="button"
              variant="outline"
              disabled={!canGoNext}
              onClick={() => setPageIndex((current) => current + 1)}
            >
              {messages.nextPage}
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            {messages.back}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export function DataPickerDialog<TRecord, TFilters>({
  open,
  pageSize = 20,
  ...props
}: DataPickerDialogProps<TRecord, TFilters>) {
  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      {open ? (
        <DataPickerDialogBody<TRecord, TFilters>
          {...props}
          pageSize={pageSize}
        />
      ) : null}
    </Dialog>
  );
}
