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
  activePathnames?: readonly string[];
  pathname: string;
  definitions: readonly RouteActivityDefinition[];
  fallback: ReactNode;
};

export function RouteActivityCache({
  activePathnames,
  pathname,
  definitions,
  fallback,
}: RouteActivityCacheProps) {
  const activePathnameSet = activePathnames ? new Set(activePathnames) : null;
  const activeCacheKeys = activePathnameSet
    ? new Set(
        definitions
          .filter((definition) => activePathnameSet.has(definition.pathname))
          .map((definition) => definition.cacheKey),
      )
    : null;
  const currentDefinition = definitions.find(
    (definition) =>
      definition.pathname === pathname &&
      (activePathnameSet === null || activePathnameSet.has(definition.pathname)),
  );
  const [visitedKeys, setVisitedKeys] = useState<string[]>(() =>
    currentDefinition ? [currentDefinition.cacheKey] : [],
  );
  const retainedVisitedKeys = activeCacheKeys
    ? visitedKeys.filter((key) => activeCacheKeys.has(key))
    : visitedKeys;
  const hasPrunedVisitedKeys = retainedVisitedKeys.length !== visitedKeys.length;
  const hasVisitedCurrent =
    currentDefinition !== undefined &&
    retainedVisitedKeys.includes(currentDefinition.cacheKey);
  const renderedKeys =
    currentDefinition && !hasVisitedCurrent
      ? [...retainedVisitedKeys, currentDefinition.cacheKey]
      : retainedVisitedKeys;

  if (hasPrunedVisitedKeys || (currentDefinition && !hasVisitedCurrent)) {
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
