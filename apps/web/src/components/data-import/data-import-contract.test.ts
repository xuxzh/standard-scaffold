import { describe, expect, it } from "vitest";
import {
  getImportGroupName,
  getImportListenMethod,
  importModulePortMap,
  type ImportModuleKey,
} from "@/components/data-import/data-import-contract";

describe("getImportListenMethod", () => {
  it("defaults to ${moduleKey}-${businessKey}", () => {
    expect(getImportListenMethod("MOM", "PackagingType")).toBe(
      "MOM-PackagingType",
    );
  });

  it("returns the explicit listen method when provided", () => {
    expect(
      getImportListenMethod("MOM", "PackagingType", "CustomListenMethod"),
    ).toBe("CustomListenMethod");
  });

  it("works for every supported module key", () => {
    const modules: ImportModuleKey[] = ["MOM", "PlatformV2", "WMS", "IOT"];

    for (const moduleKey of modules) {
      expect(getImportListenMethod(moduleKey, "Anything")).toBe(
        `${moduleKey}-Anything`,
      );
    }
  });
});

describe("getImportGroupName", () => {
  it("is always ${moduleKey}-${businessKey}", () => {
    expect(getImportGroupName("MOM", "PackagingType")).toBe(
      "MOM-PackagingType",
    );
    expect(getImportGroupName("WMS", "InboundOrder")).toBe(
      "WMS-InboundOrder",
    );
  });
});

describe("importModulePortMap", () => {
  it("contains a port for every typed module key", () => {
    const expectedPorts: Record<ImportModuleKey, number> = {
      MOM: 8282,
      PlatformV2: 8288,
      WMS: 8283,
      IOT: 7281,
    };

    for (const key of Object.keys(expectedPorts) as ImportModuleKey[]) {
      expect(importModulePortMap[key]).toBe(expectedPorts[key]);
    }
  });

  it("keeps IOT as a typed module key even though service calls reject it", () => {
    // Compile-time assertion via type narrowing: if IOT is not a valid key
    // the assignment below would fail typechecking.
    const iotKey: ImportModuleKey = "IOT";
    expect(importModulePortMap[iotKey]).toBe(7281);
  });
});
