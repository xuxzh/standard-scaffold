import {
  Activity,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { RouteActivityPortalScope } from "@/components/routing/route-activity-portal";

export type RouteActivityDefinition = {
  cacheKey: string;
  pathname: string;
  component: ComponentType;
};

type RouteActivityCacheProps = {
  pathname: string;
  definitions: readonly RouteActivityDefinition[];
  fallback: ReactNode;
};

export function RouteActivityCache({
  pathname,
  definitions,
  fallback,
}: RouteActivityCacheProps) {
  const currentDefinition = definitions.find(
    (definition) => definition.pathname === pathname,
  );
  const [visitedKeys, setVisitedKeys] = useState<string[]>(() =>
    currentDefinition ? [currentDefinition.cacheKey] : [],
  );
  const hasVisitedCurrent =
    currentDefinition !== undefined &&
    visitedKeys.includes(currentDefinition.cacheKey);
  const renderedKeys =
    currentDefinition && !hasVisitedCurrent
      ? [...visitedKeys, currentDefinition.cacheKey]
      : visitedKeys;

  if (currentDefinition && !hasVisitedCurrent) {
    setVisitedKeys(renderedKeys);
  }

  return (
    <>
      {definitions.map((definition) => {
        if (!renderedKeys.includes(definition.cacheKey)) {
          return null;
        }

        const Page = definition.component;

        return (
          <Activity
            key={definition.cacheKey}
            mode={
              definition.cacheKey === currentDefinition?.cacheKey
                ? "visible"
                : "hidden"
            }
          >
            <RouteActivityPortalScope>
              <Page />
            </RouteActivityPortalScope>
          </Activity>
        );
      })}
      {currentDefinition ? null : fallback}
    </>
  );
}
