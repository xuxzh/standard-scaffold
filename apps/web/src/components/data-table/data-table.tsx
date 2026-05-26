import * as React from "react";
import {
  type ColumnDef,
  type ExpandedState,
  type OnChangeFn,
  type Row,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableExpandedRowRender<TData> = (context: {
  row: Row<TData>;
}) => React.ReactNode;

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  expanded?: ExpandedState;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderExpandedRow?: DataTableExpandedRowRender<TData>;
  className?: string;
};

function getExpandableRowLabel<TData>(row: Row<TData>) {
  const firstVisibleValue = row.getVisibleCells()[0]?.getValue();

  if (firstVisibleValue === undefined || firstVisibleValue === null) {
    return row.id;
  }

  return String(firstVisibleValue);
}

function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  loading = false,
  loadingLabel = "加载中",
  emptyLabel = "暂无数据",
  expanded,
  getRowCanExpand,
  renderExpandedRow,
  className
}: DataTableProps<TData, TValue>) {
  const [internalExpanded, setInternalExpanded] = React.useState<ExpandedState>(
    expanded ?? {}
  );
  const hasExpandColumn = Boolean(renderExpandedRow);
  const currentExpanded = expanded ?? internalExpanded;
  const columnCount = columns.length + (hasExpandColumn ? 1 : 0);

  React.useEffect(() => {
    if (expanded !== undefined) {
      setInternalExpanded(expanded);
    }
  }, [expanded]);

  const handleExpandedChange: OnChangeFn<ExpandedState> = (updater) => {
    setInternalExpanded((previous) =>
      typeof updater === "function" ? updater(previous) : updater
    );
  };

  // TanStack Table intentionally returns a mutable table instance with methods.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getRowCanExpand,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: handleExpandedChange,
    state: {
      expanded: currentExpanded
    }
  });

  return (
    <div className={cn("overflow-hidden rounded-md border", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {hasExpandColumn ? (
                <TableHead className="w-10">
                  <span className="sr-only">展开</span>
                </TableHead>
              ) : null}
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {loadingLabel}
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const expandLabel = getExpandableRowLabel(row);

              return (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsExpanded() && "expanded"}>
                    {hasExpandColumn ? (
                      <TableCell className="w-10">
                        {row.getCanExpand() ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-expanded={row.getIsExpanded()}
                            onClick={row.getToggleExpandedHandler()}
                          >
                            <span className="sr-only">
                              {row.getIsExpanded() ? "收起" : "展开"}{" "}
                              {expandLabel}
                            </span>
                            {row.getIsExpanded() ? (
                              <ChevronDown aria-hidden="true" />
                            ) : (
                              <ChevronRight aria-hidden="true" />
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && renderExpandedRow ? (
                    <TableRow>
                      <TableCell
                        colSpan={columnCount}
                        className="bg-muted/30 whitespace-normal"
                      >
                        {renderExpandedRow({ row })}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export { DataTable };
export type { DataTableProps };
