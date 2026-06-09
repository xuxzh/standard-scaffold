import { describe, expect, it } from "vitest";
import { formatBuildVersion } from "@/lib/version/format-version";

describe("formatBuildVersion", () => {
  it("formats a typical daytime timestamp", () => {
    // 2026-06-09 09:47
    const date = new Date(2026, 5, 9, 9, 47);

    expect(formatBuildVersion(date)).toBe("26.06.09.0947");
  });

  it("pads single-digit month/day/hour/minute with zero", () => {
    // 2026-01-02 03:04
    const date = new Date(2026, 0, 2, 3, 4);

    expect(formatBuildVersion(date)).toBe("26.01.02.0304");
  });

  it("uses the last two digits of the year", () => {
    // 2099-12-31 23:59
    const date = new Date(2099, 11, 31, 23, 59);

    expect(formatBuildVersion(date)).toBe("99.12.31.2359");
  });

  it("rolls over year boundary naturally", () => {
    // 2027-01-01 00:00 — Date 自身承载,函数只做格式化
    const date = new Date(2027, 0, 1, 0, 0);

    expect(formatBuildVersion(date)).toBe("27.01.01.0000");
  });

  it("does not depend on the current time", () => {
    const before = new Date(2020, 0, 1, 0, 0);
    const after = new Date(2030, 11, 31, 23, 59);

    expect(formatBuildVersion(before)).toBe("20.01.01.0000");
    expect(formatBuildVersion(after)).toBe("30.12.31.2359");
  });
});
