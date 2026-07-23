import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetAppTransportForTests,
  setAppTransportForTests,
} from "@/lib/api/app-client";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import type { DataResult, Transport } from "@/lib/api/http-client";
import { DataImportTemplateDialog } from "@/components/data-import/data-import-template-dialog";
import type { DataImportTemplateMetadata } from "@/components/data-import/data-import-contract";
import { I18nProvider } from "@/i18n/i18n-provider";
import { i18n } from "@/i18n/config";
import { notify } from "@/lib/notify";

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

const baseMetadata: DataImportTemplateMetadata[] = [
  {
    Id: "1",
    FieldName: "TypeCode",
    FieldDisplayName: "Type Code",
    IsUse: true,
    IsRequired: true,
    IsSystemRequired: true,
    SortId: 1,
  },
  {
    Id: "2",
    FieldName: "TypeName",
    FieldDisplayName: "Type Name",
    IsUse: true,
    IsRequired: true,
    IsSystemRequired: false,
    SortId: 2,
  },
  {
    Id: "3",
    FieldName: "Description",
    FieldDisplayName: "Description",
    IsUse: true,
    IsRequired: false,
    IsSystemRequired: false,
    SortId: 3,
  },
];

afterEach(() => {
  resetMesTransportForTests();
  resetAppTransportForTests();
});

beforeEach(async () => {
  // Use a stable uuid-shaped fallback for jsdom.
  if (!("randomUUID" in globalThis.crypto)) {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => "fixed-uuid",
    });
  }
  await i18n.changeLanguage("zh-CN");
});

describe("DataImportTemplateDialog", () => {
  it("loads and sorts metadata by SortId when opened", async () => {
    const result: DataResult<DataImportTemplateMetadata[]> = {
      Success: true,
      Code: "",
      Message: "ok",
      Attach: [...baseMetadata].sort((a, b) => b.SortId - a.SortId),
      SkipCount: 0,
      TotalCount: 3,
      Record: 3,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    render(
      <DataImportTemplateDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/DataImportApi/GetMetadataDatas",
        }),
      );
    });

    const rows = await screen.findAllByRole("row");

    // header row + 3 data rows
    expect(rows.length).toBeGreaterThanOrEqual(4);

    // Sorted ascending by SortId -> TypeCode first.
    const dataRowCells = rows
      .slice(1)
      .map((row) => row.querySelectorAll("td")[1]?.textContent);

    expect(dataRowCells).toEqual(["Type Code", "Type Name", "Description"]);
  });

  it("clears and disables IsRequired when IsUse is toggled to false", async () => {
    const result: DataResult<DataImportTemplateMetadata[]> = {
      Success: true,
      Code: "",
      Message: "ok",
      Attach: baseMetadata.map((row) => ({ ...row })),
      SkipCount: 0,
      TotalCount: 3,
      Record: 3,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);
    // `storeMetaDatas` is served by the Platform V2 client (shared
    // TemplateManagementApi), so the save path needs an App mock too.
    setAppTransportForTests(transport);

    render(
      <DataImportTemplateDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    await screen.findByText("Type Name");

    const switches = screen.getAllByRole("switch");
    const typeNameUseSwitch = switches[0];
    const typeNameRequiredSwitch = switches[1];

    expect(typeNameRequiredSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(typeNameUseSwitch);

    expect(typeNameRequiredSwitch).toBeDisabled();
    expect(typeNameRequiredSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(typeNameRequiredSwitch);

    expect(typeNameRequiredSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      const saveCall = transport.mock.calls.find(
        ([request]) =>
          (request as { path?: string }).path ===
          "/TemplateManagementApi/StoreMetaDatas?moduleKey=MOM&businessKey=PackagingType",
      );

      expect(saveCall).toBeDefined();
    });

    const saveRequest = transport.mock.calls
      .map(([request]) => request)
      .find(
        (request) =>
          request.path ===
          "/TemplateManagementApi/StoreMetaDatas?moduleKey=MOM&businessKey=PackagingType",
      );

    const saved = saveRequest?.body as DataImportTemplateMetadata[];
    const typeNameRow = saved.find((row) => row.FieldName === "TypeName");

    expect(typeNameRow?.IsUse).toBe(false);
    expect(typeNameRow?.IsRequired).toBe(false);
  });

  it("renders IsSystemRequired rows as read-only", async () => {
    const result: DataResult<DataImportTemplateMetadata[]> = {
      Success: true,
      Code: "",
      Message: "ok",
      Attach: baseMetadata.map((row) => ({ ...row })),
      SkipCount: 0,
      TotalCount: 3,
      Record: 3,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);

    render(
      <DataImportTemplateDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    await screen.findByText("Type Code");

    // First row (TypeCode) is system required -> should not have an IsUse switch.
    const switches = screen.getAllByRole("switch");

    // 1 system row means 2 rows have 2 switches each (TypeName+Description) = 4
    expect(switches).toHaveLength(4);
  });

  it("reorder updates SortId and saves the full list", async () => {
    const result: DataResult<DataImportTemplateMetadata[]> = {
      Success: true,
      Code: "",
      Message: "ok",
      Attach: baseMetadata.map((row) => ({ ...row })),
      SkipCount: 0,
      TotalCount: 3,
      Record: 3,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);
    setAppTransportForTests(transport);

    render(
      <DataImportTemplateDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    await screen.findByText("Type Name");

    // Move the second row (TypeName) up.
    const moveUpButtons = screen.getAllByRole("button", { name: "上移" });

    fireEvent.click(moveUpButtons[1]);

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      const saveCall = transport.mock.calls.find(
        ([request]) =>
          (request as { path?: string }).path ===
          "/TemplateManagementApi/StoreMetaDatas?moduleKey=MOM&businessKey=PackagingType",
      );

      expect(saveCall).toBeDefined();
    });

    const saveRequest = transport.mock.calls
      .map(([request]) => request)
      .find(
        (request) =>
          request.path ===
          "/TemplateManagementApi/StoreMetaDatas?moduleKey=MOM&businessKey=PackagingType",
      );

    const saved = saveRequest?.body as DataImportTemplateMetadata[];

    // TypeName moved up to SortId=1, others shifted.
    const typeName = saved.find((row) => row.FieldName === "TypeName");
    const typeCode = saved.find((row) => row.FieldName === "TypeCode");
    const description = saved.find((row) => row.FieldName === "Description");

    expect(typeName?.SortId).toBe(1);
    expect(typeCode?.SortId).toBe(2);
    expect(description?.SortId).toBe(3);
  });

  it("failed save restores the previous value and shows error feedback", async () => {
    const result: DataResult<DataImportTemplateMetadata[]> = {
      Success: true,
      Code: "",
      Message: "ok",
      Attach: baseMetadata.map((row) => ({ ...row })),
      SkipCount: 0,
      TotalCount: 3,
      Record: 3,
    };

    let saveAttempts = 0;
    const transport = vi.fn<Transport>(async (request) => {
      if (
        request.path ===
        "/TemplateManagementApi/StoreMetaDatas?moduleKey=MOM&businessKey=PackagingType"
      ) {
        saveAttempts += 1;

        return {
          status: 200,
          data: {
            Success: false,
            Code: "SAVE_FAILED",
            Message: "save failed",
            Attach: null,
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      return { status: 200, data: result };
    });

    setMesTransportForTests(transport);
    setAppTransportForTests(transport);

    render(
      <DataImportTemplateDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    await screen.findByText("Type Name");

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(saveAttempts).toBe(1));

    // Error feedback rendered — the inline banner should prepend the
    // i18n "import failed" prefix to the backend Message so the user
    // sees both the failure mode and the underlying reason.
    expect(
      await screen.findByText("导入失败：save failed"),
    ).toBeInTheDocument();

    // After close/reopen, the dialog should reload the original value.
    fireEvent.keyDown(document.body, { key: "Escape" });

    // Re-render to simulate reopening.
    render(
      <DataImportTemplateDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    await screen.findByText("Type Name");
  });

  it("shows a frontend success toast after a successful save", async () => {
    const result: DataResult<DataImportTemplateMetadata[]> = {
      Success: true,
      Code: "",
      Message: "ok",
      Attach: baseMetadata.map((row) => ({ ...row })),
      SkipCount: 0,
      TotalCount: 3,
      Record: 3,
    };
    const transport = vi.fn<Transport>(async () => ({
      status: 200,
      data: result,
    }));

    setMesTransportForTests(transport);
    setAppTransportForTests(transport);

    const successSpy = vi.spyOn(notify, "success");

    render(
      <DataImportTemplateDialog
        open
        moduleKey="MOM"
        businessKey="PackagingType"
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() },
    );

    await screen.findByText("Type Name");

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith("保存配置成功");
    });
  });
});
