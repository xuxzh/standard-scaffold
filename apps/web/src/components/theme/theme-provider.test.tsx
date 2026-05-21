import { act, render, screen } from "@testing-library/react";
import { setMatchMediaMatches } from "@/test/setup";
import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";

function ThemeProbe() {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <div>
      <span data-testid="theme-mode">{themeMode}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button type="button" onClick={() => setThemeMode("dark")}>
        set dark
      </button>
      <button type="button" onClick={() => setThemeMode("system")}>
        set system
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    setMatchMediaMatches(false);
  });

  it("reads stored theme mode and resolves dark mode", () => {
    localStorage.setItem("app-theme-mode", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("falls back to system when storage value is invalid", () => {
    localStorage.setItem("app-theme-mode", "broken");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
  });

  it("writes the next theme mode and updates root classes", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      screen.getByRole("button", { name: "set dark" }).click();
    });

    expect(localStorage.getItem("app-theme-mode")).toBe("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("updates resolved theme when the system theme changes", () => {
    localStorage.setItem("app-theme-mode", "system");
    setMatchMediaMatches(false);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");

    act(() => {
      setMatchMediaMatches(true);
    });

    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
