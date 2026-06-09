import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { HttpExceptionFilter } from "./http-exception.filter";

function createHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  };

  return { host, status, json };
}

describe("HttpExceptionFilter", () => {
  it("normalizes Nest http exceptions", () => {
    const { host, status, json } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(new NotFoundException("Packaging type not found"), host as never);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: "Packaging type not found",
        data: null,
        error: "Not Found",
        errorCode: "NOT_FOUND",
      }),
    );
  });

  it("preserves validation error details", () => {
    const { host, json } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(
      new BadRequestException({
        message: "Validation failed",
        errorCode: "VALIDATION_ERROR",
        errors: [{ field: "typeCode", message: "typeCode is required" }],
      }),
      host as never,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: "VALIDATION_ERROR",
        errors: [{ field: "typeCode", message: "typeCode is required" }],
      }),
    );
  });
});
