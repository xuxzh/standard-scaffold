/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { i18n } from "@/i18n/config";

describe("DataTablePagination", () => {
  const baseProps = {
    pageIndex: 3,
    pageSize: 20,
    totalCount: 156,
    onPageIndexChange: vi.fn(),
  };

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("zh-CN");
    });
  });

  it("renders page size selector with default options", () => {
    render(<DataTablePagination {...baseProps} />);

    // Page size selector shows current value
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("20 条/页")).toBeInTheDocument();
  });

  it("renders total and selected counts with a zero default", () => {
    const { rerender } = render(<DataTablePagination {...baseProps} />);

    const summary = screen.getByLabelText("共计 156 条数据，选中 0 条数据。");
    expect(summary).toHaveTextContent("共计 156 条数据，选中 0 条数据。");
    expect(summary).toHaveClass("font-semibold", "text-foreground");
    expect(Array.from(summary.querySelectorAll("strong"))).toHaveLength(2);
    for (const count of summary.querySelectorAll("strong")) {
      expect(count).toHaveClass(
        "rounded-sm",
        "bg-primary",
        "px-1",
        "text-primary-foreground",
      );
    }

    rerender(
      <DataTablePagination
        {...baseProps}
        selectedCount={2}
      />
    );
    expect(
      screen.getByLabelText("共计 156 条数据，选中 2 条数据。")
    ).toHaveTextContent("共计 156 条数据，选中 2 条数据。");
  });

  it("renders all navigation buttons", () => {
    render(<DataTablePagination {...baseProps} />);

    expect(
      screen.getByRole("button", { name: "首页" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "上一页" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "下一页" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "末页" }),
    ).toBeInTheDocument();
  });

  it("does not render the current and total page indicator", () => {
    render(<DataTablePagination {...baseProps} />);

    expect(screen.queryByText(/第.*3.*\/.*8.*页/)).not.toBeInTheDocument();
  });

  it("renders all numeric pages when total pages do not exceed five", () => {
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={2}
        pageSize={20}
        totalCount={100}
      />
    );

    expect(
      screen.getAllByRole("button", { name: /前往第 \d+ 页/ }).map((button) =>
        button.textContent
      )
    ).toEqual(["1", "2", "3", "4", "5"]);
    expect(screen.getByRole("button", { name: "前往第 2 页" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders a leading page window with a trailing ellipsis", () => {
    render(<DataTablePagination {...baseProps} pageIndex={2} totalCount={200} />);

    expect(
      screen.getAllByRole("button", { name: /前往第 \d+ 页/ }).map((button) =>
        button.textContent
      )
    ).toEqual(["1", "2", "3", "4", "5", "10"]);
    expect(screen.getAllByText("…")).toHaveLength(1);
  });

  it("renders five consecutive pages and ellipses around a middle window", () => {
    render(<DataTablePagination {...baseProps} pageIndex={5} totalCount={200} />);

    expect(
      screen.getAllByRole("button", { name: /前往第 \d+ 页/ }).map((button) =>
        button.textContent
      )
    ).toEqual(["3", "4", "5", "6", "7", "10"]);
    expect(screen.getAllByText("…")).toHaveLength(2);
  });

  it("renders a trailing page window with a leading ellipsis", () => {
    render(<DataTablePagination {...baseProps} pageIndex={10} totalCount={200} />);

    expect(
      screen.getAllByRole("button", { name: /前往第 \d+ 页/ }).map((button) =>
        button.textContent
      )
    ).toEqual(["5", "6", "7", "8", "9", "10"]);
    expect(screen.getAllByText("…")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "前往第 10 页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders all pages without an ellipsis when only five pages precede the last page", () => {
    render(<DataTablePagination {...baseProps} pageIndex={4} totalCount={120} />);

    expect(
      screen.getAllByRole("button", { name: /前往第 \d+ 页/ }).map((button) =>
        button.textContent
      )
    ).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("changes to a numeric page when its button is clicked", () => {
    const onPageIndexChange = vi.fn();
    render(
      <DataTablePagination
        {...baseProps}
        onPageIndexChange={onPageIndexChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "前往第 4 页" }));
    expect(onPageIndexChange).toHaveBeenCalledWith(4);
  });

  it("shows only page 1 when totalCount is 0", () => {
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={1}
        totalCount={0}
      />,
    );

    expect(screen.getByRole("button", { name: "前往第 1 页" })).toHaveTextContent(
      "1",
    );
    expect(screen.queryByText(/第.*1.*\/.*1.*页/)).not.toBeInTheDocument();
  });

  it("disables first and previous buttons on first page", () => {
    render(
      <DataTablePagination {...baseProps} pageIndex={1} />,
    );

    expect(
      screen.getByRole("button", { name: "首页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "上一页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "下一页" }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "末页" }),
    ).not.toBeDisabled();
  });

  it("disables next and last buttons on last page", () => {
    // pageSize=20, totalCount=156 → 8 pages
    render(
      <DataTablePagination {...baseProps} pageIndex={8} />,
    );

    expect(
      screen.getByRole("button", { name: "首页" }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "上一页" }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "下一页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "末页" }),
    ).toBeDisabled();
  });

  it("disables all navigation buttons when loading", () => {
    render(<DataTablePagination {...baseProps} loading />);

    expect(
      screen.getByRole("button", { name: "首页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "上一页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "下一页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "末页" }),
    ).toBeDisabled();
  });

  it("disables all navigation buttons when totalCount is 0", () => {
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={1}
        totalCount={0}
      />,
    );

    expect(
      screen.getByRole("button", { name: "首页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "上一页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "下一页" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "末页" }),
    ).toBeDisabled();
  });

  it("calls onPageIndexChange with 1 when first page button is clicked", () => {
    const onPageIndexChange = vi.fn();
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={3}
        onPageIndexChange={onPageIndexChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "首页" }));
    expect(onPageIndexChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageIndexChange with pageIndex - 1 when previous button is clicked", () => {
    const onPageIndexChange = vi.fn();
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={3}
        onPageIndexChange={onPageIndexChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "上一页" }));
    expect(onPageIndexChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageIndexChange with pageIndex + 1 when next button is clicked", () => {
    const onPageIndexChange = vi.fn();
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={3}
        onPageIndexChange={onPageIndexChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageIndexChange).toHaveBeenCalledWith(4);
  });

  it("calls onPageIndexChange with totalPages when last button is clicked", () => {
    const onPageIndexChange = vi.fn();
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={3}
        onPageIndexChange={onPageIndexChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "末页" }));
    // totalPages = ceil(156 / 20) = 8
    expect(onPageIndexChange).toHaveBeenCalledWith(8);
  });

  it("calls onPageSizeChange when page size is changed", () => {
    const onPageSizeChange = vi.fn();
    render(
      <DataTablePagination
        {...baseProps}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    // Open the select dropdown
    fireEvent.click(screen.getByRole("combobox"));
    // Select "50" from the dropdown
    fireEvent.click(screen.getByRole("option", { name: "50 条/页" }));

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("hides page size selector when showPageSizeSelector is false", () => {
    render(
      <DataTablePagination
        {...baseProps}
        showPageSizeSelector={false}
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("uses custom page size options when provided", () => {
    render(
      <DataTablePagination
        {...baseProps}
        pageSizeOptions={[5, 15, 30]}
        pageSize={15}
      />,
    );

    // Current value is shown
    expect(screen.getByText("15 条/页")).toBeInTheDocument();
  });

  it("renders English count, page, and page-size labels", async () => {
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });

    render(<DataTablePagination {...baseProps} selectedCount={2} />);

    expect(screen.getByLabelText("156 total, 2 selected.")).toHaveTextContent(
      "156 total, 2 selected."
    );
    expect(screen.getByRole("button", { name: "Go to page 3" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByText("20 / page")).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    const { container } = render(
      <DataTablePagination {...baseProps} className="my-custom-class" />,
    );

    // The root div should have the custom class
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});
