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
