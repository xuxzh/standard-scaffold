import { fireEvent, render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { DataTable } from "@/components/data-table/data-table";

type InventoryBatch = {
  id: string;
  sku: string;
  quantity: number;
  locations: string[];
};

const columns: ColumnDef<InventoryBatch>[] = [
  {
    accessorKey: "sku",
    header: "SKU"
  },
  {
    accessorKey: "quantity",
    header: "数量",
    cell: ({ row }) => `${row.original.quantity} 件`
  }
];

const rows: InventoryBatch[] = [
  {
    id: "batch-1",
    sku: "A-100",
    quantity: 12,
    locations: ["A01", "A02"]
  },
  {
    id: "batch-2",
    sku: "B-200",
    quantity: 5,
    locations: []
  }
];

describe("DataTable", () => {
  it("renders headers and cells from column definitions", () => {
    render(<DataTable columns={columns} data={rows} getRowId={(row) => row.id} />);

    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "数量" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "A-100" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "12 件" })).toBeInTheDocument();
  });

  it("shows an empty row when there is no data", () => {
    render(<DataTable columns={columns} data={[]} emptyLabel="暂无库存批次" />);

    expect(screen.getByRole("cell", { name: "暂无库存批次" })).toBeInTheDocument();
  });

  it("shows a loading row while data is loading", () => {
    render(<DataTable columns={columns} data={[]} loading loadingLabel="库存加载中" />);

    expect(screen.getByRole("cell", { name: "库存加载中" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "暂无数据" })).not.toBeInTheDocument();
  });

  it("renders row numbers by default", () => {
    render(<DataTable columns={columns} data={rows} getRowId={(row) => row.id} />);

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["#", "SKU", "数量"]);
    expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });

  it("hides row numbers when disabled", () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        rowNumber={false}
      />
    );

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["SKU", "数量"]);
  });

  it("renders custom row numbers when configured", () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        rowNumber={{
          header: "No.",
          startIndex: 11,
          columnIndex: 1
        }}
      />
    );

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["No.", "SKU", "数量"]);
    expect(screen.getByRole("columnheader", { name: "No." })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "11" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "12" })).toBeInTheDocument();
  });

  it("includes the row number column in state row spans", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        loading
        loadingLabel="库存加载中"
        rowNumber={{ header: "No." }}
      />
    );

    expect(screen.getByRole("cell", { name: "库存加载中" })).toHaveAttribute(
      "colspan",
      "3"
    );
  });

  it("applies column class names to headers and cells", () => {
    render(
      <DataTable
        columns={[
          {
            accessorKey: "sku",
            header: "SKU",
            meta: {
              headerClassName: "min-w-28",
              cellClassName: "font-medium"
            }
          }
        ]}
        data={rows}
        getRowId={(row) => row.id}
      />
    );

    expect(screen.getByRole("columnheader", { name: "SKU" })).toHaveClass(
      "min-w-28"
    );
    expect(screen.getByRole("cell", { name: "A-100" })).toHaveClass(
      "font-medium"
    );
  });

  it("pins ordinary columns from column metadata", () => {
    render(
      <DataTable
        columns={[
          {
            accessorKey: "sku",
            header: "SKU",
            meta: {
              headerClassName: "bg-muted/40",
              cellClassName: "bg-muted/40",
              pinned: "left"
            }
          },
          {
            accessorKey: "quantity",
            header: "数量",
            cell: ({ row }) => `${row.original.quantity} 件`,
            meta: {
              pinned: "right"
            }
          }
        ]}
        data={rows}
        getRowId={(row) => row.id}
        rowNumber={false}
      />
    );

    expect(screen.getByRole("columnheader", { name: "SKU" })).toHaveClass(
      "sticky"
    );
    expect(screen.getByRole("columnheader", { name: "SKU" })).toHaveStyle({
      left: "0px"
    });
    expect(screen.getByRole("columnheader", { name: "SKU" })).toHaveClass(
      "bg-muted"
    );
    expect(screen.getByRole("columnheader", { name: "SKU" })).not.toHaveClass(
      "bg-muted/40"
    );
    expect(screen.getByRole("cell", { name: "A-100" })).toHaveStyle({
      left: "0px"
    });
    expect(screen.getByRole("cell", { name: "A-100" })).toHaveClass(
      "bg-background"
    );
    expect(screen.getByRole("cell", { name: "A-100" })).not.toHaveClass(
      "bg-muted/40"
    );
    expect(screen.getByRole("columnheader", { name: "数量" })).toHaveClass(
      "sticky"
    );
    expect(screen.getByRole("columnheader", { name: "数量" })).toHaveStyle({
      right: "0px"
    });
    expect(screen.getByRole("cell", { name: "12 件" })).toHaveStyle({
      right: "0px"
    });
  });

  it("forces selection, row number, and actions columns to their default pinned sides", () => {
    render(
      <DataTable
        columns={[
          {
            id: "select",
            header: "选择",
            cell: () => <input aria-label="选择批次" type="checkbox" />,
            meta: {
              pinned: "right"
            }
          },
          {
            accessorKey: "sku",
            header: "SKU"
          },
          {
            id: "actions",
            header: "操作",
            cell: () => <button type="button">编辑</button>,
            meta: {
              pinned: "left"
            }
          }
        ]}
        data={rows}
        getRowId={(row) => row.id}
        rowNumber={{ columnIndex: 1 }}
      />
    );

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["选择", "#", "SKU", "操作"]);
    expect(screen.getByRole("columnheader", { name: "选择" })).toHaveStyle({
      left: "0px"
    });
    expect(screen.getByRole("columnheader", { name: "#" })).toHaveStyle({
      left: "48px"
    });
    expect(screen.getByRole("columnheader", { name: "操作" })).toHaveStyle({
      right: "0px"
    });
  });

  it("keeps pinned selection and row number columns at their offset widths", () => {
    render(
      <DataTable
        columns={[
          {
            id: "select",
            header: "选择",
            cell: () => <input aria-label="选择批次" type="checkbox" />
          },
          {
            accessorKey: "sku",
            header: "SKU"
          }
        ]}
        data={rows}
        getRowId={(row) => row.id}
        rowNumber={{ columnIndex: 1 }}
      />
    );

    expect(screen.getByRole("columnheader", { name: "选择" })).toHaveStyle({
      minWidth: "48px",
      width: "48px"
    });
    expect(screen.getByRole("columnheader", { name: "#" })).toHaveStyle({
      left: "48px",
      minWidth: "64px",
      width: "64px"
    });
  });

  it("expands a parent row to reveal child content", () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        getRowCanExpand={(row) => row.original.locations.length > 0}
        renderExpandedRow={({ row }) => (
          <div>
            库位：
            {row.original.locations.join("、")}
          </div>
        )}
      />
    );

    expect(screen.queryByText("库位：A01、A02")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开 A-100" }));

    expect(screen.getByText("库位：A01、A02")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展开 B-200" })).not.toBeInTheDocument();
  });
});
