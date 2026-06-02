import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setNavigatorLanguage } from "@/test/setup";

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
    useMaterialPackagingRelationListQuery: () => ({
      data: emptyListData,
      isLoading: false,
      isError: false,
      isRefetchError: false,
      error: null,
    }),
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
