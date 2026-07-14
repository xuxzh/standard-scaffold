import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "@/components/ui/switch";

function ControlledSwitch() {
  const [checked, setChecked] = useState(false);

  return (
    <Switch
      checked={checked}
      onCheckedChange={setChecked}
      aria-label="Enable notifications"
    />
  );
}

describe("Switch", () => {
  it("exposes switch semantics and updates a controlled value", () => {
    render(<ControlledSwitch />);

    const control = screen.getByRole("switch", {
      name: "Enable notifications",
    });

    expect(control).toHaveAttribute("aria-checked", "false");

    fireEvent.click(control);

    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("does not request a value change while disabled", () => {
    const onCheckedChange = vi.fn();

    render(
      <Switch
        disabled
        checked={false}
        onCheckedChange={onCheckedChange}
        aria-label="Enable notifications"
      />,
    );

    fireEvent.click(
      screen.getByRole("switch", { name: "Enable notifications" }),
    );

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
