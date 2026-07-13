export type DataExportCellValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type DataExportColumn<TData> = {
  key: string;
  header: string;
  value: (row: TData) => DataExportCellValue;
};

export type ExportRowsToExcelOptions<TData> = {
  filename: string;
  sheetName: string;
  columns: DataExportColumn<TData>[];
  rows: TData[];
};

export class DataExportEmptyError extends Error {
  constructor(message = "No data available for export.") {
    super(message);
    this.name = "DataExportEmptyError";
  }
}

const HEADER_FILL_COLOR = "FFD9D9D9";

// Excel 默认字体的 1 个 wch 约等于 7 像素；480px 上限换算约为 68 wch。
const MAX_COLUMN_WIDTH_CHARS = 68;

function normalizeCellValue(value: DataExportCellValue) {
  if (value == null) {
    return "";
  }

  return value;
}

function normalizeFilename(filename: string) {
  return filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
}

function stringDisplayLength(value: unknown) {
  if (value == null) {
    return 0;
  }

  if (value instanceof Date) {
    return value.toISOString().length;
  }

  return String(value).length;
}

function buildHeaderStyle() {
  return {
    fill: {
      fgColor: { rgb: HEADER_FILL_COLOR },
      patternType: "solid",
    },
    font: { bold: true },
  };
}

function applyHeaderStyle(
  worksheet: { [key: string]: { s?: unknown } | undefined },
  columnCount: number,
  encodeCell: (address: { r: number; c: number }) => string,
): void {
  const headerStyle = buildHeaderStyle();

  for (let column = 0; column < columnCount; column += 1) {
    const cellAddress = encodeCell({ r: 0, c: column });
    const cell = worksheet[cellAddress];

    if (cell) {
      cell.s = headerStyle;
    }
  }
}

function calculateColumnWidths(
  columns: { header: string }[],
  rows: unknown[][],
): { wch: number }[] {
  return columns.map((column, columnIndex) => {
    const headerLength = stringDisplayLength(column.header);
    const maxValueLength = rows.reduce((currentMax, row) => {
      const cellLength = stringDisplayLength(row[columnIndex]);
      return cellLength > currentMax ? cellLength : currentMax;
    }, 0);

    const width = Math.max(headerLength, maxValueLength, 1);
    const clampedWidth = Math.min(width, MAX_COLUMN_WIDTH_CHARS);

    return { wch: clampedWidth };
  });
}

export async function exportRowsToExcel<TData>(
  options: ExportRowsToExcelOptions<TData>,
): Promise<void> {
  if (options.rows.length === 0) {
    throw new DataExportEmptyError();
  }

  // xlsx-js-style 是 CommonJS 包，全部 API 挂在 default 导出上
  const xlsxModule = await import("xlsx-js-style");
  const xlsx = xlsxModule.default ?? xlsxModule;
  const utils = xlsx.utils;
  const writeFile = xlsx.writeFile;

  const worksheetData = [
    options.columns.map((column) => column.header),
    ...options.rows.map((row) =>
      options.columns.map((column) => normalizeCellValue(column.value(row))),
    ),
  ];
  const worksheet = utils.aoa_to_sheet(worksheetData);

  applyHeaderStyle(worksheet, options.columns.length, utils.encode_cell);

  const normalizedRows = worksheetData.slice(1);
  worksheet["!cols"] = calculateColumnWidths(options.columns, normalizedRows);

  const workbook = utils.book_new();

  utils.book_append_sheet(workbook, worksheet, options.sheetName);
  writeFile(workbook, normalizeFilename(options.filename), {
    compression: true,
  });
}