import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

describe("Combobox inside Dialog", () => {
  it("elevates its popover above the dialog body via ModalLayerContext", () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <Combobox
            options={[{ value: "x", label: "X" }]}
            value=""
            onValueChange={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("combobox"));

    const popover = document.body.querySelector('[data-slot="popover-content"]');
    expect(popover).toHaveClass("z-modal-nested");
    expect(popover).not.toHaveClass("z-floating");

    const dialog = document.body.querySelector('[data-slot="dialog-content"]');
    expect(dialog).toHaveClass("z-modal");
  });
});