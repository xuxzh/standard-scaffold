import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import { DataImportDialog } from "@/components/data-import/data-import-dialog";
import { I18nProvider } from "@/i18n/i18n-provider";
import { i18n } from "@/i18n/config";
import type { DataImportWithProgressResult } from "@/components/data-import/data-import-contract";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
}

afterEach(() => {
  resetMesTransportForTests();
});

beforeEach(async () => {
  await i18n.changeLanguage("zh-CN");
});

function makeSuccessResult(): DataImportWithProgressResult {
  return {
    Success: true,
    Code: null,
    Message: "[MES] 导入成功",
    Attach: { Status: "ImportSuccess", ErrorDatas: [] },
    DataHeadFields: [],
    SkipCount: 0,
    TotalCount: 5,
    Record: 0,
  };
}

function makePartialFailureResult(): DataImportWithProgressResult {
  return {
    Success: true,
    Code: null,
    Message: "部分导入失败",
    Attach: {
      Status: "ImportFail",
      ErrorDatas: [
        { Success: false, Message: "类型编码重复" },
      ],
    },
    DataHeadFields: [],
    SkipCount: 0,
    TotalCount: 5,
    Record: 1,
  };
}

function makeAllFailedResult(): DataImportWithProgressResult {
  return {
    Success: true,
    Code: null,
    Message: "导入失败",
    Attach: {
      Status: "ImportFail",
      ErrorDatas: [
        { Success: false, Message: "第 1 行编码重复" },
        { Success: false, Message: "第 2 行编码重复" },
        { Success: false, Message: "第 3 行编码重复" },
        { Success: false, Message: "第 4 行编码重复" },
        { Success: false, Message: "第 5 行编码重复" },
      ],
    },
    DataHeadFields: [],
    SkipCount: 0,
    TotalCount: 5,
    Record: 5,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read error"));
    reader.readAsDataURL(file);
  });
}

function createFile(name: string) {
  return new File(["hello"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("DataImportDialog", () => {
  it("renders idle state with select-file button", async () => {
    render(
      <DataImportDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName="包装类型维护"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    expect(await screen.findByText("选择文件")).toBeInTheDocument();
  });

  it("selects file, converts to base64 and calls import", async () => {
    const result = makeSuccessResult();
    const transport = vi.fn<Transport>(async (request) => {
      if (request.path === "/DataImportApi/DataImportWithProgress") {
        return { status: 200, data: result };
      }

      return {
        status: 200,
        data: {
          Success: true,
          Code: "",
          Message: "ok",
          Attach: null,
          SkipCount: 0,
          TotalCount: 0,
          Record: 0,
        } satisfies DataResult<null>,
      };
    });

    setMesTransportForTests(transport);

    const onImported = vi.fn();

    render(
      <DataImportDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName="包装类型维护"
        onImported={onImported}
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    const file = createFile("template.xlsx");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    expect(input).toBeTruthy();

    await act(async () => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      fireEvent.change(input);
    });

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/DataImportApi/DataImportWithProgress",
        }),
      );
    });

    const importCall = transport.mock.calls
      .map(([request]) => request)
      .find(
        (request) =>
          request.path === "/DataImportApi/DataImportWithProgress",
      );
    const body = importCall?.body as {
      FileStreamString: string;
      ModuleKey: string;
      BusinessKey: string;
      RequestId: string;
    };
    const dataUrl = await readFileAsDataUrl(file);

    expect(body.FileStreamString).toBe(dataUrl.split(",")[1]);
    expect(body.ModuleKey).toBe("MOM");
    expect(body.BusinessKey).toBe("PackagingType");
    expect(typeof body.RequestId).toBe("string");
  });

  it("success result calls onImported and shows success state", async () => {
    const result = makeSuccessResult();
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    const onImported = vi.fn();

    render(
      <DataImportDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName="包装类型维护"
        onImported={onImported}
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    const file = createFile("template.xlsx");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      fireEvent.change(input);
    });

    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("导入成功")).toBeInTheDocument();
  });

  it("partial import calls onImported and enables error export", async () => {
    const result = makePartialFailureResult();
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    const onImported = vi.fn();

    render(
      <DataImportDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName="包装类型维护"
        onImported={onImported}
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    const file = createFile("template.xlsx");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      fireEvent.change(input);
    });

    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    expect(screen.getByText("导出错误数据")).toBeInTheDocument();
  });

  it("all-failed import does not call onImported", async () => {
    const result = makeAllFailedResult();
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    const onImported = vi.fn();

    render(
      <DataImportDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName="包装类型维护"
        onImported={onImported}
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    const file = createFile("template.xlsx");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      fireEvent.change(input);
    });

    await waitFor(() => {
      expect(screen.getByText("导出错误数据")).toBeInTheDocument();
    });

    expect(onImported).not.toHaveBeenCalled();
  });

  it("close during upload cancels task", async () => {
    let resolveImport: ((value: { status: number; data: DataImportWithProgressResult }) => void) | undefined;

    const transport = vi.fn<Transport>(async (request) => {
      if (request.path === "/DataImportApi/DataImportWithProgress") {
        return new Promise((resolve) => {
          resolveImport = resolve;
        });
      }

      if (request.path === "/ImportTask/CancelTask") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "ok",
            Attach: null,
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          } satisfies DataResult<null>,
        };
      }

      return { status: 200, data: null };
    });

    setMesTransportForTests(transport);

    const onOpenChange = vi.fn();

    render(
      <DataImportDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName="包装类型维护"
        onOpenChange={onOpenChange}
      />,
      { wrapper: makeWrapper() },
    );

    const file = createFile("template.xlsx");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      fireEvent.change(input);
    });

    // Wait for the import request to be in flight.
    await waitFor(() => {
      expect(
        transport.mock.calls.some(
          ([request]) =>
            (request as { path?: string }).path ===
            "/DataImportApi/DataImportWithProgress",
        ),
      ).toBe(true);
    });

    // Trigger close by clicking the dialog's top-right X button.
    const topRightClose = screen.getByRole("button", { name: "关闭弹窗" });
    expect(topRightClose).toBeTruthy();

    fireEvent.click(topRightClose);

    // The import was resolved (so the dialog can settle) and cancel was sent.
    await waitFor(() => {
      expect(
        transport.mock.calls.some(
          ([request]) =>
            (request as { path?: string }).path === "/ImportTask/CancelTask",
        ),
      ).toBe(true);
    });

    if (resolveImport) {
      resolveImport({ status: 200, data: makeSuccessResult() });
    }
  });

  it("close after success does not cancel task", async () => {
    const result = makeSuccessResult();
    let importCallCount = 0;
    const transport = vi.fn<Transport>(async (request) => {
      if (request.path === "/DataImportApi/DataImportWithProgress") {
        importCallCount += 1;
        return { status: 200, data: result };
      }
      return { status: 200, data: null };
    });

    setMesTransportForTests(transport);

    const onOpenChange = vi.fn();

    const { rerender } = render(
      <DataImportDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        businessName="包装类型维护"
        onOpenChange={onOpenChange}
      />,
      { wrapper: makeWrapper() },
    );

    const file = createFile("template.xlsx");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      fireEvent.change(input);
    });

    await waitFor(() => expect(importCallCount).toBe(1));
    await waitFor(() => expect(screen.queryByText("导入成功")).toBeInTheDocument());

    // Now close.
    await act(async () => {
      rerender(
        <DataImportDialog
          open={false}
          moduleKey="MOM"
          businessKey="PackagingType"
          businessName="包装类型维护"
          onOpenChange={onOpenChange}
        />,
      );
    });

    // No CancelTask should be sent because the task already succeeded.
    const cancelCalls = transport.mock.calls.filter(
      ([request]) =>
        (request as { path?: string }).path === "/ImportTask/CancelTask",
    );
    expect(cancelCalls).toHaveLength(0);
  });
});
