import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppDialog } from "@/components/app-dialog";
import { i18n } from "@/i18n/config";

type AppDialogOverrides = Partial<ComponentProps<typeof AppDialog>>;

function renderAppDialog(overrides: AppDialogOverrides = {}) {
  const onOpenChange = vi.fn();
  const onReset = vi.fn();
  const onConfirm = vi.fn();

  render(
    <AppDialog
      open
      onOpenChange={onOpenChange}
      title="Dialog title"
      testId="test-app-dialog"
      resetAction={{ onClick: onReset }}
      confirmAction={{ onClick: onConfirm }}
      {...overrides}
    >
      <p>Dialog body</p>
    </AppDialog>,
  );

  return { onOpenChange, onReset, onConfirm };
}

beforeEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("zh-CN");
  });
});

describe("AppDialog", () => {
  it("omits aria-describedby when no description is provided", () => {
    renderAppDialog();

    expect(screen.getByTestId("test-app-dialog")).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("renders the fixed shell and default actions", () => {
    const { onOpenChange, onReset, onConfirm } = renderAppDialog();

    const dialog = screen.getByTestId("test-app-dialog");
    const body = dialog.querySelector('[data-slot="app-dialog-body"]');
    const header = dialog.querySelector('[data-slot="dialog-header"]');
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');

    expect(dialog).toHaveClass(
      "grid",
      "max-h-[90vh]",
      "grid-rows-[auto_minmax(0,1fr)_auto]",
      "gap-0",
      "overflow-hidden",
      "p-0",
      "w-[min(100%-2rem,56rem)]",
      "max-w-none",
    );
    expect(header).toHaveClass("border-b", "px-8", "py-6");
    expect(body).toHaveClass("min-h-0", "overflow-auto", "px-8", "py-6");
    expect(body).toHaveTextContent("Dialog body");
    expect(footer).toHaveClass(
      "border-t",
      "px-8",
      "py-6",
      "sm:flex-row",
      "sm:justify-end",
    );

    const backButton = screen.getByRole("button", { name: "返回" });
    const resetButton = screen.getByRole("button", { name: "重置" });
    const confirmButton = screen.getByRole("button", { name: "确认" });

    expect(backButton.querySelector("svg")).toBeInTheDocument();
    expect(resetButton.querySelector("svg")).toBeInTheDocument();
    expect(confirmButton.querySelector("svg")).toBeInTheDocument();
    expect(resetButton).toHaveClass(
      "border-destructive",
      "text-destructive",
      "hover:bg-destructive/10",
      "hover:text-destructive",
    );

    fireEvent.click(backButton);
    fireEvent.click(resetButton);
    fireEvent.click(confirmButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onReset).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("lets a custom back action take over without closing", () => {
    const onBack = vi.fn();
    const { onOpenChange } = renderAppDialog({
      backAction: { onClick: onBack },
    });

    fireEvent.click(screen.getByRole("button", { name: "返回" }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it.each([
    { overrides: { backAction: false }, label: "返回" },
    { overrides: { resetAction: false }, label: "重置" },
    { overrides: { confirmAction: false }, label: "确认" },
  ])("hides the $label action independently", ({ overrides, label }) => {
    renderAppDialog(overrides as AppDialogOverrides);

    expect(
      screen.queryByRole("button", { name: label }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("test-app-dialog").querySelector(
        '[data-slot="dialog-footer"]',
      ),
    ).toBeInTheDocument();
  });

  it("omits the footer when every action is hidden", () => {
    renderAppDialog({
      backAction: false,
      resetAction: false,
      confirmAction: false,
    });

    expect(
      screen.queryByRole("button", { name: "返回" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "重置" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "确认" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("test-app-dialog").querySelector(
        '[data-slot="dialog-footer"]',
      ),
    ).not.toBeInTheDocument();
  });

  it("associates a form confirm action with an external form", () => {
    const onSubmit = vi.fn();

    render(
      <AppDialog
        open
        onOpenChange={vi.fn()}
        title="Form dialog"
        resetAction={false}
        confirmAction={{ formId: "test-form", testId: "test-submit" }}
      >
        <form
          id="test-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input name="name" defaultValue="value" />
        </form>
      </AppDialog>,
    );

    const confirmButton = screen.getByTestId("test-submit");
    expect(confirmButton).toHaveAttribute("type", "submit");
    expect(confirmButton).toHaveAttribute("form", "test-form");

    fireEvent.click(confirmButton);

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it.each([
    ["sm", "w-[min(100%-2rem,32rem)]"],
    ["md", "w-[min(100%-2rem,56rem)]"],
    ["lg", "w-[min(100%-2rem,72rem)]"],
    ["xl", "w-[min(100%-2rem,85rem)]"],
  ] as const)("maps the %s size to its controlled width", (size, className) => {
    renderAppDialog({ size });

    expect(screen.getByTestId("test-app-dialog")).toHaveClass(
      className,
      "max-w-none",
    );
  });

  it("applies controlled overrides and English default labels", async () => {
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });

    renderAppDialog({
      description: "Dialog description",
      size: "xl",
      bodyClassName: "p-0 overflow-hidden",
      showCloseButton: false,
      showFullscreenButton: false,
      confirmAction: {
        onClick: vi.fn(),
        disabled: true,
        testId: "disabled-confirm",
      },
    });

    const dialog = screen.getByTestId("test-app-dialog");
    const body = dialog.querySelector('[data-slot="app-dialog-body"]');

    expect(dialog).toHaveClass("w-[min(100%-2rem,85rem)]", "max-w-none");
    expect(body).toHaveClass("p-0", "overflow-hidden");
    expect(body).not.toHaveClass("px-8", "py-6", "overflow-auto");
    const description = screen.getByText("Dialog description");
    expect(description).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-describedby", description.id);
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByTestId("disabled-confirm")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Enter fullscreen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close dialog" }),
    ).not.toBeInTheDocument();
  });
});
