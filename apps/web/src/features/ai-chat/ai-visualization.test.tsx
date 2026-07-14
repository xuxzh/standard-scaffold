import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiVisualizationV1 } from "@repo/ai-visualization-contract";

import "@/i18n/config";

const { embed, finalize } = vi.hoisted(() => ({
  embed: vi.fn(),
  finalize: vi.fn(),
}));

vi.mock("vega-embed", () => ({ default: embed }));

import { AiVisualization } from "./ai-visualization";

afterEach(() => {
  embed.mockReset();
  finalize.mockReset();
});

describe("AiVisualization", () => {
  it("renders KPI and formatted table columns in order", () => {
    embed.mockResolvedValue({ view: { finalize } });
    const input = visualization();
    delete input.chart;

    render(<AiVisualization visualization={input} />);

    expect(screen.getAllByText("Daily output")).toHaveLength(2);
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Date",
      "Daily output",
    ]);
    expect(embed).not.toHaveBeenCalled();
  });

  it("embeds one chart and finalizes it on unmount", async () => {
    embed.mockResolvedValue({ view: { finalize } });
    const rendered = render(<AiVisualization visualization={visualization()} />);

    await waitFor(() => expect(embed).toHaveBeenCalledOnce());
    rendered.unmount();

    expect(finalize).toHaveBeenCalledOnce();
  });

  it("keeps the table when embed rejects", async () => {
    embed.mockRejectedValue(new Error("render failed"));

    render(<AiVisualization visualization={visualization()} />);

    await waitFor(() =>
      expect(screen.getByText("aiChat.visualizationUnavailable")).toBeInTheDocument(),
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("shows a truncation notice", () => {
    embed.mockResolvedValue({ view: { finalize } });
    const input = visualization();
    input.data.truncated = true;

    render(<AiVisualization visualization={input} />);

    expect(screen.getByText("aiChat.visualizationTruncated")).toBeInTheDocument();
  });

  it("does not crash for malformed persisted data", () => {
    expect(() =>
      render(
        <AiVisualization
          visualization={{ specVersion: 99 } as unknown as AiVisualizationV1}
        />,
      ),
    ).not.toThrow();
  });
});

function visualization(): AiVisualizationV1 {
  return {
    specVersion: 1,
    sourceEvidenceId: "evidence-1",
    metricIds: ["daily_output"],
    title: "Daily output trend",
    kpis: [
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
    table: {
      columns: [
        { field: "date", label: "Date", type: "temporal" },
        { field: "dailyOutput", label: "Daily output", format: "integer" },
      ],
    },
    chart: {
      mark: "line",
      x: { field: "date", label: "Date", type: "temporal" },
      y: [{ field: "dailyOutput", label: "Daily output", format: "integer" }],
    },
    data: {
      rows: [{ date: "2026-07-14", dailyOutput: 12 }],
      truncated: false,
    },
  };
}
