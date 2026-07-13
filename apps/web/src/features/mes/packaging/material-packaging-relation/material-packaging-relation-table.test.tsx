import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MaterialPackagingRelationDetail,
  MaterialPackagingRelationRecord,
} from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { MaterialPackagingRelationTable } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-table";
import { i18n } from "@/i18n/config";
import { setNavigatorLanguage } from "@/test/setup";

const firstDetail: MaterialPackagingRelationDetail = {
  levelSequence: 1,
  packagingLevelCode: "LEVEL-001",
  packagingLevelName: "Level One",
  specCode: "SPEC-001",
  specName: "Spec One",
  quantity: 0,
  unit: "",
  packagingTypeName: "Box",
  boxLabelPrintTemplate: "",
  packingListPrintTemplate: "LIST-001",
};

const secondDetail: MaterialPackagingRelationDetail = {
  ...firstDetail,
  levelSequence: 2,
  packagingLevelCode: "LEVEL-002",
  packagingLevelName: "Level Two",
  specCode: "SPEC-002",
  specName: "Spec Two",
  quantity: 2,
  unit: "PCS",
  packagingTypeName: "Bag",
  boxLabelPrintTemplate: "BOX-002",
  packingListPrintTemplate: "LIST-002",
};

function createRecord(
  overrides: Pick<
    MaterialPackagingRelationRecord,
    "id" | "materialCode" | "details"
  >,
): MaterialPackagingRelationRecord {
  const materialName = `Material ${overrides.id}`;
  const packagingRuleCode = `RULE-${overrides.id}`;
  const packagingRuleName = `Rule ${overrides.id}`;

  return {
    materialName,
    packagingRuleCode,
    packagingRuleName,
    remark: "",
    rawDto: {
      Id: overrides.id,
      MaterialCode: overrides.materialCode,
      MaterialName: materialName,
      PackagingRuleCode: packagingRuleCode,
      PackagingRuleName: packagingRuleName,
      Details: [],
    },
    ...overrides,
  };
}

const records = [
  createRecord({
    id: 1,
    materialCode: "MAT-001",
    details: [firstDetail, secondDetail],
  }),
  createRecord({ id: 2, materialCode: "MAT-002", details: [] }),
];

function renderTable() {
  return render(
    <MaterialPackagingRelationTable
      data={records}
      pageIndex={1}
      pageSize={20}
      selectedRelationIds={[]}
      onToggleAll={vi.fn()}
      onToggleOne={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe("MaterialPackagingRelationTable", () => {
  beforeEach(async () => {
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders one parent row per relation with its detail count", () => {
    renderTable();

    expect(
      screen.getAllByTestId(/material-packaging-relation-select-/),
    ).toHaveLength(2);
    expect(
      screen.getByRole("columnheader", { name: "明细数量" }),
    ).toBeInTheDocument();

    const firstRow = screen.getByText("MAT-001").closest("tr");
    const secondRow = screen.getByText("MAT-002").closest("tr");

    expect(firstRow).not.toBeNull();
    expect(secondRow).not.toBeNull();
    expect(within(firstRow!).getByText("2")).toBeInTheDocument();
    expect(within(secondRow!).getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("LEVEL-001")).not.toBeInTheDocument();
  });

  it("expands relation details and preserves zero and empty values", () => {
    renderTable();

    expect(
      screen.queryByRole("button", { name: "展开 MAT-002" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开 MAT-001" }));

    const details = screen.getByTestId("material-packaging-relation-details-1");

    expect(
      within(details).getByRole("columnheader", { name: "层级序号" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "包装层级编码" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "包装层级" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "包装规格编码" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "包装规格" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "包装数量" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "单位" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "包装类型" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "箱标签打印模板" }),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole("columnheader", { name: "装箱单打印模板" }),
    ).toBeInTheDocument();
    expect(within(details).getByText("LEVEL-001")).toBeInTheDocument();
    expect(within(details).getByText("LEVEL-002")).toBeInTheDocument();
    expect(within(details).getByText("SPEC-001")).toBeInTheDocument();
    expect(within(details).getByText("Spec One")).toBeInTheDocument();
    expect(within(details).getByText("Box")).toBeInTheDocument();
    expect(within(details).getByText("LIST-001")).toBeInTheDocument();
    expect(within(details).getByText("PCS")).toBeInTheDocument();
    expect(within(details).getByText("BOX-002")).toBeInTheDocument();
    expect(within(details).getByText("0")).toBeInTheDocument();
    expect(within(details).getAllByText("-").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "收起 MAT-001" }));
    expect(
      screen.queryByTestId("material-packaging-relation-details-1"),
    ).not.toBeInTheDocument();
  });

  it("keeps selection and actions scoped to the parent relation", () => {
    const onToggleAll = vi.fn();
    const onToggleOne = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <MaterialPackagingRelationTable
        data={records}
        pageIndex={1}
        pageSize={20}
        selectedRelationIds={[1]}
        onToggleAll={onToggleAll}
        onToggleOne={onToggleOne}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const selectedCheckbox = screen.getByTestId(
      "material-packaging-relation-select-1",
    );

    expect(selectedCheckbox).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "展开 MAT-001" }));
    expect(selectedCheckbox).toBeChecked();

    fireEvent.click(selectedCheckbox);
    expect(onToggleOne).toHaveBeenCalledWith(1, false);

    fireEvent.click(screen.getByTestId("material-packaging-relation-edit-1"));
    expect(onEdit).toHaveBeenCalledWith(records[0]);

    fireEvent.click(
      screen.getByTestId("material-packaging-relation-delete-1"),
    );
    expect(onDelete).toHaveBeenCalledWith(records[0]);

    fireEvent.click(screen.getByRole("checkbox", { name: "全选" }));
    expect(onToggleAll).toHaveBeenCalledWith(true);
  });
});
