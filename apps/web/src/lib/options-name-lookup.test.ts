import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildCodeNameMap,
  useOptionsNameResolver,
} from "@/lib/options-name-lookup";

type Option = { code: string; name: string };

describe("buildCodeNameMap", () => {
  it("builds a map keyed by code, valued by name", () => {
    const map = buildCodeNameMap(
      [
        { code: "EA", name: "个" },
        { code: "BOX", name: "箱" },
      ],
      (option) => option.code,
      (option) => option.name,
    );

    expect(map.get("EA")).toBe("个");
    expect(map.get("BOX")).toBe("箱");
    expect(map.size).toBe(2);
  });

  it("returns an empty map when options are undefined", () => {
    const map = buildCodeNameMap(
      undefined,
      (option: Option) => option.code,
      (option: Option) => option.name,
    );

    expect(map.size).toBe(0);
  });

  it("returns an empty map when options are an empty array", () => {
    const map = buildCodeNameMap(
      [],
      (option: Option) => option.code,
      (option: Option) => option.name,
    );

    expect(map.size).toBe(0);
  });

  it("supports custom selector functions for heterogeneous option types", () => {
    const options = [
      { materialUnitCode: "EA", materialUnitName: "个" },
      { materialUnitCode: "BOX", materialUnitName: "箱" },
    ];

    const map = buildCodeNameMap(
      options,
      (option) => option.materialUnitCode,
      (option) => option.materialUnitName,
    );

    expect(map.get("EA")).toBe("个");
    expect(map.get("BOX")).toBe("箱");
  });
});

describe("useOptionsNameResolver", () => {
  it("returns a function that resolves code to name", () => {
    const options: Option[] = [
      { code: "EA", name: "个" },
      { code: "BOX", name: "箱" },
    ];

    const { result } = renderHook(() =>
      useOptionsNameResolver(
        options,
        (option) => option.code,
        (option) => option.name,
      ),
    );

    expect(result.current("EA")).toBe("个");
    expect(result.current("BOX")).toBe("箱");
  });

  it("falls back to the original code when no match is found", () => {
    const options: Option[] = [{ code: "EA", name: "个" }];

    const { result } = renderHook(() =>
      useOptionsNameResolver(
        options,
        (option) => option.code,
        (option) => option.name,
      ),
    );

    expect(result.current("UNKNOWN")).toBe("UNKNOWN");
  });

  it("falls back to the original code when options are undefined", () => {
    const { result } = renderHook(() =>
      useOptionsNameResolver(
        undefined,
        (option: Option) => option.code,
        (option: Option) => option.name,
      ),
    );

    expect(result.current("EA")).toBe("EA");
  });
});