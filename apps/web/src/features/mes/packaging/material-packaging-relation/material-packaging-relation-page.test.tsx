import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MaterialPackagingRelationRecord } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract";
import { setNavigatorLanguage } from "@/test/setup";

type MaterialPackagingRelationListData = Readonly<{
  items: MaterialPackagingRelationRecord[];
  totalCount: number;
}>;

const { listQueryState, toastError } = vi.hoisted(() => ({
  listQueryState: {
    data: Object.freeze({
      items: [] as MaterialPackagingRelationRecord[],
      totalCount: 0,
    }) as MaterialPackagingRelationListData,
    isLoading: false,
    isError: false,
    isRefetchError: false,
    error: null as Error | null,
  },
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
}));

// Stable mock data to prevent infinite re-renders
const emptyListData = Object.freeze({
  items: [] as MaterialPackagingRelationRecord[],
  totalCount: 0,
}) as MaterialPackagingRelationListData;
const emptyOptionsData = Object.freeze({
  data: Object.freeze({ items: [] as never[], totalCount: 0 }),
  isLoading: false,
  isError: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
});

const selectedMaterialOption = Object.freeze({
  materialCode: "MAT-001",
  materialName: "测试物料",
  unit: "PCS",
  materialTypeName: "成品",
});

const materialOptionsData = {
  data: Object.freeze({
    items: [selectedMaterialOption],
    totalCount: 1,
  }),
  isLoading: false,
  isError: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
};

const stableMutation = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
};

vi.mock(
  "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-queries",
  () => ({
    useMaterialPackagingRelationListQuery: () => listQueryState,
    useMaterialOptionsQuery: (
      _keyword: string,
      _name: string,
      _pageIndex: number,
      source?: string,
    ) => (source === "sidebar" ? materialOptionsData : emptyOptionsData),
    usePackagingRuleOptionsQuery: () => emptyOptionsData,
    useCreateMaterialPackagingRelationMutation: () => stableMutation,
    useUpdateMaterialPackagingRelationMutation: () => stableMutation,
    useDeleteMaterialPackagingRelationMutation: () => stableMutation,
    useBatchDeleteMaterialPackagingRelationsMutation: () => stableMutation,
  }),
);

import { MaterialPackagingRelationPage } from "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-page";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MaterialPackagingRelationPage />
    </QueryClientProvider>,
  );
}

describe("MaterialPackagingRelationPage", () => {
  beforeEach(async () => {
    localStorage.clear();
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
    queryClient.clear();
    listQueryState.data = emptyListData;
    listQueryState.isLoading = false;
    listQueryState.isError = false;
    listQueryState.isRefetchError = false;
    listQueryState.error = null;
    stableMutation.mutateAsync.mockReset();
    stableMutation.mutateAsync.mockResolvedValue(undefined);
    toastError.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state", async () => {
    renderPage();

    expect(
      await screen.findByText("暂无物料包装关系数据"),
    ).toBeInTheDocument();
  });

  it("renders action buttons", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: "新增关系" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "批量删除" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "刷新" }),
    ).toBeInTheDocument();
  });

  it("renders filter form", async () => {
    renderPage();

    expect(
      await screen.findByTestId("material-packaging-relation-filter-form"),
    ).toBeInTheDocument();
  });

  it("renders material sidebar", async () => {
    renderPage();

    expect(
      await screen.findByTestId("material-packaging-relation-sidebar"),
    ).toBeInTheDocument();
  });

  it("keeps large sidebar and table content in internal scroll areas", async () => {
    const { container } = renderPage();

    expect(container.firstChild).toHaveClass("min-h-0", "overflow-hidden");
    expect(
      await screen.findByTestId("material-packaging-relation-sidebar"),
    ).toHaveClass("min-h-0", "overflow-hidden");
    expect(
      container.querySelector('[data-slot="data-table-scroll-area"]'),
    ).toHaveClass("min-h-0", "overflow-auto");
  });

  it("shows list errors with a toast instead of a persistent inline banner", async () => {
    listQueryState.isError = true;
    listQueryState.error = new Error("Request failed");

    renderPage();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("数据加载失败", {
        description: "Request failed",
      });
    });
    expect(screen.queryByText("数据加载失败")).not.toBeInTheDocument();
    expect(screen.queryByText("Request failed")).not.toBeInTheDocument();
  });

  it("opens create form dialog when clicking add button", async () => {
    renderPage();

    const createButton = await screen.findByRole("button", {
      name: "新增关系",
    });
    fireEvent.click(createButton);

    expect(
      await screen.findByTestId("material-packaging-relation-form-dialog"),
    ).toBeInTheDocument();
  });

  it("prefills filters and create dialog from the selected sidebar material", async () => {
    renderPage();

    fireEvent.click(await screen.findByTestId("material-sidebar-item-MAT-001"));

    expect(screen.getByLabelText("物料编码")).toHaveValue("MAT-001");
    expect(screen.getByLabelText("物料名称")).toHaveValue("测试物料");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "新增关系",
      }),
    );

    expect(await screen.findByTestId("mpr-form-material-code")).toHaveValue(
      "MAT-001",
    );
    expect(screen.getByTestId("mpr-form-material-name")).toHaveValue(
      "测试物料",
    );
  });

  it("shows details validation message when submitting without packaging details", async () => {
    renderPage();

    const createButton = await screen.findByRole("button", {
      name: "新增关系",
    });
    fireEvent.click(createButton);

    fireEvent.click(await screen.findByTestId("mpr-form-submit"));

    expect(
      await screen.findByText("至少需要一条包装关系明细"),
    ).toBeInTheDocument();
  });

  it("shows an error toast when deleting a material packaging relation fails", async () => {
    stableMutation.mutateAsync.mockRejectedValueOnce(
      new Error("物料包装关系已被使用，不能删除"),
    );
    listQueryState.data = Object.freeze({
      items: [
        {
          id: 1,
          materialCode: "MAT-001",
          materialName: "测试物料",
          packagingRuleCode: "RULE-001",
          packagingRuleName: "测试规则",
          details: [],
          remark: "",
          rawDto: {
            Id: 1,
            MaterialCode: "MAT-001",
            MaterialName: "测试物料",
            PackagingRuleCode: "RULE-001",
            PackagingRuleName: "测试规则",
            Details: [],
            Remark: "",
          },
        },
      ],
      totalCount: 1,
    });

    renderPage();

    fireEvent.click(
      await screen.findByTestId("material-packaging-relation-delete-1"),
    );
    fireEvent.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "物料包装关系已被使用，不能删除",
      );
    });
  });
});
