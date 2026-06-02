import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import {
  getMaterialPickerRecords,
  type MaterialPickerApiDto,
} from "@/features/mes/material/material-picker-service";

const materialDto: MaterialPickerApiDto = {
  Id: 1,
  MaterialCode: "MAT_001",
  MaterialName: "Cylinder",
  MaterialSpecification: "STD",
  MaterialTypeName: "Self-made",
};

afterEach(() => {
  resetMesTransportForTests();
});

describe("material picker service", () => {
  it("queries material records with the picker filters and fixed company scope", async () => {
    const result: DataResult<MaterialPickerApiDto[]> = {
      Success: true,
      Code: "",
      Message: "[MES] Query success",
      Attach: [materialDto],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    await expect(
      getMaterialPickerRecords({
        MaterialCode: "MAT",
        MaterialName: "Cylinder",
        IsPaged: true,
        PageSize: 20,
        PageIndex: 2,
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
      body: {
        MaterialCode: "MAT",
        MaterialName: "Cylinder",
        MaterialSpecification: "",
        IsProduct: null,
        IsSemiFinishedProduct: null,
        IsMaterial: null,
        MaterialCategoryCode: null,
        IsSingleCodeControl: null,
        MaterialAttribute: null,
        IsUse: null,
        IsPaged: true,
        PageSize: 20,
        PageIndex: 2,
        CompanyCode: "00000",
        FactoryCode: "00000.00001",
      },
      signal: undefined,
    });
  });
});
