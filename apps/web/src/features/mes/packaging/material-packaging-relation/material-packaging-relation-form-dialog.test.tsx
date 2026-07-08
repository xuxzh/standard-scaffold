import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { setNavigatorLanguage } from "@/test/setup";
import type { MaterialPackagingRelationRecord } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { MaterialPackagingRelationFormDialog } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-form-dialog";

const invalidLevelSequenceRecord: MaterialPackagingRelationRecord = {
  id: 1,
  materialCode: "MAT-001",
  materialName: "Material 001",
  packagingRuleCode: "RULE-001",
  packagingRuleName: "Rule 001",
  remark: "",
  details: [
    {
      levelSequence: 0,
      packagingLevelCode: "LEVEL-001",
      packagingLevelName: "Level 001",
      specCode: "SPEC-001",
      specName: "Spec 001",
      quantity: 1,
      unit: "PCS",
      packagingTypeName: "Box",
      boxLabelPrintTemplate: "",
      packingListPrintTemplate: "",
    },
  ],
  rawDto: {
    Id: 1,
    MaterialCode: "MAT-001",
    MaterialName: "Material 001",
    PackagingRuleCode: "RULE-001",
    PackagingRuleName: "Rule 001",
    Details: [],
    Remark: "",
  },
};

describe("MaterialPackagingRelationFormDialog", () => {
  beforeEach(async () => {
    localStorage.clear();
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("shows nested detail field validation messages from zod", async () => {
    render(
      <MaterialPackagingRelationFormDialog
        open
        mode="edit"
        record={invalidLevelSequenceRecord}
        submitting={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByTestId("mpr-form-submit"));

    expect(
      await screen.findByText("层级序号必须为正整数"),
    ).toBeInTheDocument();
  });
});
