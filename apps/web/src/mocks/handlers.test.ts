import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createAxiosTransport,
  createHttpClient,
  type DataResult,
} from "@/lib/api/http-client";
import type { PrintTemplateApiDto } from "@/features/mes/packaging/print-template/print-template-contract";
import { handlers } from "@/mocks/handlers";

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("mock handlers", () => {
  it("returns print templates in the DataResult shape expected by the HTTP client", async () => {
    const client = createHttpClient({
      transport: createAxiosTransport({ baseUrl: window.location.origin }),
    });

    const result = await client.postDataResult<PrintTemplateApiDto[]>(
      "/LabelTemplateFile/findLabelTemplateFileWithSimple",
      {},
    );

    expect(result).toMatchObject<DataResult<PrintTemplateApiDto[]>>({
      Success: true,
      Code: "",
      Message: "[Print] Query success",
      Attach: expect.arrayContaining([
        { TemplateCode: "TPL-A", TemplateName: "Standard Box Label" },
      ]),
      SkipCount: 0,
      TotalCount: 5,
      Record: 5,
    });
  });
});
