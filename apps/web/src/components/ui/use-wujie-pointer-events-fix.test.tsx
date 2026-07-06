import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  useWujieBodyPointerEventsFix,
  useWujieContentPointerEventsFix,
} from "@/components/ui/use-wujie-pointer-events-fix";

type WujieGlobal = { __POWERED_BY_WUJIE__?: boolean };
function wujieWindow(): WujieGlobal {
  return window as unknown as WujieGlobal;
}

/**
 * jsdom delivers MutationObserver callbacks asynchronously (via
 * microtasks), so any synchronous `style.pointerEvents = "none"` write
 * needs a tick to flush before the hook's restore runs. `flushObserver`
 * schedules a `setTimeout` so jsdom drains its microtask queue.
 */
function flushObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function BodyProbe(): null {
  useWujieBodyPointerEventsFix();
  return null;
}

function ContentProbe({ nodeRef }: { nodeRef: { current: HTMLDivElement | null } }): null {
  useWujieContentPointerEventsFix(nodeRef);
  return null;
}

describe("useWujie pointer-events fix", () => {
  let originalFlag: boolean | undefined;

  beforeEach(() => {
    originalFlag = wujieWindow().__POWERED_BY_WUJIE__;
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete wujieWindow().__POWERED_BY_WUJIE__;
    } else {
      wujieWindow().__POWERED_BY_WUJIE__ = originalFlag;
    }
    // Reset any body inline styles that may have leaked across cases.
    document.body.style.removeProperty("pointer-events");
  });

  it("does not touch body pointer-events outside wujie mode", async () => {
    delete wujieWindow().__POWERED_BY_WUJIE__;
    render(<BodyProbe />);

    act(() => {
      document.body.style.setProperty("pointer-events", "none");
    });
    await flushObserver();

    expect(document.body.style.pointerEvents).toBe("none");
  });

  it("strips a `none` stamp from body pointer-events inside wujie mode", async () => {
    wujieWindow().__POWERED_BY_WUJIE__ = true;
    render(<BodyProbe />);

    act(() => {
      document.body.style.setProperty("pointer-events", "none");
    });
    await flushObserver();

    // The MutationObserver attached by the hook observes the body style
    // attribute and removes the inline `none` value as soon as Radix
    // applies it under wujie.
    expect(document.body.style.pointerEvents).not.toBe("none");
  });

  it("does not touch content pointer-events outside wujie mode", async () => {
    delete wujieWindow().__POWERED_BY_WUJIE__;
    const node = document.createElement("div");
    document.body.appendChild(node);

    const ref: React.MutableRefObject<HTMLDivElement | null> = { current: node };
    render(<ContentProbe nodeRef={ref} />);

    act(() => {
      node.style.setProperty("pointer-events", "none");
    });
    await flushObserver();

    expect(node.style.pointerEvents).toBe("none");
    document.body.removeChild(node);
  });

  it("forces content pointer-events back to auto inside wujie mode", async () => {
    wujieWindow().__POWERED_BY_WUJIE__ = true;
    const node = document.createElement("div");
    document.body.appendChild(node);

    const ref: React.MutableRefObject<HTMLDivElement | null> = { current: node };
    render(<ContentProbe nodeRef={ref} />);

    act(() => {
      node.style.setProperty("pointer-events", "none");
    });
    await flushObserver();

    expect(node.style.pointerEvents).toBe("auto");
    document.body.removeChild(node);
  });

  it("disconnects the observer on unmount", async () => {
    wujieWindow().__POWERED_BY_WUJIE__ = true;
    const node = document.createElement("div");
    document.body.appendChild(node);

    const ref: React.MutableRefObject<HTMLDivElement | null> = { current: node };
    const { unmount } = render(<ContentProbe nodeRef={ref} />);
    unmount();

    act(() => {
      node.style.setProperty("pointer-events", "none");
    });
    await flushObserver();

    // Once the observer disconnects, no one is watching the node — the
    // inline `none` value stays put.
    expect(node.style.pointerEvents).toBe("none");
    document.body.removeChild(node);
  });
});