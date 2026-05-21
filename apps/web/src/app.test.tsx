import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "@/root-app";

describe("App routing", () => {
  it("renders admin navigation for embedded routes", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Toggle Sidebar" }).length).toBeGreaterThan(0);
  });

  it("renders standalone routes without admin navigation", async () => {
    render(<App initialEntries={["/examples/standalone"]} />);

    expect(
      await screen.findByRole("heading", { name: "Standalone Example" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("switches theme from the app header menu", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    fireEvent.pointerDown(await screen.findByRole("button", { name: "主题切换" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "深色" }));

    expect(localStorage.getItem("app-theme-mode")).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
