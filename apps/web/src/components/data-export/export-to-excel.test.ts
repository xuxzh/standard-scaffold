import { beforeEach, describe, expect, it, vi } from "vitest";

const aoaToSheet = vi.fn();
const bookNew = vi.fn();
const bookAppendSheet = vi.fn();
const writeFile = vi.fn();
const encodeCell = vi.fn(
  (address: { r: number; c: number }) =>
    `${String.fromCharCode(65 + address.c)}${address.r + 1}`,
);

vi.mock("xlsx-js-style", () => ({
  default: {
    utils: {
      aoa_to_sheet: aoaToSheet,
      book_new: bookNew,
      book_append_sheet: bookAppendSheet,
      encode_cell: encodeCell,
    },
    writeFile,
  },
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

function buildWorksheet(data: unknown[][]) {
  const worksheet: Record<string, { v?: unknown; s?: unknown }> & {
    "!cols"?: { wch: number }[];
  } = {};

  data.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const address = encodeCell({ r: rowIndex, c: columnIndex });
      worksheet[address] = { v: value };
    });
  });

  return worksheet;
}

describe("exportRowsToExcel", () => {
  beforeEach(() => {
    aoaToSheet.mockReset();
    bookNew.mockReset();
    bookAppendSheet.mockReset();
    writeFile.mockReset();
    encodeCell.mockClear();

    aoaToSheet.mockImplementation((rows: unknown[][]) => buildWorksheet(rows));
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
    bookNew.mockReturnValue(workbook);

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
      expect.objectContaining({ "!cols": expect.any(Array) }),
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

  it("applies a gray fill to header cells", async () => {
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
    ];

    const worksheet = buildWorksheet([
      ["Type Code", "Type Name"],
      ["PKG_TYPE_001", "Carton Box"],
    ]);
    aoaToSheet.mockReturnValue(worksheet);

    await exportRowsToExcel({
      filename: "packaging-types",
      sheetName: "Packaging Types",
      columns,
      rows: [
        {
          typeCode: "PKG_TYPE_001",
          typeName: "Carton Box",
          isRecyclable: true,
        },
      ],
    });

    const headerA = worksheet["A1"];
    const headerB = worksheet["B1"];
    const bodyA = worksheet["A2"];

    expect(headerA?.s).toEqual({
      fill: {
        fgColor: { rgb: "FFD9D9D9" },
        patternType: "solid",
      },
      font: { bold: true },
    });
    expect(headerB?.s).toBe(headerA?.s);
    expect(bodyA?.s).toBeUndefined();
  });

  it("sets auto-fit column widths capped at the 480px maximum", async () => {
    const columns: DataExportColumn<ExportRow>[] = [
      {
        key: "typeCode",
        header: "Code",
        value: (row) => row.typeCode,
      },
      {
        key: "typeName",
        header: "Name",
        value: (row) => row.typeName,
      },
      {
        key: "description",
        header: "Description",
        value: (row) => row.description,
      },
    ];

    const longValue = "x".repeat(120);
    const worksheet = buildWorksheet([
      ["Code", "Name", "Description"],
      ["PKG_TYPE_001", "Carton Box", longValue],
    ]);
    aoaToSheet.mockReturnValue(worksheet);

    await exportRowsToExcel({
      filename: "packaging-types",
      sheetName: "Packaging Types",
      columns,
      rows: [
        {
          typeCode: "PKG_TYPE_001",
          typeName: "Carton Box",
          isRecyclable: true,
          description: longValue,
        },
      ],
    });

    expect(worksheet["!cols"]).toEqual([
      { wch: 12 }, // "PKG_TYPE_001" wins over "Code" (4)
      { wch: 10 }, // "Name" / "Carton Box"
      { wch: 68 }, // capped at MAX_COLUMN_WIDTH_CHARS
    ]);
  });
});