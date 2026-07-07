const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizeFilename(filename: string) {
  return filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);

  for (let index = 0; index < length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function downloadBase64ExcelFile(base64: string, filename: string) {
  const bytes = base64ToUint8Array(base64);
  const blob = new Blob([bytes], { type: EXCEL_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = normalizeFilename(filename);
  anchor.click();

  URL.revokeObjectURL(url);
}
