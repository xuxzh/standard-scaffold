import { beforeEach, describe, expect, it } from "vitest";
import {
  clearUserDisplay,
  getUserDisplay,
  setUserDisplay
} from "@/lib/auth/user-display-store";

describe("user-display-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and clears the current user display", () => {
    setUserDisplay({
      userCode: "DemoAdmin",
      displayName: "DemoAdmin"
    });

    expect(getUserDisplay()).toEqual({
      userCode: "DemoAdmin",
      displayName: "DemoAdmin"
    });

    clearUserDisplay();

    expect(getUserDisplay()).toBeNull();
  });
});
