/**
 * @vitest-environment jsdom
 */
import "@/i18n/config";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

describe("DataTablePagination", () => {
  const baseProps = {
    pageIndex: 3,
    pageSize: 20,
    totalCount: 156,
    onPageIndexChange: vi.fn(),
  };

  it("renders page size selector with default options", () => {
    render(<DataTablePagination {...baseProps} />);

    // Page size selector shows current value
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("renders showing text with correct range", () => {
    render(<DataTablePagination {...baseProps} />);

    // pageIndex=3, pageSize=20 → from=41, to=60, total=156
    expect(
      screen.getByText(/41.*60.*156/),
    ).toBeInTheDocument();
  });

  it("renders showing text for empty data", () => {
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={1}
        totalCount={0}
      />,
    );

    // from=0, to=0, total=0
    expect(
      screen.getByText(/0.*0.*0/),
    ).toBeInTheDocument();
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

  it("renders page indicator with current and total pages", () => {
    render(<DataTablePagination {...baseProps} />);

    // pageIndex=3, pageSize=20, totalCount=156 → totalPages=8
    expect(screen.getByText(/第.*3.*\/.*8.*页/)).toBeInTheDocument();
  });

  it("shows page 1 / 1 when totalCount is 0", () => {
    render(
      <DataTablePagination
        {...baseProps}
        pageIndex={1}
        totalCount={0}
      />,
    );

    expect(screen.getByText(/第.*1.*\/.*1.*页/)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("option", { name: "50" }));

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
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    const { container } = render(
      <DataTablePagination {...baseProps} className="my-custom-class" />,
    );

    // The root div should have the custom class
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});
