import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores/app-store";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.getState().resetAppStore();
  });

  it("starts without an active scope name", () => {
    expect(useAppStore.getState().activeScopeName).toBeNull();
  });

  it("updates the active scope name", () => {
    useAppStore.getState().setActiveScopeName("华东仓");

    expect(useAppStore.getState().activeScopeName).toBe("华东仓");
  });

  it("resets app state to its initial values", () => {
    useAppStore.getState().setActiveScopeName("华南仓");

    useAppStore.getState().resetAppStore();

    expect(useAppStore.getState().activeScopeName).toBeNull();
  });
});
