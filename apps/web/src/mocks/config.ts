export const defaultMockRecordCount = 40;
export const maxMockRecordCount = 1000;

export function isApiMockingEnabled() {
  return import.meta.env.VITE_ENABLE_API_MOCKING === "true";
}

export function getMockRecordCount() {
  const rawValue = import.meta.env.VITE_MOCK_RECORD_COUNT;
  const parsedValue =
    typeof rawValue === "string" ? Number.parseFloat(rawValue) : Number.NaN;

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return defaultMockRecordCount;
  }

  return Math.min(Math.floor(parsedValue), maxMockRecordCount);
}
