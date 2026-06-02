import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import {
  DataPickerDialog,
  type DataPickerRenderFiltersContext,
} from "@/components/data-picker/data-picker-dialog";

type TestRecord = {
  id: string;
  code: string;
  name: string;
};

type TestFilters = {
  code: string;
};

const columns: ColumnDef<TestRecord>[] = [
  {
    accessorKey: "code",
    header: "Code",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
];

const defaultFilters = {
  code: "",
};

const messages = {
  loading: "Loading records",
  empty: "No records",
  select: "Select",
  back: "Back",
};

function renderPicker({
  search,
  onSelect = vi.fn(),
  onOpenChange = vi.fn(),
}: {
  search: Parameters<typeof DataPickerDialog<TestRecord, TestFilters>>[0]["search"];
  onSelect?: (record: TestRecord) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <DataPickerDialog<TestRecord, TestFilters>
        open
        title="Pick material"
        queryKey={["test-picker"]}
        defaultFilters={defaultFilters}
        columns={columns}
        getRowId={(record) => record.id}
        search={search}
        renderFilters={(context) => <TestFilterForm {...context} />}
        onSelect={onSelect}
        onOpenChange={onOpenChange}
        messages={messages}
      />
    </QueryClientProvider>,
  );
}

function TestFilterForm({
  values,
  setValues,
  submit,
  reset,
  loading,
}: DataPickerRenderFiltersContext<TestFilters>) {
  return (
    <form
      aria-label="Filters"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        aria-label="Code"
        value={values.code}
        onChange={(event) =>
          setValues((current) => ({ ...current, code: event.target.value }))
        }
      />
      <button type="submit" disabled={loading}>
        Search
      </button>
      <button type="button" onClick={reset}>
        Reset
      </button>
    </form>
  );
}

describe("DataPickerDialog", () => {
  it("loads rows and returns the selected record", async () => {
    const row = {
      id: "1",
      code: "MAT_001",
      name: "Cylinder",
    };
    const search = vi.fn(async () => ({
      items: [row],
      totalCount: 1,
    }));
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();

    renderPicker({ search, onSelect, onOpenChange });

    expect(await screen.findByRole("cell", { name: row.code })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: messages.select }));

    expect(onSelect).toHaveBeenCalledWith(row);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits changed filters and resets to defaults", async () => {
    const search = vi.fn(async ({ filters }: { filters: TestFilters }) => ({
      items: [
        {
          id: filters.code || "1",
          code: filters.code || "MAT_001",
          name: filters.code ? "Searched" : "Default",
        },
      ],
      totalCount: 1,
    }));

    renderPicker({ search });

    await waitFor(() => {
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: defaultFilters,
          pageIndex: 1,
          pageSize: 20,
        }),
      );
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Code" }), {
      target: { value: "MAT_009" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("cell", { name: "MAT_009" });
    expect(search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: {
          code: "MAT_009",
        },
        pageIndex: 1,
        pageSize: 20,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Code" })).toHaveValue("");
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: defaultFilters,
          pageIndex: 1,
          pageSize: 20,
        }),
      );
    });
  });
});
