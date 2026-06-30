import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "@/components/ui/combobox";

describe("Combobox", () => {
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
});