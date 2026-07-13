import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import "@/i18n/config";

function TestDialog({
  showCloseButton,
  showFullscreenButton,
}: {
  showCloseButton?: boolean;
  showFullscreenButton?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-testid="dialog-content"
          showCloseButton={showCloseButton}
          showFullscreenButton={showFullscreenButton}
        >
          <DialogTitle>Test dialog</DialogTitle>
          <DialogDescription>Test dialog description</DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}

describe("DialogContent", () => {
  it("toggles between the default and fullscreen layouts", () => {
    render(<TestDialog />);

    const content = screen.getByTestId("dialog-content");
    const fullscreenButton = screen.getByRole("button", { name: "全屏" });

    expect(content).not.toHaveAttribute("data-fullscreen", "true");
    expect(fullscreenButton).toHaveAttribute("aria-pressed", "false");
    expect(
      fullscreenButton.querySelector(".lucide-expand"),
    ).toBeInTheDocument();

    fireEvent.click(fullscreenButton);

    expect(content).toHaveAttribute("data-fullscreen", "true");
    expect(content).toHaveClass(
      "inset-0",
      "h-screen",
      "w-screen",
      "max-h-none",
      "max-w-none",
      "rounded-none",
    );
    // The centring transform must be cleared in fullscreen mode so the
    // dialog fills the viewport. See the matching `[transform:none]`
    // override in dialog.tsx for the full reasoning.
    expect(content.className).not.toMatch(/translate3d\(-50%,-50%,0\)/);
    const exitFullscreenButton = screen.getByRole("button", {
      name: "退出全屏",
    });
    expect(exitFullscreenButton).toHaveAttribute("aria-pressed", "true");
    expect(
      exitFullscreenButton.querySelector(".lucide-shrink"),
    ).toBeInTheDocument();

    fireEvent.click(exitFullscreenButton);

    expect(content).not.toHaveAttribute("data-fullscreen", "true");
    expect(content).not.toHaveClass("inset-0", "h-screen", "w-screen");
    expect(screen.getByRole("button", { name: "全屏" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("matches the dialog action styling", () => {
    render(<TestDialog />);

    const fullscreenButton = screen.getByRole("button", { name: "全屏" });
    const closeButton = screen.getByRole("button", { name: "关闭弹窗" });
    const actions = fullscreenButton.parentElement;

    expect(actions).toHaveClass("top-5", "right-8", "gap-1");
    expect(fullscreenButton).toHaveAttribute("data-variant", "ghost");
    expect(fullscreenButton).toHaveClass(
      "size-12",
      "cursor-pointer",
      "text-primary",
      "hover:bg-transparent",
      "hover:text-primary",
      "dark:hover:bg-transparent",
    );
    expect(closeButton).toHaveAttribute("data-variant", "ghost");
    expect(closeButton).toHaveClass(
      "size-12",
      "cursor-pointer",
      "text-destructive",
      "hover:bg-transparent",
      "hover:text-destructive",
      "dark:hover:bg-transparent",
    );
    expect(fullscreenButton).not.toHaveClass(
      "hover:bg-accent",
      "hover:text-accent-foreground",
      "dark:hover:bg-accent/50",
    );
    expect(closeButton).not.toHaveClass(
      "hover:bg-accent",
      "hover:text-accent-foreground",
      "dark:hover:bg-accent/50",
    );
    expect(fullscreenButton.querySelector("svg")).toHaveClass("size-5");
    expect(closeButton.querySelector("svg")).toHaveClass("size-8");
  });

  it("allows the fullscreen control to be hidden", () => {
    render(<TestDialog showFullscreenButton={false} />);

    expect(
      screen.queryByRole("button", { name: "全屏" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "关闭弹窗" }),
    ).toBeInTheDocument();
  });

  it("preserves the existing close button option", () => {
    render(<TestDialog showCloseButton={false} />);

    expect(
      screen.queryByRole("button", { name: "关闭弹窗" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全屏" })).toBeInTheDocument();
  });

  it("closes the dialog from the close control", () => {
    render(<TestDialog />);

    fireEvent.click(screen.getByRole("button", { name: "关闭弹窗" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores the default layout after closing and reopening", () => {
    render(<TestDialog />);

    fireEvent.click(screen.getByRole("button", { name: "全屏" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭弹窗" }));
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    expect(screen.getByTestId("dialog-content")).not.toHaveAttribute(
      "data-fullscreen",
      "true",
    );
    expect(screen.getByRole("button", { name: "全屏" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("does not close when the user clicks the overlay", () => {
    render(<TestDialog />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Pointerdown on the overlay should not dismiss the dialog; only the
    // close button or an explicit close action (e.g. ESC) should.
    fireEvent.pointerDown(document.body, { pointerId: 1 });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
  });

  it("still closes when ESC is pressed", () => {
    render(<TestDialog />);

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
