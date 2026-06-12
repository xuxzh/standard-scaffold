import { useEffect, useState, type ComponentType } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  RouteActivityCache,
  type RouteActivityDefinition,
} from "@/components/routing/route-activity-cache";

function createDefinitions(
  first: ComponentType,
  second: ComponentType,
): RouteActivityDefinition[] {
  return [
    {
      cacheKey: "first",
      pathname: "/first",
      component: first,
    },
    {
      cacheKey: "second",
      pathname: "/second",
      component: second,
    },
  ];
}

describe("RouteActivityCache", () => {
  it("mounts only the active cached route on its first visit", () => {
    const firstMounted = vi.fn();
    const secondMounted = vi.fn();

    function FirstPage() {
      useEffect(firstMounted, []);
      return <div>First page</div>;
    }

    function SecondPage() {
      useEffect(secondMounted, []);
      return <div>Second page</div>;
    }

    render(
      <RouteActivityCache
        pathname="/first"
        definitions={createDefinitions(FirstPage, SecondPage)}
        fallback={<div>Fallback page</div>}
      />,
    );

    expect(screen.getByText("First page")).toBeVisible();
    expect(screen.queryByText("Second page")).not.toBeInTheDocument();
    expect(firstMounted).toHaveBeenCalledTimes(1);
    expect(secondMounted).not.toHaveBeenCalled();
  });

  it("keeps visited routes mounted and restores their component state", () => {
    function FirstPage() {
      const [count, setCount] = useState(0);

      return (
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          First count: {count}
        </button>
      );
    }

    function SecondPage() {
      return <div>Second page</div>;
    }

    const definitions = createDefinitions(FirstPage, SecondPage);
    const { rerender } = render(
      <RouteActivityCache
        pathname="/first"
        definitions={definitions}
        fallback={<div>Fallback page</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "First count: 0" }));

    rerender(
      <RouteActivityCache
        pathname="/second"
        definitions={definitions}
        fallback={<div>Fallback page</div>}
      />,
    );

    expect(screen.getByText("Second page")).toBeVisible();
    expect(screen.getByText("First count: 1")).not.toBeVisible();

    rerender(
      <RouteActivityCache
        pathname="/first"
        definitions={definitions}
        fallback={<div>Fallback page</div>}
      />,
    );

    expect(screen.getByRole("button", { name: "First count: 1" })).toBeVisible();
  });

  it("renders the fallback for non-cached routes while retaining cached routes", () => {
    function FirstPage() {
      return <div>First page</div>;
    }

    function SecondPage() {
      return <div>Second page</div>;
    }

    const definitions = createDefinitions(FirstPage, SecondPage);
    const { rerender } = render(
      <RouteActivityCache
        pathname="/first"
        definitions={definitions}
        fallback={<div>Fallback page</div>}
      />,
    );

    rerender(
      <RouteActivityCache
        pathname="/dashboard"
        definitions={definitions}
        fallback={<div>Fallback page</div>}
      />,
    );

    expect(screen.getByText("Fallback page")).toBeVisible();
    expect(screen.getByText("First page")).not.toBeVisible();
    expect(screen.queryByText("Second page")).not.toBeInTheDocument();
  });
});
