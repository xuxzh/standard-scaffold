import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaterialPickerDialog } from "@/features/mes/material/material-picker-dialog";
import type { MaterialPickerRecord } from "@/features/mes/material/material-picker-contract";
import "@/i18n/config";

const material: MaterialPickerRecord = {
  id: "1",
  materialCode: "MAT001",
  materialName: "Main material",
  materialSpecification: "SPEC-A",
  materialType: "Finished product",
  unit: "PCS",
};

function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("MaterialPickerDialog data source", () => {
  it("loads records from the injected data source", async () => {
    const search = vi.fn(async () => ({
      items: [material],
      totalCount: 1,
    }));

    renderWithQueryClient(
      <MaterialPickerDialog
        open
        dataSource={{
          queryKey: ["test", "custom-material-picker"],
          search,
        }}
        onSelect={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            materialCode: "",
            materialName: "",
          },
          pageIndex: 1,
          pageSize: 20,
          signal: expect.any(AbortSignal),
        }),
      );
    });
    expect(
      await screen.findByRole("cell", { name: material.materialCode }),
    ).toBeInTheDocument();
  });
});
