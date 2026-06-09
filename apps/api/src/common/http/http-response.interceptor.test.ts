import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { HttpResponseInterceptor } from "./http-response.interceptor";

function createContext(statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  } as ExecutionContext;
}

describe("HttpResponseInterceptor", () => {
  it("wraps successful responses in XzHttpResponse", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T01:02:03.000Z"));
    const interceptor = new HttpResponseInterceptor();
    const next: CallHandler = {
      handle: () => of({ id: 1, typeCode: "BOX" }),
    };

    const result = await lastValueFrom(
      interceptor.intercept(createContext(201), next),
    );

    expect(result).toEqual({
      success: true,
      statusCode: 201,
      message: "OK",
      data: { id: 1, typeCode: "BOX" },
      timestamp: "2026-06-09T01:02:03.000Z",
    });
    vi.useRealTimers();
  });
});
