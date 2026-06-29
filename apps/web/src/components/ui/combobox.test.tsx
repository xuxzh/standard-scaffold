import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "@/components/ui/combobox";

describe("Combobox", () => {
  it("allows callers to raise the popover content above parent overlays", () => {
    render(
      <Combobox
        contentClassName="z-[70]"
        options={[{ value: "box", label: "Box Label" }]}
        value=""
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    expect(
      document.body.querySelector('[data-slot="popover-content"]'),
    ).toHaveClass("z-[70]");
  });
});
