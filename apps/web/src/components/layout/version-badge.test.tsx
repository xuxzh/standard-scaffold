import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VersionBadge } from "@/components/layout/version-badge";

vi.mock("@/generated/version", () => ({
  APP_VERSION: "26.06.09.0947",
}));

describe("VersionBadge", () => {
  it("renders the literal 'Ver' label and the imported APP_VERSION", () => {
    render(<VersionBadge />);

    const badge = screen.getByTestId("app-version-badge");
    expect(badge).toHaveTextContent("Ver 26.06.09.0947");
  });

  it("uses fixed positioning in the bottom-left", () => {
    render(<VersionBadge />);

    const badge = screen.getByTestId("app-version-badge");
    expect(badge.className).toMatch(/fixed/);
    expect(badge.className).toMatch(/bottom-2/);
    expect(badge.className).toMatch(/left-2/);
  });

  it("does not block pointer events on underlying UI", () => {
    render(<VersionBadge />);

    const badge = screen.getByTestId("app-version-badge");
    expect(badge.className).toMatch(/pointer-events-none/);
  });
});
