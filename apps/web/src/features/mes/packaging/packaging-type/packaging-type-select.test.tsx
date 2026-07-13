import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { i18n } from "@/i18n/config";
import { PackagingTypeSelect } from "./packaging-type-select";
import type { PackagingTypeOptionDto } from "./packaging-contract";

const mockOptions: PackagingTypeOptionDto[] = [
  { Id: 1, TypeCode: "TYPE-001", TypeName: "Carton" },
  { Id: 2, TypeCode: "TYPE-002", TypeName: "Pallet" },
  { Id: 3, TypeCode: "TYPE-003", TypeName: "Drum" },
];

function renderPackagingTypeSelect(props: {
  options?: PackagingTypeOptionDto[];
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearLabel?: string;
}) {
  return render(
    <PackagingTypeSelect
      options={props.options ?? mockOptions}
      value={props.value ?? ""}
      onValueChange={props.onValueChange ?? vi.fn()}
      disabled={props.disabled}
      id={props.id}
      data-testid={props["data-testid"]}
      aria-label={props["aria-label"]}
      placeholder={props.placeholder}
      searchPlaceholder={props.searchPlaceholder}
      emptyText={props.emptyText}
      clearLabel={props.clearLabel}
    />,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("zh-CN");
});

describe("PackagingTypeSelect", () => {
  describe("selected display", () => {
    it("displays selected value as TypeCode-TypeName format", () => {
      renderPackagingTypeSelect({ value: "TYPE-002" });
      // Combobox trigger is a button - use toHaveTextContent
      expect(screen.getByRole("combobox")).toHaveTextContent("TYPE-002-Pallet");
    });

    it("displays placeholder text when no value is selected", () => {
      renderPackagingTypeSelect({ value: "" });
      // When no value, trigger shows placeholder (i18n default: 请选择包装类型)
      expect(screen.getByRole("combobox")).toHaveTextContent("请选择包装类型");
    });
  });

  describe("search", () => {
    it("filters options by TypeCode", async () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({ onValueChange });
      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);
      const input = screen.getByPlaceholderText("搜索包装类型编码或名称");
      fireEvent.change(input, { target: { value: "TYPE-002" } });
      expect(screen.getByText("TYPE-002-Pallet")).toBeInTheDocument();
      expect(screen.queryByText("TYPE-001-Carton")).not.toBeInTheDocument();
    });

    it("filters options by TypeName", async () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({ onValueChange });
      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);
      const input = screen.getByPlaceholderText("搜索包装类型编码或名称");
      fireEvent.change(input, { target: { value: "Pallet" } });
      expect(screen.getByText("TYPE-002-Pallet")).toBeInTheDocument();
      expect(screen.queryByText("TYPE-001-Carton")).not.toBeInTheDocument();
    });

    it("calls onValueChange with TypeCode when selecting filtered item", async () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({ onValueChange });
      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);
      const input = screen.getByPlaceholderText("搜索包装类型编码或名称");
      fireEvent.change(input, { target: { value: "TYPE-002" } });
      fireEvent.click(screen.getByText("TYPE-002-Pallet"));
      expect(onValueChange).toHaveBeenCalledWith("TYPE-002");
    });
  });

  describe("clear button", () => {
    it("calls onValueChange with empty string when clear button is clicked", async () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({ value: "TYPE-002", onValueChange });
      const clearButton = screen.getByRole("button", { name: /清空包装类型/i });
      fireEvent.click(clearButton);
      expect(onValueChange).toHaveBeenCalledWith("");
    });
  });

  describe("empty options", () => {
    it("shows emptyText when options array is empty", () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({
        options: [],
        value: "",
        onValueChange,
        emptyText: "暂无包装类型",
      });
      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);
      expect(screen.getByText("暂无包装类型")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables trigger and clear button when disabled is true", () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({ value: "TYPE-002", onValueChange, disabled: true });
      expect(screen.getByRole("combobox")).toBeDisabled();
      expect(screen.getByRole("button", { name: /清空包装类型/i })).toBeDisabled();
    });
  });

  describe("custom copy", () => {
    it("forwards custom aria-label", () => {
      renderPackagingTypeSelect({
        "aria-label": "Custom label",
      });
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Custom label");
    });

    it("forwards custom placeholder (shown on closed trigger)", () => {
      // Do NOT open the popover - placeholder is only visible on the trigger button when closed
      renderPackagingTypeSelect({ placeholder: "Choose packaging type" });
      expect(screen.getByRole("combobox")).toHaveTextContent("Choose packaging type");
    });

    it("forwards custom searchPlaceholder (shown in open popover search input)", () => {
      renderPackagingTypeSelect({ searchPlaceholder: "Find type..." });
      fireEvent.click(screen.getByRole("combobox"));
      expect(screen.getByPlaceholderText("Find type...")).toBeInTheDocument();
    });

    it("forwards custom emptyText", () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({ options: [], onValueChange, emptyText: "Nothing here" });
      fireEvent.click(screen.getByRole("combobox"));
      expect(screen.getByText("Nothing here")).toBeInTheDocument();
    });

    it("forwards custom clearLabel", () => {
      const onValueChange = vi.fn();
      renderPackagingTypeSelect({ value: "TYPE-002", onValueChange, clearLabel: "Wipe selection" });
      expect(screen.getByRole("button", { name: "Wipe selection" })).toBeInTheDocument();
    });
  });
});
