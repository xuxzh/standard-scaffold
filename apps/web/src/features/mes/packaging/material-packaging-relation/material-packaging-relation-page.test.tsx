import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setNavigatorLanguage } from "@/test/setup";

const { listQueryState, toastError } = vi.hoisted(() => ({
  listQueryState: {
    data: Object.freeze({ items: [] as never[], totalCount: 0 }),
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
const emptyListData = Object.freeze({ items: [] as never[], totalCount: 0 });
const emptyOptionsData = Object.freeze({
  data: Object.freeze({ items: [] as never[], totalCount: 0 }),
  isLoading: false,
  isError: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
});

const stableMutation = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
};

vi.mock(
  "@/features/mes/packaging/material-packaging-relation/material-packaging-relation-queries",
  () => ({
    useMaterialPackagingRelationListQuery: () => listQueryState,
    useMaterialOptionsQuery: () => emptyOptionsData,
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
});
