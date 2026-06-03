import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/root-app";
import { i18n } from "@/i18n/config";
import type { Transport } from "@/lib/api/http-client";
import {
  resetMesTransportForTests,
  setMesTransportForTests,
} from "@/lib/api/mes-client";
import { setNavigatorLanguage } from "@/test/setup";

const listRows = [
  {
    Id: 1,
    LevelCode: "LV001",
    LevelSequence: 1,
    LevelName: "UNIT",
    ParentLevelCode: null,
    ParentLevelName: null,
    Description: "Smallest packaging unit",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-25T10:00:00",
    LastModificationTime: null,
  },
  {
    Id: 2,
    LevelCode: "LV002",
    LevelSequence: 2,
    LevelName: "BOX",
    ParentLevelCode: "LV001",
    ParentLevelName: "UNIT",
    Description: "Six units per box",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-25T10:00:00",
    LastModificationTime: null,
  },
  {
    Id: 3,
    LevelCode: "LV003",
    LevelSequence: 3,
    LevelName: "CARTON",
    ParentLevelCode: "LV002",
    ParentLevelName: "BOX",
    Description: "Four boxes per carton",
    Remark: "",
    CompanyCode: "RUIHUI",
    FactoryCode: "DEFAULT",
    CreationTime: "2026-05-25T10:00:00",
    LastModificationTime: null,
  },
];

function createListResult(rows = listRows) {
  return {
    Success: true,
    Code: "",
    Message: "[MES] Query success",
    Attach: rows,
    SkipCount: 0,
    TotalCount: rows.length,
    Record: rows.length,
  };
}

function createTreeResult() {
  return {
    Success: true,
    Code: "",
    Message: "[MES] Query success",
    Attach: [
      {
        Id: 1,
        LevelCode: "LV001",
        LevelSequence: 1,
        LevelName: "UNIT",
        ParentLevelCode: null,
        ParentLevelName: null,
        Description: "Smallest packaging unit",
        Children: [
          {
            Id: 2,
            LevelCode: "LV002",
            LevelSequence: 2,
            LevelName: "BOX",
            ParentLevelCode: "LV001",
            ParentLevelName: "UNIT",
            Description: "Six units per box",
            Children: [],
          },
        ],
      },
    ],
    SkipCount: 0,
    TotalCount: 1,
    Record: 1,
  };
}

async function selectRadixOption(trigger: HTMLElement, optionName: string) {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

describe("PackagingLevelPage", () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("accessToken", "access-1");
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
    resetMesTransportForTests();
    resetMesTransportForTests();
    vi.restoreAllMocks();
  });

  it("shows a loading state while the packaging level request is pending", async () => {
    let resolveRequest!: (value: Awaited<ReturnType<Transport>>) => void;

    const transport: Transport = ({ path }) => {
      if (
        path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas" &&
        typeof resolveRequest === "function"
      ) {
        return Promise.resolve({
          status: 200,
          data: createListResult(),
        });
      }

      if (path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas") {
        return new Promise((resolve) => {
          resolveRequest = resolve;
        });
      }

      return Promise.resolve({
        status: 200,
        data: createListResult(),
      });
    };

    setMesTransportForTests(transport);
    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-level"]} />);

    expect(
      await screen.findByText("正在加载包装层级数据。"),
    ).toBeInTheDocument();

    resolveRequest({
      status: 200,
      data: createListResult(),
    });

    expect(
      await screen.findByTestId("packaging-level-edit-LV001"),
    ).toBeInTheDocument();
  });

  it("shows empty and error states for packaging level list", async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({
        status: 200,
        data: createListResult([]),
      })
      .mockResolvedValueOnce({
        status: 503,
        data: {
          message: "Packaging level service unavailable",
        },
      });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-level"]} />);

    expect(await screen.findByText("暂无包装层级数据")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "刷新" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "重试" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("暂无包装层级数据")).toBeInTheDocument();
  });

  it("renders packaging level list and submits filters", async () => {
    const transport = vi.fn<Transport>(async ({ path, body }) => {
      if (path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas") {
        return {
          status: 200,
          data:
            (body as { LevelCode?: string }).LevelCode === "LV002"
              ? createListResult([listRows[1]])
              : createListResult(),
        };
      }

      return {
        status: 200,
        data: createTreeResult(),
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-level"]} />);

    expect(
      await screen.findByRole("button", { name: "新增层级" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "查看关系图" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查询" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置" })).toBeInTheDocument();
    expect(
      await screen.findByTestId("packaging-level-edit-LV003"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "层级序号" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Six units per box")).toBeInTheDocument();
    expect(screen.getAllByText("层级编码").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("层级编码"), {
      target: { value: "LV002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByText("Six units per box")).toBeInTheDocument();

    const listRequests = transport.mock.calls
      .map(([request]) => request)
      .filter(
        (request) =>
          request.path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
      );

    expect(listRequests.at(-1)?.body).toMatchObject({
      IsPaged: true,
      PageIndex: 1,
      PageSize: 20,
      LevelCode: "LV002",
    });
  });

  it("keeps packaging level overflow inside the table body scroll area", async () => {
    const transport = vi.fn<Transport>(async ({ path }) => ({
      status: 200,
      data:
        path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas"
          ? createListResult()
          : createTreeResult(),
    }));

    setMesTransportForTests(transport);

    const { container } = render(
      <App initialEntries={["/packaging/packaging-level"]} />,
    );

    await screen.findByTestId("packaging-level-edit-LV001");

    expect(screen.getByTestId("admin-shell")).toHaveClass(
      "min-h-0",
      "overflow-hidden",
    );
    expect(container.querySelector("section")).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-hidden",
    );
    expect(
      container.querySelector('[data-slot="data-table-scroll-area"]'),
    ).toHaveClass("min-h-0", "overflow-auto");
    expect(
      container.querySelector('[data-slot="data-table-scroll-area"]')
        ?.parentElement,
    ).toHaveClass("flex-1");
  });

  it("creates and edits a packaging level without editing level sequence", async () => {
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(),
        };
      }

      if (path === "/PackagingLevelApi/StorePackagingLevelData") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Save success",
            Attach: listRows[0],
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      if (path === "/PackagingLevelApi/UpdatePackagingLevelData") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Update success",
            Attach: null,
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      return {
        status: 200,
        data: createTreeResult(),
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-level"]} />);

    await screen.findByTestId("packaging-level-edit-LV001");

    fireEvent.click(screen.getByRole("button", { name: "新增层级" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.queryByTestId("packaging-level-form-level-sequence"),
    ).not.toBeInTheDocument();

    const parentSelect = screen.getByTestId(
      "packaging-level-form-parent-level-code",
    );

    expect(parentSelect).not.toBeDisabled();
    fireEvent.click(parentSelect);
    expect(
      await screen.findByRole("option", { name: "LV001" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "LV002" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "LV003" })).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("packaging-level-form-level-code"), {
      target: { value: "LV010" },
    });
    fireEvent.change(screen.getByTestId("packaging-level-form-level-name"), {
      target: { value: "PALLET" },
    });
    await selectRadixOption(parentSelect, "LV002");
    expect(screen.getByDisplayValue("BOX")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("packaging-level-form-description"), {
      target: { value: "Pallet layer" },
    });
    fireEvent.click(screen.getByTestId("packaging-level-form-submit"));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/PackagingLevelApi/StorePackagingLevelData",
          body: expect.objectContaining({
            LevelCode: "LV010",
            ParentLevelCode: "LV002",
            ParentLevelName: "BOX",
          }),
        }),
      );
    });
    const createRequest = transport.mock.calls
      .map(([request]) => request)
      .find(
        (request) => request.path === "/PackagingLevelApi/StorePackagingLevelData",
      );
    expect(createRequest?.body).not.toHaveProperty("LevelSequence");

    fireEvent.click(screen.getByTestId("packaging-level-edit-LV002"));

    expect(await screen.findByDisplayValue("LV002")).toBeDisabled();
    expect(
      screen.queryByTestId("packaging-level-form-level-sequence"),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId("packaging-level-form-level-name"), {
      target: { value: "UPDATED BOX" },
    });
    fireEvent.click(screen.getByTestId("packaging-level-form-submit"));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/PackagingLevelApi/UpdatePackagingLevelData",
          body: expect.objectContaining({
            NeedUpdateFields: expect.objectContaining({
              Id: 2,
              LevelName: "UPDATED BOX",
            }),
          }),
        }),
      );
    });
    const updateRequest = transport.mock.calls
      .map(([request]) => request)
      .find(
        (request) => request.path === "/PackagingLevelApi/UpdatePackagingLevelData",
      );
    expect(updateRequest?.body).toMatchObject({
      NeedUpdateFields: expect.not.objectContaining({
        LevelSequence: expect.anything(),
      }),
    });
  });

  it("deletes packaging levels and renders tree dialog states", async () => {

    let treeCalls = 0;
    const transport = vi.fn<Transport>(async ({ path }) => {
      if (path === "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas") {
        return {
          status: 200,
          data: createListResult(),
        };
      }

      if (path === "/PackagingLevelApi/RemovePackagingLevelData") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Delete success",
            Attach: null,
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      if (path === "/PackagingLevelApi/RemoveBatchPackagingLevelDatas") {
        return {
          status: 200,
          data: {
            Success: true,
            Code: "",
            Message: "[MES] Delete success",
            Attach: null,
            SkipCount: 0,
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      treeCalls += 1;

      if (treeCalls === 1) {
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                status: 200,
                data: createTreeResult(),
              }),
            20,
          ),
        );
      }

      if (treeCalls === 2) {
        return {
          status: 200,
          data: {
            ...createTreeResult(),
            Attach: [],
            TotalCount: 0,
            Record: 0,
          },
        };
      }

      if (treeCalls === 3) {
        return {
          status: 503,
          data: {
            message: "Tree unavailable",
          },
        };
      }

      return {
        status: 200,
        data: createTreeResult(),
      };
    });

    setMesTransportForTests(transport);

    render(<App initialEntries={["/packaging/packaging-level"]} />);

    await screen.findByTestId("packaging-level-edit-LV001");

    fireEvent.click(screen.getByTestId("packaging-level-delete-LV003"));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/PackagingLevelApi/RemovePackagingLevelData",
        }),
      );
    });

    fireEvent.click(screen.getByTestId("packaging-level-select-LV001"));
    fireEvent.click(screen.getByTestId("packaging-level-select-LV002"));
    fireEvent.click(screen.getByRole("button", { name: "批量删除" }));
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/PackagingLevelApi/RemoveBatchPackagingLevelDatas",
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "查看关系图" }));
    expect(
      await screen.findByText("正在加载包装层级关系图。"),
    ).toBeInTheDocument();
    expect(await screen.findByText("UNIT (LV001)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "查看关系图" }));
    expect(await screen.findByText("暂无包装层级关系")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "查看关系图" }));
    expect(
      await screen.findByText("暂时无法加载包装层级关系图"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByText("UNIT (LV001)")).toBeInTheDocument();
  });
});
