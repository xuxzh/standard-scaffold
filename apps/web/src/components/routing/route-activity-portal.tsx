import {
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { RouteActivityPortalContext } from "@/components/routing/route-activity-portal-context";

export function RouteActivityPortalScope({
  children,
}: {
  children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const captureContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setContainer(node);
    }
  }, []);

  return (
    <div
      className="contents"
      data-slot="route-activity-portal-host"
      ref={captureContainer}
    >
      <RouteActivityPortalContext.Provider value={container}>
        {container ? children : null}
      </RouteActivityPortalContext.Provider>
    </div>
  );
}
