import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PackagingTypeRecord } from "@/features/mes/packaging/packaging-type/packaging-contract";
import { PackagingTypeFormSheet } from "@/features/mes/packaging/packaging-type/packaging-type-form-sheet";
import { i18n } from "@/i18n/config";

const editRecord: PackagingTypeRecord = {
  id: 1,
  typeCode: "PKG-001",
  typeName: "Reusable box",
  isRecyclable: true,
  description: "Existing description",
  remark: "",
};

type FormSheetOverrides = Partial<
  ComponentProps<typeof PackagingTypeFormSheet>
>;

function renderFormSheet(overrides: FormSheetOverrides = {}) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();

  render(
    <PackagingTypeFormSheet
      open
      mode="create"
      record={null}
      submitting={false}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );

  return { onOpenChange, onSubmit };
}

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("zh-CN");
});

describe("PackagingTypeFormSheet", () => {
  it("uses the AppDialog body and external native submit button", () => {
    renderFormSheet();

    const dialog = screen.getByTestId("packaging-type-form-sheet");
    const body = dialog.querySelector('[data-slot="app-dialog-body"]');
    const form = document.getElementById("packaging-type-form");
    const confirmButton = screen.getByTestId("packaging-type-form-submit");

    expect(screen.getByText("新增类型")).toBeInTheDocument();
    expect(dialog).toHaveClass(
      "max-h-[90vh]",
      "grid-rows-[auto_minmax(0,1fr)_auto]",
      "w-[min(100%-2rem,56rem)]",
    );
    expect(body).toHaveClass("min-h-0", "overflow-auto", "px-8", "py-6");
    expect(body).toContainElement(form);
    expect(form).not.toContainElement(confirmButton);
    expect(confirmButton).toHaveAttribute("type", "submit");
    expect(confirmButton).toHaveAttribute("form", "packaging-type-form");
  });

  it("resets create values through the standard reset action", () => {
    renderFormSheet();

    const typeCode = screen.getByPlaceholderText("请输入类型编码");
    const typeName = screen.getByPlaceholderText("请输入类型名称");
    const recyclable = screen.getByRole("switch", { name: "循环包装" });
    const description = screen.getByPlaceholderText("请输入描述");

    fireEvent.change(typeCode, { target: { value: "PKG-NEW" } });
    fireEvent.change(typeName, { target: { value: "New box" } });
    fireEvent.click(recyclable);
    fireEvent.change(description, { target: { value: "New description" } });
    fireEvent.click(screen.getByRole("button", { name: "重置" }));

    expect(typeCode).toHaveValue("");
    expect(typeName).toHaveValue("");
    expect(recyclable).toHaveAttribute("aria-checked", "false");
    expect(description).toHaveValue("");
  });

  it("submits validated form values through the footer confirm button", async () => {
    const { onSubmit } = renderFormSheet();

    fireEvent.change(screen.getByPlaceholderText("请输入类型编码"), {
      target: { value: "PKG-NEW" },
    });
    fireEvent.change(screen.getByPlaceholderText("请输入类型名称"), {
      target: { value: "New box" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "循环包装" }));
    fireEvent.change(screen.getByPlaceholderText("请输入描述"), {
      target: { value: "New description" },
    });
    fireEvent.click(screen.getByTestId("packaging-type-form-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        typeCode: "PKG-NEW",
        typeName: "New box",
        isRecyclable: true,
        description: "New description",
      });
    });
  });

  it("preserves edit defaults and submitting state", () => {
    renderFormSheet({
      mode: "edit",
      record: editRecord,
      submitting: true,
    });

    expect(screen.getByText("编辑类型")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入类型编码")).toHaveValue(
      "PKG-001",
    );
    expect(screen.getByPlaceholderText("请输入类型编码")).toBeDisabled();
    expect(screen.getByPlaceholderText("请输入类型名称")).toHaveValue(
      "Reusable box",
    );
    expect(screen.getByRole("switch", { name: "循环包装" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByPlaceholderText("请输入描述")).toHaveValue(
      "Existing description",
    );
    expect(screen.getByTestId("packaging-type-form-submit")).toBeDisabled();
  });
});
