import { describe, expect, it } from "vitest";
import type { MesPresentationRequestV1 } from "@repo/ai-visualization-contract";

import type { HermesTranscriptMessage } from "./hermes-client.js";
import { extractPresentations } from "./presentation-transcript.js";

const sql = "SELECT ReportDate AS date, SUM(GoodQty) AS dailyOutput";

const presentationRequest = {
  specVersion: 1,
  sourceSql: sql,
  metricIds: ["daily_output"],
  title: "Daily output trend",
  kpis: [],
  table: {
    columns: [
      { field: "date", label: "Date", type: "temporal" },
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  },
  chart: {
    mark: "line",
    x: { field: "date", label: "Date", type: "temporal" },
    y: [
      { field: "dailyOutput", label: "Daily output", format: "integer" },
    ],
  },
} satisfies MesPresentationRequestV1;

const queryResult = {
  columns: ["date", "dailyOutput"],
  rows: [
    { date: "2026-07-13", dailyOutput: 10 },
    { date: "2026-07-14", dailyOutput: 12 },
  ],
  rowCount: 2,
  durationMs: 7,
  truncated: false,
};

describe("extractPresentations", () => {
  it.each([
    ["double-underscore names", "mcp__mes_data__"],
    ["single-underscore names", "mcp_mes_data_"],
  ])("associates query output and presentation for %s", (_name, prefix) => {
    expect(extractPresentations(createMessages(prefix))).toEqual([
      {
        request: presentationRequest,
        query: {
          sql,
          columns: queryResult.columns,
          rows: queryResult.rows,
          rowCount: queryResult.rowCount,
          truncated: queryResult.truncated,
        },
      },
    ]);
  });

  it("reads a query result from an MCP text-content envelope", () => {
    const messages = createMessages("mcp__mes_data__");
    messages[1] = {
      role: "tool",
      toolCallId: "call-query",
      content: JSON.stringify({
        content: [{ type: "text", text: JSON.stringify(queryResult) }],
      }),
    };

    expect(extractPresentations(messages)).toHaveLength(1);
  });

  it("matches the one query whose SQL is exactly equal", () => {
    const messages = createMessages("mcp__mes_data__");
    messages.unshift(
      {
        role: "assistant",
        content: null,
        toolCalls: [
          {
            id: "call-other-query",
            name: "mcp__mes_data__query_mes_data",
            arguments: JSON.stringify({ sql: "SELECT 999 AS value" }),
          },
        ],
      },
      {
        role: "tool",
        toolCallId: "call-other-query",
        content: JSON.stringify({
          columns: ["value"],
          rows: [{ value: 999 }],
          rowCount: 1,
          truncated: false,
        }),
      },
    );

    expect(extractPresentations(messages)[0]?.query.sql).toBe(sql);
  });

  it.each([
    [
      "missing query result",
      createMessages("mcp__mes_data__").filter(
        (message) => message.toolCallId !== "call-query",
      ),
    ],
    [
      "duplicate tool call ID",
      [
        ...createMessages("mcp__mes_data__"),
        {
          role: "assistant",
          content: null,
          toolCalls: [
            {
              id: "call-query",
              name: "mcp__mes_data__query_mes_data",
              arguments: JSON.stringify({ sql }),
            },
          ],
        },
      ],
    ],
    [
      "SQL mismatch",
      createMessages("mcp__mes_data__").map((message) =>
        message.toolCalls?.some((call) => call.id === "call-present")
          ? {
              ...message,
              toolCalls: message.toolCalls.map((call) => ({
                ...call,
                arguments: JSON.stringify({
                  ...presentationRequest,
                  sourceSql: `${sql} `,
                }),
              })),
            }
          : message,
      ),
    ],
    [
      "invalid presentation request",
      createMessages("mcp__mes_data__").map((message) =>
        message.toolCalls?.some((call) => call.id === "call-present")
          ? {
              ...message,
              toolCalls: message.toolCalls.map((call) => ({
                ...call,
                arguments: JSON.stringify({
                  ...presentationRequest,
                  chart: { ...presentationRequest.chart, mark: "pie" },
                }),
              })),
            }
          : message,
      ),
    ],
  ])("returns no presentation for %s", (_name, messages) => {
    expect(extractPresentations(messages)).toEqual([]);
  });

  it("does not infer rows from tool previews", () => {
    const messages = createMessages("mcp__mes_data__");
    messages[1] = {
      role: "tool",
      toolCallId: "call-query",
      content: JSON.stringify({ rowCount: 2, truncated: false }),
    };

    expect(extractPresentations(messages)).toEqual([]);
  });
});

function createMessages(prefix: string): HermesTranscriptMessage[] {
  return [
    {
      role: "assistant",
      content: null,
      toolCalls: [
        {
          id: "call-query",
          name: `${prefix}query_mes_data`,
          arguments: JSON.stringify({ sql }),
        },
      ],
    },
    {
      role: "tool",
      toolCallId: "call-query",
      content: JSON.stringify(queryResult),
    },
    {
      role: "assistant",
      content: null,
      toolCalls: [
        {
          id: "call-present",
          name: `${prefix}present_mes_result`,
          arguments: JSON.stringify(presentationRequest),
        },
      ],
    },
  ];
}
