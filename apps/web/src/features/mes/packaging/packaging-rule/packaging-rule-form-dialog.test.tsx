import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import type {
  PackagingRuleLevelOption,
  PackagingRuleRecord,
  PackagingRuleSpecOption,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";
import { PackagingRuleFormDialog } from "@/features/mes/packaging/packaging-rule/packaging-rule-form-dialog";
import { setNavigatorLanguage } from "@/test/setup";

const levelOptions: PackagingRuleLevelOption[] = [
  { id: 1, levelCode: "LV001", levelName: "Unit", levelSequence: 1 },
];

const specOptions: PackagingRuleSpecOption[] = [
  {
    id: 1,
    specCode: "SP001",
    specName: "Standard",
    unit: "pcs",
    packagingTypeName: "Carton",
  },
];

const invalidRecord: PackagingRuleRecord = {
  id: 1,
  ruleCode: "RULE-001",
  ruleName: "Sample rule",
  isDefault: false,
  isEnabled: true,
  remark: "",
  details: [
    {
      // Detail row mirrored from `PackagingRuleDetailRecord`. Several fields
      // are intentionally set to invalid input to drive the cross-field
      // check (`maxQuantity < standardQuantity`) and the per-field required
      // check (`specCode` is blank).
      id: undefined,
      packagingLevelCode: "LV001",
      packagingLevelName: "Unit",
      levelSequence: 1,
      specCode: "",
      specName: "",
      standardQuantity: 1.5,
      maxQuantity: 1,
      packagingMethod: "auto",
      unit: "pcs",
      packagingTypeName: "Carton",
    },
  ],
};

const baseProps = {
  levelOptions,
  specOptions,
  optionLoadErrors: [],
  submitting: false,
  onRetryOptions: vi.fn(),
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderDialog(
  extraProps: Partial<React.ComponentProps<typeof PackagingRuleFormDialog>> = {},
) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PackagingRuleFormDialog
        open
        mode="edit"
        record={invalidRecord}
        {...baseProps}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        {...extraProps}
      />
    </QueryClientProvider>,
  );

  return { onSubmit, onOpenChange, ...utils };
}

describe("PackagingRuleFormDialog", () => {
  beforeEach(async () => {
    localStorage.clear();
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("surfaces per-cell detail validation errors and the summary banner", async () => {
    const { onSubmit } = renderDialog();

    fireEvent.click(await screen.findByTestId("packaging-rule-form-submit"));

    expect(
      await screen.findByTestId("packaging-rule-form-details-error"),
    ).toBeInTheDocument();

    expect(
      await screen.findByTestId(
        "packaging-rule-detail-specCode-error-0",
      ),
    ).toHaveTextContent("请选择包装规格");

    // `standardQuantity: 1.5` violates `quantityPositive` (must be a positive integer).
    expect(
      await screen.findByTestId(
        "packaging-rule-detail-standardQuantity-error-0",
      ),
    ).toHaveTextContent("数量必须为正整数");

    // `maxQuantity: 1` < `standardQuantity: 1.5` triggers the cross-field
    // `maxQuantityMin` issue, which zod attaches to `path: ["maxQuantity"]`.
    expect(
      await screen.findByTestId(
        "packaging-rule-detail-maxQuantity-error-0",
      ),
    ).toHaveTextContent("最大数量不能小于标准数量");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not surface the summary banner when details are empty", () => {
    renderDialog({ record: { ...invalidRecord, details: [] } });

    // No submit click — the banner should remain absent even if we trigger a
    // submit attempt: that path is intercepted by the
    // `emptyDetailsConfirmationVisible` prompt instead.
    expect(
      screen.queryByTestId("packaging-rule-form-details-error"),
    ).not.toBeInTheDocument();
  });

  it("submits when details pass validation", async () => {
    const onSubmit = vi.fn();
    const validRecord: PackagingRuleRecord = {
      ...invalidRecord,
      details: [
        {
          ...invalidRecord.details[0],
          specCode: "SP001",
          standardQuantity: 1,
          maxQuantity: 2,
        },
      ],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <PackagingRuleFormDialog
          open
          mode="edit"
          record={validRecord}
          {...baseProps}
          onOpenChange={vi.fn()}
          onSubmit={onSubmit}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByTestId("packaging-rule-form-submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByTestId("packaging-rule-form-details-error"),
    ).not.toBeInTheDocument();
  });

  it("opens the level dialog directly when no detail rows exist", async () => {
    renderDialog({ record: { ...invalidRecord, details: [] } });

    fireEvent.click(
      await screen.findByTestId("packaging-rule-form-select-details"),
    );

    expect(
      await screen.findByTestId("packaging-rule-level-dialog"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("packaging-rule-replace-details-dialog"),
    ).not.toBeInTheDocument();
  });

  it("shows the replace confirmation when level details already exist", async () => {
    renderDialog();

    fireEvent.click(
      await screen.findByTestId("packaging-rule-form-select-details"),
    );

    expect(
      await screen.findByTestId("packaging-rule-replace-details-dialog"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("packaging-rule-level-dialog"),
    ).not.toBeInTheDocument();
  });

  it("opens the level dialog after confirming replacement", async () => {
    renderDialog();

    fireEvent.click(
      await screen.findByTestId("packaging-rule-form-select-details"),
    );
    fireEvent.click(
      await screen.findByTestId("packaging-rule-replace-details-confirm"),
    );

    await waitFor(() =>
      expect(
        screen.queryByTestId("packaging-rule-replace-details-dialog"),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByTestId("packaging-rule-level-dialog"),
    ).toBeInTheDocument();
  });

  it("keeps the level dialog closed when replacement is cancelled", async () => {
    renderDialog();

    fireEvent.click(
      await screen.findByTestId("packaging-rule-form-select-details"),
    );
    fireEvent.click(
      await screen.findByTestId("packaging-rule-replace-details-cancel"),
    );

    await waitFor(() =>
      expect(
        screen.queryByTestId("packaging-rule-replace-details-dialog"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("packaging-rule-level-dialog"),
    ).not.toBeInTheDocument();
  });

  it("still opens the row-level edit dialog for existing details", async () => {
    renderDialog();

    fireEvent.click(
      await screen.findByTestId("packaging-rule-detail-edit-0"),
    );

    expect(
      await screen.findByTestId("packaging-rule-detail-dialog"),
    ).toBeInTheDocument();
  });
});
