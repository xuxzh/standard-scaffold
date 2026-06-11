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

    fireEvent.click(fullscreenButton);

    expect(content).toHaveAttribute("data-fullscreen", "true");
    expect(content).toHaveClass(
      "inset-0",
      "h-screen",
      "w-screen",
      "max-h-none",
      "max-w-none",
      "translate-x-0",
      "translate-y-0",
      "rounded-none",
    );
    expect(
      screen.getByRole("button", { name: "退出全屏" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "退出全屏" }));

    expect(content).not.toHaveAttribute("data-fullscreen", "true");
    expect(content).not.toHaveClass("inset-0", "h-screen", "w-screen");
    expect(screen.getByRole("button", { name: "全屏" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
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
});
