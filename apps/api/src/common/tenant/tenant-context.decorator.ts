import { createParamDecorator, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { TenantContext } from "./tenant-context";

type RequestWithTenantHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<RequestWithTenantHeaders>();
    const companyCode = firstHeader(request.headers["x-company-code"]);
    const factoryCode = firstHeader(request.headers["x-factory-code"]);

    if (!companyCode || !factoryCode) {
      throw new UnauthorizedException({
        message: "Tenant context is required",
        errorCode: "TENANT_CONTEXT_REQUIRED",
      });
    }

    return {
      companyCode,
      factoryCode,
      userId: Number(firstHeader(request.headers["x-user-id"]) ?? 0) || undefined,
      userName: firstHeader(request.headers["x-user-name"]),
    };
  },
);
