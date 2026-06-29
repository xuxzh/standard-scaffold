import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { setNavigatorLanguage } from "@/test/setup";
import { PrintTemplateSelect } from "@/features/mes/packaging/print-template/print-template-select";
import type { PrintTemplateOption } from "@/features/mes/packaging/print-template/print-template-contract";

const sampleOptions: PrintTemplateOption[] = [
  { templateCode: "PT001", templateName: "Box Label" },
  { templateCode: "PT002", templateName: "Packing List" },
  { templateCode: "PT003", templateName: "Carton Label" },
];

function renderSelect({
  options = sampleOptions,
  value = "",
  onValueChange = vi.fn(),
  onBlur,
  onSelectedNameChange,
  id = "test-print-template",
  "data-testid": dataTestId = "test-print-template",
  "aria-invalid": invalid,
  error,
}: Partial<Parameters<typeof PrintTemplateSelect>[0]> = {}) {
  render(
    <PrintTemplateSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      onBlur={onBlur}
      onSelectedNameChange={onSelectedNameChange}
      id={id}
      data-testid={dataTestId}
      aria-invalid={invalid}
      error={error}
    />,
  );
}

describe("PrintTemplateSelect", () => {
  beforeEach(async () => {
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders the combobox without a separate name input", () => {
    renderSelect({ value: "PT002" });

    expect(
      screen.getByRole("combobox", { name: "默认打印模板" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "打印模板名称" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("test-print-template-name")).not.toBeInTheDocument();
  });

  it("calls onValueChange with the selected templateCode when an option is chosen", async () => {
    const onValueChange = vi.fn();

    renderSelect({ onValueChange });

    fireEvent.click(screen.getByRole("combobox"));

    const option = await screen.findByRole("option", {
      name: "PT002-Packing List",
    });
    fireEvent.click(option);

    expect(onValueChange).toHaveBeenCalledWith("PT002");
  });

  it("renders its popover above dialog content", () => {
    renderSelect();

    fireEvent.click(screen.getByRole("combobox"));

    expect(
      document.body.querySelector('[data-slot="popover-content"]'),
    ).toHaveClass("z-[70]");
  });

  it("calls onSelectedNameChange with the resolved name when a value is provided", () => {
    const onSelectedNameChange = vi.fn();

    renderSelect({ value: "PT003", onSelectedNameChange });

    expect(onSelectedNameChange).toHaveBeenCalledWith("Carton Label");
  });

  it("renders the FieldError message when invalid and an error are provided", () => {
    renderSelect({
      "aria-invalid": true,
      error: { message: "Print template is required" },
    });

    expect(screen.getByText("Print template is required")).toBeInTheDocument();
  });
});
