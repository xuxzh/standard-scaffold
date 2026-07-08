import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { i18n } from "@/i18n/config";
import type { PackagingRuleLevelOption } from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";
import { PackagingRuleLevelDialog } from "@/features/mes/packaging/packaging-rule/packaging-rule-level-dialog";

const baseLevels: PackagingRuleLevelOption[] = [
  { id: 1, levelCode: "LV001", levelName: "Unit", levelSequence: 1 },
  { id: 2, levelCode: "LV002", levelName: "Box", levelSequence: 2 },
  { id: 3, levelCode: "LV003", levelName: "Carton", levelSequence: 3 },
];

function renderDialog(
  props: Partial<React.ComponentProps<typeof PackagingRuleLevelDialog>> = {},
) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  const utils = render(
    <I18nextProvider i18n={i18n}>
      <PackagingRuleLevelDialog
        open
        levelOptions={baseLevels}
        loading={false}
        error={null}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        {...props}
      />
    </I18nextProvider>,
  );

  return { onConfirm, onOpenChange, ...utils };
}

beforeEach(async () => {
  await i18n.changeLanguage("zh-CN");
});

describe("PackagingRuleLevelDialog", () => {
  it("renders the title, description, and a row for each level option", () => {
    renderDialog();

    expect(
      screen.getByText("选择包装层级"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "选择包装层级后，系统将读取该层级链路并生成层级明细。",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("packaging-rule-level-row-LV001"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("packaging-rule-level-row-LV002"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("packaging-rule-level-row-LV003"),
    ).toBeInTheDocument();
  });

  it("filters rows by code/name on submit and clears selection after a new search", () => {
    renderDialog();

    fireEvent.change(
      screen.getByTestId("packaging-rule-level-filter-code"),
      {
        target: { value: "LV002" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-level-filter-submit"));

    expect(
      screen.queryByTestId("packaging-rule-level-row-LV001"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("packaging-rule-level-row-LV002"),
    ).toBeInTheDocument();

    // Adjust search resets selection so the user cannot confirm a stale code.
    fireEvent.change(
      screen.getByTestId("packaging-rule-level-filter-code"),
      {
        target: { value: "" },
      },
    );
    fireEvent.click(
      screen.getByTestId("packaging-rule-level-row-LV002"),
    );
    expect(
      screen.getByTestId("packaging-rule-level-row-LV002").dataset.state,
    ).toBe("selected");
    fireEvent.change(
      screen.getByTestId("packaging-rule-level-filter-name"),
      {
        target: { value: "Box" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-level-filter-submit"));
    expect(
      screen.getByTestId("packaging-rule-level-row-LV002").dataset.state,
    ).toBeUndefined();
  });

  it("keeps the confirm button disabled until a row is selected", () => {
    renderDialog();

    const confirm = screen.getByTestId("packaging-rule-level-confirm");
    expect(confirm).toBeDisabled();

    fireEvent.click(
      screen.getByTestId("packaging-rule-level-row-LV002"),
    );
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);

    waitFor(() => {
      expect(
        screen.getByTestId("packaging-rule-level-row-LV002").dataset.state,
      ).toBe("selected");
    });
  });

  it("switches the confirm label to the loading copy while loading is true", () => {
    renderDialog({ loading: true });

    expect(
      screen.getByTestId("packaging-rule-level-confirm").textContent,
    ).toContain("生成中");
  });

  it("shows the destructive error banner when error prop is set", () => {
    renderDialog({ error: "链路炸了" });

    expect(
      screen.getByTestId("packaging-rule-level-error"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("packaging-rule-level-error").textContent,
    ).toContain("链路炸了");
  });

  it("renders the empty hint when levelOptions is empty", () => {
    renderDialog({ levelOptions: [] });

    expect(screen.getByText("暂无包装层级")).toBeInTheDocument();
    expect(
      screen.queryByTestId("packaging-rule-level-row-LV001"),
    ).not.toBeInTheDocument();
  });

  it("renders the not-found hint when filters exclude all rows", () => {
    renderDialog();

    fireEvent.change(
      screen.getByTestId("packaging-rule-level-filter-code"),
      {
        target: { value: "ZZZ" },
      },
    );
    fireEvent.click(screen.getByTestId("packaging-rule-level-filter-submit"));

    expect(
      screen.queryByTestId("packaging-rule-level-row-LV001"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("未找到包装层级")).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when the cancel button is pressed", () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
