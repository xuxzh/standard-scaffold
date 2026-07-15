import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "@/components/ui/combobox";

describe("Combobox", () => {
  it("disables both trigger and clear button when disabled=true, and clicking clear does not call onValueChange", () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        options={[{ value: "box", label: "Box Label" }]}
        value="box"
        disabled={true}
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByRole("combobox")).toBeDisabled();
    const clearButton = screen.getByRole("button", { name: "Clear selection" });
    expect(clearButton).toBeDisabled();

    fireEvent.click(clearButton);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("uses clearLabel prop for clear button accessible name", () => {
    render(
      <Combobox
        options={[{ value: "box", label: "Box Label" }]}
        value="box"
        clearLabel="Clear packaging type"
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Clear packaging type" })).toBeInTheDocument();
  });

  it("uses the base z-floating layer when rendered outside any modal", () => {
    render(
      <Combobox
        options={[{ value: "box", label: "Box Label" }]}
        value=""
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    const popover = document.body.querySelector('[data-slot="popover-content"]');
    expect(popover).toHaveClass("z-floating");
    expect(popover).not.toHaveClass("z-modal-nested");
  });

  it("hides the search input and empty text when showSearch is false", () => {
    render(
      <Combobox
        options={[
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        value=""
        showSearch={false}
        searchPlaceholder="Search anything…"
        emptyText="No matches"
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    expect(
      document.body.querySelector('[data-slot="popover-content"] input'),
    ).toBeNull();
    expect(screen.getByRole("option", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "No" })).toBeInTheDocument();
    expect(screen.queryByText("Search anything…")).not.toBeInTheDocument();
    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
  });
});
