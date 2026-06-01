import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import {
  getInventoryVerificationStrategies,
  type InventoryVerificationStrategy,
} from "@/features/mes/inventory-verification-strategy-service";

afterEach(() => {
  resetMesTransportForTests();
});

describe("getInventoryVerificationStrategies", () => {
  it("queries the MES inventory verification strategy endpoint", async () => {
    const result: DataResult<InventoryVerificationStrategy[]> = {
      Success: true,
      Code: "",
      Message: "[MES] 获取数据成功！",
      Attach: [
        {
          Id: 1,
          StrategyCode: "IVS001",
          StrategyName: "默认盘点策略",
        },
      ],
      SkipCount: 0,
      TotalCount: 1,
      Record: 1,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);
    setMesTransportForTests(transport);

    await expect(
      getInventoryVerificationStrategies({
        IsPaged: true,
        PageIndex: 1,
        PageSize: 10,
        StrategyCode: "$IVS001",
      }),
    ).resolves.toEqual(result);

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      path: "/InventoryVerificationStrategyApi/GetInventoryVerificationStrategyAutoQueryDatas",
      body: {
        IsPaged: true,
        PageIndex: 1,
        PageSize: 10,
        StrategyCode: "$IVS001",
      },
      signal: undefined,
    });
  });
});
