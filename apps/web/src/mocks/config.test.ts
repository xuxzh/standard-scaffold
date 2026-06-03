import { afterEach, describe, expect, it, vi } from "vitest";
import { getMockRecordCount, isApiMockingEnabled } from "@/mocks/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isApiMockingEnabled", () => {
  it("only enables API mocking when the explicit Vite flag is true", () => {
    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    expect(isApiMockingEnabled()).toBe(false);

    expect(isApiMockingEnabled()).toBe(false);

    vi.stubEnv("VITE_ENABLE_API_MOCKING", "true");
    expect(isApiMockingEnabled()).toBe(true);
  });
});

describe("getMockRecordCount", () => {
  it("returns 40 when the mock record count env is not configured", () => {
    vi.stubEnv("VITE_MOCK_RECORD_COUNT", undefined);

    expect(getMockRecordCount()).toBe(40);
  });

  it("returns the configured mock record count", () => {
    vi.stubEnv("VITE_MOCK_RECORD_COUNT", "80");

    expect(getMockRecordCount()).toBe(80);
  });

  it("falls back to 40 for invalid values", () => {
    for (const value of ["", "abc", "0", "-1"]) {
      vi.stubEnv("VITE_MOCK_RECORD_COUNT", value);

      expect(getMockRecordCount()).toBe(40);
    }
  });

  it("floors decimals and clamps very large values", () => {
    vi.stubEnv("VITE_MOCK_RECORD_COUNT", "12.9");
    expect(getMockRecordCount()).toBe(12);

    vi.stubEnv("VITE_MOCK_RECORD_COUNT", "1001");
    expect(getMockRecordCount()).toBe(1000);
  });
});
