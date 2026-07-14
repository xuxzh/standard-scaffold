import {
  BadRequestException,
  ValidationPipe,
  type Type,
  type ValidationError,
} from "@nestjs/common";
import type { XzErrorOption } from "@/common/contracts/response.contract";

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = "",
): XzErrorOption[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const current = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
      errorCode: "VALIDATION_ERROR",
    }));

    return [
      ...current,
      ...flattenValidationErrors(error.children ?? [], field),
    ];
  });
}

export function createValidationPipe(expectedType?: Type) {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    expectedType,
    exceptionFactory: (errors) =>
      new BadRequestException({
        message: "Validation failed",
        errorCode: "VALIDATION_ERROR",
        errors: flattenValidationErrors(errors),
      }),
  });
}
