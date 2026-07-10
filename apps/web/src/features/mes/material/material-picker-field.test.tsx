import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaterialPickerDialog } from "@/features/mes/material/material-picker-dialog";
import type { MaterialPickerRecord } from "@/features/mes/material/material-picker-contract";
import { MaterialPickerField } from "@/features/mes/material/material-picker-field";
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

describe("MaterialPickerField", () => {
  it("shows the controlled material code and opens the picker", async () => {
    const search = vi.fn(async () => ({
      items: [material],
      totalCount: 1,
    }));

    renderWithQueryClient(
      <MaterialPickerField
        inputId="main-material"
        value={material}
        dataSource={{ queryKey: ["test", "material-field"], search }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue(material.materialCode);

    fireEvent.click(screen.getByRole("button", { name: "选择物料" }));

    expect(
      await screen.findByRole("dialog", { name: "选择物料" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("cell", { name: material.materialCode }),
    ).toBeInTheDocument();
  });

  it("returns the complete selected material", async () => {
    const onChange = vi.fn();

    renderWithQueryClient(
      <MaterialPickerField
        value={null}
        dataSource={{
          queryKey: ["test", "material-field-selection"],
          search: async () => ({ items: [material], totalCount: 1 }),
        }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "选择物料" }));
    fireEvent.click(await screen.findByRole("button", { name: "选择" }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(material);
  });

  it("keeps the value unchanged when the picker is closed", async () => {
    const onChange = vi.fn();

    renderWithQueryClient(
      <MaterialPickerField
        value={material}
        dataSource={{
          queryKey: ["test", "material-field-close"],
          search: async () => ({ items: [material], totalCount: 1 }),
        }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "选择物料" }));
    fireEvent.click(await screen.findByRole("button", { name: "返回" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue(material.materialCode);
  });

  it("disables the input and picker trigger", () => {
    renderWithQueryClient(
      <MaterialPickerField value={material} disabled onChange={vi.fn()} />,
    );

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "选择物料" })).toBeDisabled();
  });

  it("forwards the invalid state to the input", () => {
    renderWithQueryClient(
      <MaterialPickerField value={material} invalid onChange={vi.fn()} />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("retries a failed injected data source", async () => {
    const search = vi
      .fn()
      .mockRejectedValueOnce(new Error("material query failed"))
      .mockResolvedValueOnce({ items: [material], totalCount: 1 });

    renderWithQueryClient(
      <MaterialPickerField
        value={null}
        dataSource={{
          queryKey: ["test", "material-field-retry"],
          search,
        }}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "选择物料" }));
    fireEvent.click(await screen.findByRole("button", { name: "重试" }));

    expect(
      await screen.findByRole("cell", { name: material.materialCode }),
    ).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(2);
  });
});
