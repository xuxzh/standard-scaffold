import { beforeEach, describe, expect, it, vi } from "vitest";

const aoaToSheet = vi.fn();
const bookNew = vi.fn();
const bookAppendSheet = vi.fn();
const writeFile = vi.fn();

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: aoaToSheet,
    book_new: bookNew,
    book_append_sheet: bookAppendSheet,
  },
  writeFile,
}));

import {
  DataExportEmptyError,
  exportRowsToExcel,
  type DataExportColumn,
} from "@/components/data-export/export-to-excel";

type ExportRow = {
  typeCode: string;
  typeName: string;
  isRecyclable: boolean;
  description?: string | null;
};

describe("exportRowsToExcel", () => {
  beforeEach(() => {
    aoaToSheet.mockReset();
    bookNew.mockReset();
    bookAppendSheet.mockReset();
    writeFile.mockReset();

    aoaToSheet.mockImplementation((rows: unknown[][]) => ({ rows }));
    bookNew.mockReturnValue({ Sheets: {}, SheetNames: [] });
  });

  it("throws DataExportEmptyError when no rows are provided", async () => {
    const columns: DataExportColumn<ExportRow>[] = [
      {
        key: "typeCode",
        header: "Type Code",
        value: (row) => row.typeCode,
      },
    ];

    await expect(
      exportRowsToExcel({
        filename: "packaging-types",
        sheetName: "Packaging Types",
        columns,
        rows: [],
      }),
    ).rejects.toBeInstanceOf(DataExportEmptyError);

    expect(aoaToSheet).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("builds rows in column order and writes an xlsx file", async () => {
    const columns: DataExportColumn<ExportRow>[] = [
      {
        key: "typeCode",
        header: "Type Code",
        value: (row) => row.typeCode,
      },
      {
        key: "typeName",
        header: "Type Name",
        value: (row) => row.typeName,
      },
      {
        key: "description",
        header: "Description",
        value: (row) => row.description,
      },
    ];

    const workbook = { Sheets: {}, SheetNames: [] };
    const sheet = { rows: [] };
    bookNew.mockReturnValue(workbook);
    aoaToSheet.mockReturnValue(sheet);

    await exportRowsToExcel({
      filename: "packaging-types",
      sheetName: "Packaging Types",
      columns,
      rows: [
        {
          typeCode: "PKG_TYPE_001",
          typeName: "Carton Box",
          isRecyclable: true,
          description: null,
        },
      ],
    });

    expect(aoaToSheet).toHaveBeenCalledWith([
      ["Type Code", "Type Name", "Description"],
      ["PKG_TYPE_001", "Carton Box", ""],
    ]);
    expect(bookAppendSheet).toHaveBeenCalledWith(
      workbook,
      sheet,
      "Packaging Types",
    );
    expect(writeFile).toHaveBeenCalledWith(workbook, "packaging-types.xlsx", {
      compression: true,
    });
  });

  it("preserves xlsx filenames without duplicating the extension", async () => {
    const columns: DataExportColumn<ExportRow>[] = [
      {
        key: "typeCode",
        header: "Type Code",
        value: (row) => row.typeCode,
      },
    ];

    const workbook = { Sheets: {}, SheetNames: [] };
    bookNew.mockReturnValue(workbook);

    await exportRowsToExcel({
      filename: "packaging-types.xlsx",
      sheetName: "Packaging Types",
      columns,
      rows: [
        {
          typeCode: "PKG_TYPE_001",
          typeName: "Carton Box",
          isRecyclable: true,
          description: "Reusable box",
        },
      ],
    });

    expect(writeFile).toHaveBeenCalledWith(workbook, "packaging-types.xlsx", {
      compression: true,
    });
  });
});
