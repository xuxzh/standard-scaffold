import { describe, expect, it } from "vitest";
import {
  createHttpClient,
  HttpClientError,
  type Transport,
} from "./http-client";

describe("createHttpClient", () => {
  it("returns transport data for successful requests", async () => {
    const transport: Transport = async () => ({
      status: 200,
      data: {
        stats: [{ key: "activeModules", value: "05" }],
      },
    });

    const client = createHttpClient({ transport });

    await expect(
      client.get<{ stats: Array<{ key: string; value: string }> }>(
        "/dashboard/stats",
      ),
    ).resolves.toEqual({
      stats: [{ key: "activeModules", value: "05" }],
    });
  });

  it("normalizes transport failures into HttpClientError instances", async () => {
    const transport: Transport = async () => ({
      status: 503,
      data: {
        message: "Dashboard service is temporarily unavailable",
      },
    });

    const client = createHttpClient({ transport });

    await expect(client.get("/dashboard/stats")).rejects.toEqual(
      new HttpClientError({
        message: "Dashboard service is temporarily unavailable",
        status: 503,
        code: "HTTP_ERROR",
      }),
    );
  });
});
