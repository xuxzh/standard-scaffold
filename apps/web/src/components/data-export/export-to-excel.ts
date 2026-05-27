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

function normalizeCellValue(value: DataExportCellValue) {
  if (value == null) {
    return "";
  }

  return value;
}

function normalizeFilename(filename: string) {
  return filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
}

export async function exportRowsToExcel<TData>(
  options: ExportRowsToExcelOptions<TData>,
): Promise<void> {
  if (options.rows.length === 0) {
    throw new DataExportEmptyError();
  }

  const { utils, writeFile } = await import("xlsx");
  const worksheetData = [
    options.columns.map((column) => column.header),
    ...options.rows.map((row) =>
      options.columns.map((column) => normalizeCellValue(column.value(row))),
    ),
  ];
  const worksheet = utils.aoa_to_sheet(worksheetData);
  const workbook = utils.book_new();

  utils.book_append_sheet(workbook, worksheet, options.sheetName);
  writeFile(workbook, normalizeFilename(options.filename), {
    compression: true,
  });
}
