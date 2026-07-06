import * as React from "react";

import { isRunningInWujie } from "@/lib/host-context/host-context-source";

/**
 * Skill: `rh-wujie-dialog-select-compat`.
 *
 * Inside a wujie degrade iframe, the layered dismiss handler that Radix
 * stacks on top of `Dialog` / `AlertDialog` / `Sheet` can briefly stamp
 * `pointer-events: none` onto either `document.body` or the dialog content
 * node itself when a nested floating UI (Select / Popover / DropdownMenu)
 * opens or closes. The CSS layer in `styles.css` is the primary fallback,
 * but it only patches the dialog content. These hooks patch the live DOM
 * directly so the lock never sticks even when the inline style wins the
 * cascade fight against the CSS rule.
 *
 * Both hooks are no-ops outside a wujie iframe — calling them from a
 * component that may render in either mode is safe.
 */

/**
 * Watch `document.body`'s inline `pointer-events` style and remove the
 * `none` value whenever Radix re-applies it under wujie. Without this the
 * entire shadow subtree (because wujie proxies `body` through the shadow
 * host) becomes non-interactive while a dialog is open.
 */
export function useWujieBodyPointerEventsFix(): void {
  React.useEffect(() => {
    if (!isRunningInWujie()) {
      return;
    }
    const body = document.body;
    if (!body) {
      return;
    }
    const restore = () => {
      if (body.style.pointerEvents === "none") {
        body.style.removeProperty("pointer-events");
      }
    };
    const observer = new MutationObserver(restore);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    restore();
    return () => observer.disconnect();
  }, []);
}

/**
 * Watch the mounted dialog content node's inline `pointer-events` style and
 * restore `auto` whenever Radix re-applies `none`. Pass the same ref that
 * `DialogContent` / `AlertDialogContent` / `SheetContent` forwards to its
 * Radix primitive so the observer only watches the live node.
 */
export function useWujieContentPointerEventsFix(
  contentRef: React.RefObject<HTMLElement | null>,
): void {
  React.useEffect(() => {
    if (!isRunningInWujie()) {
      return;
    }
    const node = contentRef.current;
    if (!node) {
      return;
    }
    const restore = () => {
      if (node.style.pointerEvents === "none") {
        node.style.setProperty("pointer-events", "auto");
      }
    };
    const observer = new MutationObserver(restore);
    observer.observe(node, { attributes: true, attributeFilter: ["style"] });
    restore();
    return () => observer.disconnect();
  }, [contentRef]);
}