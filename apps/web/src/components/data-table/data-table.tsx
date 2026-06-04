import * as React from "react";
import {
  type ColumnDef,
  type ColumnPinningPosition,
  type ColumnPinningState,
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

declare module "@tanstack/react-table" {
  // ColumnMeta requires these generic parameters for TanStack declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
    pinned?: Extract<ColumnPinningPosition, "left" | "right">;
  }
}

const ROW_NUMBER_COLUMN_ID = "__rowNumber";
const SELECT_COLUMN_ID = "select";
const ACTIONS_COLUMN_ID = "actions";
const EXPAND_COLUMN_ID = "__expand";
const STICKY_HEADER_CELL_CLASS_NAME = "sticky top-0 z-30 bg-muted";

type DataTableExpandedRowRender<TData> = (context: {
  row: Row<TData>;
}) => React.ReactNode;

type DataTableRowNumberOptions = {
  header?: React.ReactNode;
  startIndex?: number;
  columnIndex?: number;
  headerClassName?: string;
  cellClassName?: string;
};

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
  rowNumber?: boolean | DataTableRowNumberOptions;
  className?: string;
};

function getExpandableRowLabel<TData>(row: Row<TData>) {
  const firstVisibleValue = row
    .getVisibleCells()
    .map((cell) => cell.getValue())
    .find((value) => value !== undefined && value !== null);

  if (firstVisibleValue === undefined || firstVisibleValue === null) {
    return row.id;
  }

  return String(firstVisibleValue);
}

function getRowNumberOptions(
  rowNumber: DataTableProps<unknown, unknown>["rowNumber"]
) {
  if (rowNumber === false) {
    return null;
  }

  if (rowNumber === undefined || rowNumber === true) {
    return {};
  }

  return rowNumber;
}

function clampColumnIndex(columnIndex: number, columnCount: number) {
  return Math.min(Math.max(columnIndex, 0), columnCount);
}

function getColumnDefId<TData, TValue>(column: ColumnDef<TData, TValue>) {
  const columnWithKnownKeys = column as ColumnDef<TData, TValue> & {
    accessorKey?: unknown;
    id?: string;
  };

  if (columnWithKnownKeys.id) {
    return columnWithKnownKeys.id;
  }

  if (typeof columnWithKnownKeys.accessorKey === "string") {
    return columnWithKnownKeys.accessorKey;
  }

  return undefined;
}

function getForcedPinnedSide(columnId: string | undefined) {
  if (columnId === SELECT_COLUMN_ID || columnId === ROW_NUMBER_COLUMN_ID || columnId === EXPAND_COLUMN_ID) {
    return "left";
  }

  if (columnId === ACTIONS_COLUMN_ID) {
    return "right";
  }

  return undefined;
}

function getSpecialColumnDefaultSize(columnId: string | undefined) {
  if (columnId === SELECT_COLUMN_ID) {
    return 48;
  }

  if (columnId === ROW_NUMBER_COLUMN_ID) {
    return 64;
  }

  if (columnId === ACTIONS_COLUMN_ID) {
    return 160;
  }

  return undefined;
}

function applySpecialColumnDefaults<TData, TValue>(
  column: ColumnDef<TData, TValue>
): ColumnDef<TData, TValue> {
  const columnId = getColumnDefId(column);
  const defaultSize = getSpecialColumnDefaultSize(columnId);

  if (defaultSize === undefined) {
    return column;
  }

  return {
    ...column,
    enablePinning: false,
    size: column.size ?? defaultSize
  };
}

function getColumnPinning<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): ColumnPinningState {
  return columns.reduce<Required<ColumnPinningState>>(
    (columnPinning, column) => {
      const columnId = getColumnDefId(column);
      const pinnedSide =
        getForcedPinnedSide(columnId) ?? column.meta?.pinned ?? undefined;

      if (columnId && pinnedSide) {
        columnPinning[pinnedSide].push(columnId);
      }

      return columnPinning;
    },
    {
      left: [],
      right: []
    }
  );
}

function getPinnedColumnClassName(
  column: {
    getIsPinned: () => ColumnPinningPosition;
  },
  className: string | undefined,
  backgroundClassName: string,
  pinnedClassName = "sticky z-20"
) {
  return cn(
    className,
    column.getIsPinned() && pinnedClassName,
    column.getIsPinned() && backgroundClassName
  );
}

function getPinnedColumnStyle(column: {
  getAfter: (position?: ColumnPinningPosition | "center") => number;
  getIsPinned: () => ColumnPinningPosition;
  getSize: () => number;
  getStart: (position?: ColumnPinningPosition | "center") => number;
}): React.CSSProperties | undefined {
  const pinnedSide = column.getIsPinned();

  if (!pinnedSide) {
    return undefined;
  }

  const columnSize = `${column.getSize()}px`;
  const style: React.CSSProperties = {
    minWidth: columnSize,
    width: columnSize
  };

  if (pinnedSide === "left") {
    style.left = `${column.getStart("left")}px`;
  } else {
    style.right = `${column.getAfter("right")}px`;
  }

  return style;
}

function DataTableStateRow({
  colSpan
}: {
  colSpan: number;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 p-0" />
    </TableRow>
  );
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
  rowNumber,
  className
}: DataTableProps<TData, TValue>) {
  const [internalExpanded, setInternalExpanded] = React.useState<ExpandedState>(
    expanded ?? {}
  );
  const rowNumberOptions = getRowNumberOptions(rowNumber);
  const hasRowNumberColumn = Boolean(rowNumberOptions);
  const hasExpandColumn = Boolean(renderExpandedRow);
  const currentExpanded = expanded ?? internalExpanded;
  const columnCount =
    columns.length + (hasExpandColumn ? 1 : 0) + (hasRowNumberColumn ? 1 : 0);
  const tableColumns = React.useMemo(() => {
    const columnsWithDefaults = columns.map(applySpecialColumnDefaults);

    const result = hasExpandColumn
      ? ([
          {
            id: EXPAND_COLUMN_ID,
            enablePinning: false,
            size: 40,
            header: () => <span className="sr-only">展开</span>,
            cell: ({ row }) => {
              const expandLabel = getExpandableRowLabel(row);
              return row.getCanExpand() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={row.getIsExpanded()}
                  onClick={row.getToggleExpandedHandler()}
                >
                  <span className="sr-only">
                    {row.getIsExpanded() ? "收起" : "展开"} {expandLabel}
                  </span>
                  {row.getIsExpanded() ? (
                    <ChevronDown aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                </Button>
              ) : null;
            },
            meta: {
              headerClassName: "w-10",
              cellClassName: "w-10"
            }
          } as ColumnDef<TData, TValue>,
          ...columnsWithDefaults
        ] as ColumnDef<TData, TValue>[])
      : columnsWithDefaults;

    if (!rowNumberOptions) {
      return result;
    }

    const rowNumberColumnIndex = clampColumnIndex(
      rowNumberOptions?.columnIndex ?? 0,
      columns.length
    );
    const insertIndex = hasExpandColumn
      ? rowNumberColumnIndex + 1
      : rowNumberColumnIndex;

    const rowNumberColumn: ColumnDef<TData, TValue> = {
      id: ROW_NUMBER_COLUMN_ID,
      enablePinning: false,
      size: 64,
      header: () => rowNumberOptions.header ?? "#",
      cell: ({ row }) => (rowNumberOptions.startIndex ?? 1) + row.index,
      meta: {
        headerClassName: cn(
          "w-16 text-center",
          rowNumberOptions.headerClassName
        ),
        cellClassName: cn(
          "w-16 text-center tabular-nums text-muted-foreground",
          rowNumberOptions.cellClassName
        )
      }
    };

    return [
      ...result.slice(0, insertIndex),
      rowNumberColumn,
      ...result.slice(insertIndex)
    ];
  }, [columns, rowNumberOptions, hasExpandColumn]);
  const columnPinning = React.useMemo(
    () => getColumnPinning(tableColumns),
    [tableColumns]
  );

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
    columns: tableColumns,
    getRowId,
    getRowCanExpand,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: handleExpandedChange,
    state: {
      columnPinning,
      expanded: currentExpanded
    }
  });

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border",
        className
      )}
    >
      <div
        data-slot="data-table-scroll-area"
        className="min-h-0 flex-1 overflow-auto relative"
      >
        <Table containerClassName="overflow-visible">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={getPinnedColumnClassName(
                      header.column,
                      cn(
                        STICKY_HEADER_CELL_CLASS_NAME,
                        header.column.columnDef.meta?.headerClassName
                      ),
                      "bg-muted",
                      "sticky top-0 z-40"
                    )}
                    style={getPinnedColumnStyle(header.column)}
                  >
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
            {loading || !table.getRowModel().rows.length ? (
              <DataTableStateRow colSpan={columnCount} />
            ) : (
              table.getRowModel().rows.map((row) => {
                return (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsExpanded() && "expanded"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={getPinnedColumnClassName(
                            cell.column,
                            cell.column.columnDef.meta?.cellClassName,
                            "bg-background"
                          )}
                          style={getPinnedColumnStyle(cell.column)}
                        >
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
            )}
          </TableBody>
        </Table>
        {(loading || !table.getRowModel().rows.length) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span>{loading ? loadingLabel : emptyLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export { DataTable };
export type { DataTableProps };
