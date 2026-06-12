import { Activity } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFormSessionInitializer } from "@/hooks/use-form-session-initializer";

type ProbeProps = {
  initialize: () => void;
  open: boolean;
  sessionKey: string;
};

function Probe({ initialize, open, sessionKey }: ProbeProps) {
  useFormSessionInitializer({
    initialize,
    open,
    sessionKey,
  });

  return null;
}

describe("useFormSessionInitializer", () => {
  it("initializes a form when a session is opened", () => {
    const initialize = vi.fn();

    render(
      <Probe initialize={initialize} open sessionKey="create" />,
    );

    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("does not initialize the same open session when Activity restores its effects", () => {
    const initialize = vi.fn();
    const { rerender } = render(
      <Activity mode="visible">
        <Probe initialize={initialize} open sessionKey="create" />
      </Activity>,
    );

    rerender(
      <Activity mode="hidden">
        <Probe initialize={initialize} open sessionKey="create" />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <Probe initialize={initialize} open sessionKey="create" />
      </Activity>,
    );

    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("initializes again after the form is closed and reopened", () => {
    const initialize = vi.fn();
    const { rerender } = render(
      <Probe initialize={initialize} open sessionKey="create" />,
    );

    rerender(
      <Probe initialize={initialize} open={false} sessionKey="create" />,
    );
    rerender(
      <Probe initialize={initialize} open sessionKey="create" />,
    );

    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it("initializes a new session when the edited record changes", () => {
    const initialize = vi.fn();
    const { rerender } = render(
      <Probe initialize={initialize} open sessionKey="edit:1" />,
    );

    rerender(
      <Probe initialize={initialize} open sessionKey="edit:2" />,
    );

    expect(initialize).toHaveBeenCalledTimes(2);
  });
});
