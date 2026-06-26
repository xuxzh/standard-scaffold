import {
  useCallback,
  useState,
  type ReactNode,
} from "react";
import {
  RouteActivityFixedPortalContext,
  RouteActivityPortalContext,
} from "@/components/routing/route-activity-portal-context";

export function RouteActivityPortalScope({
  children,
}: {
  children: ReactNode;
}) {
  // `container` is the `display: contents` wrapper that hosts the page's
  // own popovers/tooltips/selects. It must remain `display: contents` so
  // it does not break the route's flex layout.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // `fixedContainer` is a sibling of the `display: contents` wrapper, but
  // it is a real DOM element (zero-sized, pointer-events: none) so that
  // Dialog / AlertDialog overlays can use it as their portal target. The
  // real box is required because `display: contents` ancestors break
  // `position: fixed` children inside wujie's degrade iframe (the
  // overlay would land at (0, 0) and its buttons would stop receiving
  // click events).
  const [fixedContainer, setFixedContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const captureContainer = useCallback((node: HTMLDivElement | null) => {
    console.log("container ref callback", { nodeExists: !!node });
    if (node) {
      setContainer(node);
    }
  }, []);
  const captureFixedContainer = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        setFixedContainer(node);
      }
    },
    [],
  );

  return (
    <>
      <div
        className="contents"
        data-slot="route-activity-portal-host"
        ref={captureContainer}
      >
        <RouteActivityPortalContext.Provider value={container}>
          {container ? children : null}
        </RouteActivityPortalContext.Provider>
      </div>
      <div
        aria-hidden="true"
        data-slot="route-activity-fixed-portal-host"
        ref={captureFixedContainer}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        }}
      >
        <RouteActivityFixedPortalContext.Provider value={fixedContainer} />
      </div>
    </>
  );
}
