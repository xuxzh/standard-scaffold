import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataExportDialog } from "@/components/data-export/data-export-dialog";

const optionLabels = {
  all: "All",
  current: "Current",
  selected: "Selected",
};

const messages = {
  title: "Export data",
  description: "Export the current table data to an Excel file.",
  confirm: "Export",
  cancel: "Cancel",
  exporting: "Exporting",
  selectedDisabledHint: "Select at least one row to export selected data.",
};

describe("DataExportDialog", () => {
  it("defaults to all and confirms the selected mode", () => {
    const onConfirm = vi.fn();

    render(
      <DataExportDialog
        open
        selectedCount={1}
        optionLabels={optionLabels}
        messages={messages}
        onOpenChange={() => {}}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("radio", { name: "All" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Current" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(onConfirm).toHaveBeenCalledWith("current");
  });

  it("disables the selected mode when no rows are selected", () => {
    render(
      <DataExportDialog
        open
        selectedCount={0}
        optionLabels={optionLabels}
        messages={messages}
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByRole("radio", { name: "Selected" })).toBeDisabled();
    expect(screen.getByText(messages.selectedDisabledHint)).toBeInTheDocument();
  });

  it("disables the confirm button while exporting", () => {
    render(
      <DataExportDialog
        open
        exporting
        selectedCount={1}
        optionLabels={optionLabels}
        messages={messages}
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: messages.exporting }),
    ).toBeDisabled();
  });

  it("resets to the default mode after closing and reopening", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <DataExportDialog
        open
        defaultMode="all"
        selectedCount={1}
        optionLabels={optionLabels}
        messages={messages}
        onOpenChange={onOpenChange}
        onConfirm={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Current" }));
    expect(screen.getByRole("radio", { name: "Current" })).toBeChecked();

    rerender(
      <DataExportDialog
        open={false}
        defaultMode="all"
        selectedCount={1}
        optionLabels={optionLabels}
        messages={messages}
        onOpenChange={onOpenChange}
        onConfirm={() => {}}
      />,
    );

    rerender(
      <DataExportDialog
        open
        defaultMode="all"
        selectedCount={1}
        optionLabels={optionLabels}
        messages={messages}
        onOpenChange={onOpenChange}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByRole("radio", { name: "All" })).toBeChecked();
  });

  it("calls onOpenChange when cancelling", () => {
    const onOpenChange = vi.fn();

    render(
      <DataExportDialog
        open
        selectedCount={1}
        optionLabels={optionLabels}
        messages={messages}
        onOpenChange={onOpenChange}
        onConfirm={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
