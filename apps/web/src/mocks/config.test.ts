import { afterEach, describe, expect, it, vi } from "vitest";
import { isApiMockingEnabled } from "@/mocks/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isApiMockingEnabled", () => {
  it("only enables API mocking when the explicit Vite flag is true", () => {
    expect(isApiMockingEnabled()).toBe(false);

    vi.stubEnv("VITE_ENABLE_API_MOCKING", "false");
    expect(isApiMockingEnabled()).toBe(false);

    vi.stubEnv("VITE_ENABLE_API_MOCKING", "true");
    expect(isApiMockingEnabled()).toBe(true);
  });
});
