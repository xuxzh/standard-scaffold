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
  onSelectedNameChange,
  id = "test-parent-level-code",
  "data-testid": dataTestId = "test-parent-level-code",
  "aria-invalid": invalid,
  error,
}: Partial<Parameters<typeof PackagingLevelSelect>[0]> = {}) {
  render(
    <PackagingLevelSelect
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

describe("PackagingLevelSelect", () => {
  beforeEach(async () => {
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders both the combobox trigger and the read-only name input", () => {
    renderSelect();

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "父级层级名称" }),
    ).toBeInTheDocument();
  });

  it("displays the selected level name when a matching option is selected", () => {
    renderSelect({ value: "LV002" });

    const nameInput = screen.getByRole("textbox", { name: "父级层级名称" });
    expect(nameInput).toHaveValue("BOX");
  });

  it("displays an empty name when the value does not match any option", () => {
    renderSelect({ value: "NONEXISTENT" });

    const nameInput = screen.getByRole("textbox", { name: "父级层级名称" });
    expect(nameInput).toHaveValue("");
  });

  it("displays an empty name when the value is empty", () => {
    renderSelect({ value: "" });

    const nameInput = screen.getByRole("textbox", { name: "父级层级名称" });
    expect(nameInput).toHaveValue("");
  });

  it("calls onValueChange with the selected levelCode when an option is chosen", async () => {
    const onValueChange = vi.fn();

    renderSelect({ onValueChange });

    fireEvent.click(screen.getByRole("combobox"));

    const option = await screen.findByRole("option", { name: "LV002-BOX" });
    fireEvent.click(option);

    expect(onValueChange).toHaveBeenCalledWith("LV002");
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

    renderSelect({ value: "LV003", onSelectedNameChange });

    expect(onSelectedNameChange).toHaveBeenCalledWith("CARTON");
  });

  it("renders the FieldError message when invalid and an error are provided", () => {
    renderSelect({
      "aria-invalid": true,
      error: { message: "Parent level is required" },
    });

    expect(screen.getByText("Parent level is required")).toBeInTheDocument();
  });

  it("does not render a FieldError when valid", () => {
    renderSelect({
      "aria-invalid": false,
      error: undefined,
    });

    expect(
      screen.queryByText(/Parent level is required/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("passes aria-invalid to the combobox trigger", () => {
    renderSelect({ "aria-invalid": true });

    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveAttribute("aria-invalid", "true");
  });

  it("associates labels with inputs via htmlFor", () => {
    renderSelect({ id: "my-select", "data-testid": "my-select" });

    const nameInput = screen.getByRole("textbox", { name: "父级层级名称" });
    expect(nameInput).toHaveAttribute("id", "my-select-name");
  });
});
