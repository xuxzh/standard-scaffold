import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from "@nestjs/common";
import type {
  XzErrorOption,
  XzHttpResponse,
} from "@/common/contracts/response.contract";

type ExceptionResponseBody = {
  message?: string | string[];
  error?: string;
  errorCode?: string;
  errors?: XzErrorOption[];
};

function toErrorCode(error: string | undefined, statusCode: number) {
  if (error) {
    return error.toUpperCase().replaceAll(" ", "_");
  }

  return `HTTP_${statusCode}`;
}

function getExceptionBody(exception: unknown): {
  statusCode: number;
  body: ExceptionResponseBody;
} {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const rawResponse = exception.getResponse();

    if (typeof rawResponse === "string") {
      return {
        statusCode,
        body: { message: rawResponse, error: exception.name },
      };
    }

    return {
      statusCode,
      body: rawResponse as ExceptionResponseBody,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { message: "Internal server error", error: "Internal Server Error" },
  };
}

function normalizeMessage(message: string | string[] | undefined) {
  if (Array.isArray(message)) {
    return message[0] ?? "Request failed";
  }

  return message ?? "Request failed";
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const { statusCode, body } = getExceptionBody(exception);

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled error (${statusCode}): ${(exception as Error)?.stack ?? exception}`,
      );
    }
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: XzHttpResponse<null>) => void };
    }>();
    const error = body.error ?? HttpStatus[statusCode] ?? "Error";

    response.status(statusCode).json({
      success: false,
      statusCode,
      message: normalizeMessage(body.message),
      data: null,
      error,
      errorCode: body.errorCode ?? toErrorCode(error, statusCode),
      errors: body.errors,
      timestamp: new Date().toISOString(),
    });
  }
}
