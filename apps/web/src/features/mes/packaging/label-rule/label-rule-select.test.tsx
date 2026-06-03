import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { setNavigatorLanguage } from "@/test/setup";
import { LabelRuleSelect } from "@/features/mes/packaging/label-rule/label-rule-select";
import type { LabelRuleOption } from "@/features/mes/packaging/label-rule/label-rule-contract";

const sampleOptions: LabelRuleOption[] = [
  { ruleId: "RL001", ruleName: "Standard Label" },
  { ruleId: "RL002", ruleName: "Shipping Label" },
  { ruleId: "RL003", ruleName: "Carton Label" },
];

function renderSelect({
  options = sampleOptions,
  value = "",
  onValueChange = vi.fn(),
  onBlur,
  onSelectedNameChange,
  id = "test-barcode-rule-code",
  "data-testid": dataTestId = "test-barcode-rule-code",
  "aria-invalid": invalid,
  error,
}: Partial<Parameters<typeof LabelRuleSelect>[0]> = {}) {
  render(
    <LabelRuleSelect
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

describe("LabelRuleSelect", () => {
  beforeEach(async () => {
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders both the combobox trigger and the read-only name input", () => {
    renderSelect();

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "条码规则名称" }),
    ).toBeInTheDocument();
  });

  it("displays the selected rule name when a matching option is selected", () => {
    renderSelect({ value: "RL002" });

    const nameInput = screen.getByRole("textbox", { name: "条码规则名称" });
    expect(nameInput).toHaveValue("Shipping Label");
  });

  it("displays an empty name when the value does not match any option", () => {
    renderSelect({ value: "NONEXISTENT" });

    const nameInput = screen.getByRole("textbox", { name: "条码规则名称" });
    expect(nameInput).toHaveValue("");
  });

  it("displays an empty name when the value is empty", () => {
    renderSelect({ value: "" });

    const nameInput = screen.getByRole("textbox", { name: "条码规则名称" });
    expect(nameInput).toHaveValue("");
  });

  it("calls onValueChange with the selected ruleId when an option is chosen", async () => {
    const onValueChange = vi.fn();

    renderSelect({ onValueChange });

    fireEvent.click(screen.getByRole("combobox"));

    const option = await screen.findByRole("option", {
      name: "RL002-Shipping Label",
    });
    fireEvent.click(option);

    expect(onValueChange).toHaveBeenCalledWith("RL002");
  });

  it("calls onBlur when the combobox trigger loses focus", () => {
    const onBlur = vi.fn();

    renderSelect({ onBlur });

    fireEvent.blur(screen.getByRole("combobox"));

    expect(onBlur).toHaveBeenCalled();
  });

  it("calls onSelectedNameChange on mount with the empty name when no value is selected", () => {
    const onSelectedNameChange = vi.fn();

    renderSelect({ value: "", onSelectedNameChange });

    expect(onSelectedNameChange).toHaveBeenCalledWith("");
  });

  it("calls onSelectedNameChange with the resolved name when a value is provided", () => {
    const onSelectedNameChange = vi.fn();

    renderSelect({ value: "RL003", onSelectedNameChange });

    expect(onSelectedNameChange).toHaveBeenCalledWith("Carton Label");
  });

  it("renders the FieldError message when invalid and an error are provided", () => {
    renderSelect({
      "aria-invalid": true,
      error: { message: "Barcode rule is required" },
    });

    expect(screen.getByText("Barcode rule is required")).toBeInTheDocument();
  });

  it("does not render a FieldError when valid", () => {
    renderSelect({
      "aria-invalid": false,
      error: undefined,
    });

    expect(
      screen.queryByText(/Barcode rule is required/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("alert"),
    ).not.toBeInTheDocument();
  });

  it("passes aria-invalid to the combobox trigger", () => {
    renderSelect({ "aria-invalid": true });

    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveAttribute("aria-invalid", "true");
  });

  it("associates labels with inputs via htmlFor", () => {
    renderSelect({ id: "my-select", "data-testid": "my-select" });

    const nameInput = screen.getByRole("textbox", { name: "条码规则名称" });
    expect(nameInput).toHaveAttribute("id", "my-select-name");
  });
});
