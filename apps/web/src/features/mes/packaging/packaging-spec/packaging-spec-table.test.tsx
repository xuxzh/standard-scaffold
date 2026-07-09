import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import type { PackagingSpecRecord } from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
import { PackagingSpecTable } from "@/features/mes/packaging/packaging-spec/packaging-spec-table";

const record: PackagingSpecRecord = {
  id: 1,
  specCode: "SPEC-001",
  specName: "Standard carton",
  packagingTypeCode: "TYPE-001",
  packagingTypeName: "Carton",
  barcodeRuleCode: "BARCODE-001",
  barcodeRuleName: "Default barcode",
  length: 10,
  width: 20,
  height: 30,
  volume: 0.006,
  maxWeight: 50,
  grossWeight: 45,
  tareWeight: 5,
  standardCapacity: 12,
  stackLimit: 6,
  unit: "pcs",
  isEnabled: true,
  remark: "",
};

describe("PackagingSpecTable", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("zh-CN");
  });

  it("keeps non-pinned header cells opaque while scrolling", () => {
    render(
      <PackagingSpecTable
        data={[record]}
        pageIndex={1}
        pageSize={20}
        selectedIds={[]}
        onToggleAll={vi.fn()}
        onToggleOne={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const header = screen.getByRole("columnheader", { name: "规格编码" });

    expect(header).toHaveClass("bg-muted");
    expect(header).not.toHaveClass("bg-muted/40");
  });
});
