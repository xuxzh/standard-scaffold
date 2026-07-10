import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n/config";
import { setNavigatorLanguage } from "@/test/setup";
import { App } from "@/root-app";

describe("EmbedLayout", () => {
  beforeEach(async () => {
    localStorage.clear();
    // 跳过嵌入握手,让 embed 路由在单测环境下直接挂载。
    localStorage.setItem("embedSkipAuth", "true");
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders the viewport-constrained shell and lets the data table scroll internally", async () => {
    const { container } = render(
      <App initialEntries={["/embed/packaging/packaging-type"]} />,
    );

    // 等 page 真正挂上。
    await screen.findByTestId("packaging-type-filter-form");

    const shell = screen.getByTestId("embed-shell");
    expect(shell).toHaveClass(
      "flex",
      "h-svh",
      "min-h-0",
      "flex-col",
      "overflow-hidden",
    );

    const innerContainer = shell.querySelector("div");
    expect(innerContainer).toHaveClass(
      "flex",
      "min-h-0",
      "min-w-0",
      "flex-1",
      "flex-col",
      "gap-4",
      "overflow-hidden",
      "p-4",
    );

    const pageSection = container.querySelector("section");
    expect(pageSection).toHaveClass("min-h-0", "flex-1", "overflow-hidden");

    const scrollArea = container.querySelector(
      '[data-slot="data-table-scroll-area"]',
    );
    expect(scrollArea).toHaveClass("min-h-0", "overflow-auto");
    expect(scrollArea?.parentElement).toHaveClass("flex-1");
  });

  it("does not render admin chrome on embed routes", () => {
    render(<App initialEntries={["/embed/packaging/packaging-type"]} />);

    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
    expect(screen.queryByTestId("app-version-badge")).not.toBeInTheDocument();
  });
});
