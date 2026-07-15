import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { setNavigatorLanguage } from "@/test/setup";
import { PackagingLevelSelect } from "@/features/mes/packaging/packaging-level/packaging-level-select";
import type { PackagingLevelOption } from "@/features/mes/packaging/packaging-level/packaging-level-contract";

const sampleOptions: PackagingLevelOption[] = [
  { id: 1, levelCode: "LV001", levelName: "UNIT" },
  { id: 2, levelCode: "LV002", levelName: "BOX" },
  { id: 3, levelCode: "LV003", levelName: "CARTON" },
];

function renderSelect({
  options = sampleOptions,
  value = "",
  onValueChange = vi.fn(),
  onBlur,
  id = "test-parent-level-code",
  "data-testid": dataTestId = "test-parent-level-code",
  "aria-label": ariaLabel,
  "aria-invalid": invalid,
  disabled,
  clearable,
}: Partial<Parameters<typeof PackagingLevelSelect>[0]> = {}) {
  return render(
    <PackagingLevelSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      onBlur={onBlur}
      id={id}
      data-testid={dataTestId}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      disabled={disabled}
      clearable={clearable}
    />,
  );
}

describe("PackagingLevelSelect", () => {
  beforeEach(async () => {
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders the combobox with the default i18n aria-label", () => {
    renderSelect();

    expect(
      screen.getByRole("combobox", { name: "父级层级编码" }),
    ).toBeInTheDocument();
  });

  it("uses an overridden aria-label when provided", () => {
    renderSelect({ "aria-label": "选择层级" });

    expect(
      screen.getByRole("combobox", { name: "选择层级" }),
    ).toBeInTheDocument();
  });

  it("does not render a separate read-only name input", () => {
    renderSelect({ value: "LV002" });

    expect(
      screen.queryByRole("textbox", { name: "父级层级名称" }),
    ).not.toBeInTheDocument();
  });

  it("calls onValueChange with the selected levelCode when an option is chosen", async () => {
    const onValueChange = vi.fn();

    renderSelect({ onValueChange });

    fireEvent.click(screen.getByRole("combobox", { name: "父级层级编码" }));

    const option = await screen.findByRole("option", { name: "LV002-BOX" });
    fireEvent.click(option);

    expect(onValueChange).toHaveBeenCalledWith("LV002");
  });

  it("calls onBlur when the combobox trigger loses focus", () => {
    const onBlur = vi.fn();

    renderSelect({ onBlur });

    fireEvent.blur(screen.getByRole("combobox", { name: "父级层级编码" }));

    expect(onBlur).toHaveBeenCalled();
  });

  it("passes aria-invalid through to the combobox trigger", () => {
    renderSelect({ "aria-invalid": true });

    const combobox = screen.getByRole("combobox", { name: "父级层级编码" });
    expect(combobox).toHaveAttribute("aria-invalid", "true");
  });

  it("disables the combobox trigger when disabled is true", () => {
    renderSelect({ disabled: true });

    expect(
      screen.getByRole("combobox", { name: "父级层级编码" }),
    ).toBeDisabled();
  });
});
