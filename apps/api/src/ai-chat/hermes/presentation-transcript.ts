import {
  mesPresentationRequestV1Schema,
  type MesPresentationRequestV1,
} from "@repo/ai-visualization-contract";

import type { HermesTranscriptMessage } from "./hermes-client.js";

export type ExtractedPresentation = {
  request: MesPresentationRequestV1;
  query: {
    sql: string;
    columns: string[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    truncated: boolean;
  };
};

type TranscriptToolCall = NonNullable<
  HermesTranscriptMessage["toolCalls"]
>[number] & { index: number };

type QueryResult = Omit<ExtractedPresentation["query"], "sql">;
type IndexedQuery = ExtractedPresentation["query"] & { index: number };

const QUERY_TOOL_NAMES = new Set([
  "mcp__mes_data__query_mes_data",
  "mcp_mes_data_query_mes_data",
]);
const PRESENTATION_TOOL_NAMES = new Set([
  "mcp__mes_data__present_mes_result",
  "mcp_mes_data_present_mes_result",
]);

export function extractPresentations(
  messages: readonly HermesTranscriptMessage[],
): ExtractedPresentation[] {
  const calls: TranscriptToolCall[] = [];
  const callIds = new Set<string>();
  const results = new Map<string, unknown>();

  for (const [index, message] of messages.entries()) {
    for (const call of message.toolCalls ?? []) {
      if (callIds.has(call.id)) {
        return [];
      }
      callIds.add(call.id);
      calls.push({ ...call, index });
    }
    if (message.toolCallId !== undefined) {
      if (results.has(message.toolCallId)) {
        return [];
      }
      results.set(message.toolCallId, message.content);
    }
  }

  const queries = calls.flatMap((call) => {
    if (!QUERY_TOOL_NAMES.has(call.name)) {
      return [];
    }
    const queryInput = parseQueryInput(call.arguments);
    const queryResult = parseQueryResult(results.get(call.id));
    return queryInput && queryResult
      ? [{ index: call.index, sql: queryInput.sql, ...queryResult }]
      : [];
  });

  return calls.flatMap((call) => {
    if (!PRESENTATION_TOOL_NAMES.has(call.name)) {
      return [];
    }
    const request = mesPresentationRequestV1Schema.safeParse(
      parseJsonValue(call.arguments),
    );
    if (!request.success) {
      return [];
    }
    const result = parsePresentationResult(results.get(call.id));
    if (
      !result ||
      JSON.stringify(result) !== JSON.stringify(request.data)
    ) {
      return [];
    }
    const query = findLastMatchingQuery(
      queries,
      call.index,
      request.data.sourceSql,
    );
    if (!query) {
      return [];
    }
    const { index: _index, ...matchedQuery } = query;
    return [{ request: request.data, query: matchedQuery }];
  });
}

function parsePresentationResult(
  content: unknown,
): MesPresentationRequestV1 | undefined {
  const parsed = unwrapTextContent(parseJsonValue(content));
  if (
    !isRecord(parsed) ||
    Object.keys(parsed).some(
      (key) => key !== "accepted" && key !== "request",
    ) ||
    parsed.accepted !== true
  ) {
    return undefined;
  }
  const request = mesPresentationRequestV1Schema.safeParse(parsed.request);
  return request.success ? request.data : undefined;
}

function findLastMatchingQuery(
  queries: readonly IndexedQuery[],
  presentationIndex: number,
  sourceSql: string,
): IndexedQuery | undefined {
  for (let index = queries.length - 1; index >= 0; index -= 1) {
    const query = queries[index];
    if (
      query !== undefined &&
      query.index < presentationIndex &&
      query.sql === sourceSql
    ) {
      return query;
    }
  }
  return undefined;
}

function parseQueryInput(value: unknown): { sql: string } | undefined {
  const parsed = parseJsonValue(value);
  return isRecord(parsed) &&
    Object.keys(parsed).length === 1 &&
    typeof parsed.sql === "string" &&
    parsed.sql.length > 0
    ? { sql: parsed.sql }
    : undefined;
}

function parseQueryResult(content: unknown): QueryResult | undefined {
  const parsed = unwrapTextContent(parseJsonValue(content));
  if (!isRecord(parsed)) {
    return undefined;
  }
  const allowedKeys = new Set([
    "columns",
    "rows",
    "rowCount",
    "durationMs",
    "truncated",
  ]);
  if (Object.keys(parsed).some((key) => !allowedKeys.has(key))) {
    return undefined;
  }
  if (
    !Array.isArray(parsed.columns) ||
    !parsed.columns.every((column) => typeof column === "string") ||
    !Array.isArray(parsed.rows) ||
    !parsed.rows.every(isRecord) ||
    !Number.isInteger(parsed.rowCount) ||
    (parsed.rowCount as number) < 0 ||
    typeof parsed.truncated !== "boolean" ||
    (parsed.durationMs !== undefined &&
      (typeof parsed.durationMs !== "number" ||
        !Number.isFinite(parsed.durationMs) ||
        parsed.durationMs < 0))
  ) {
    return undefined;
  }
  return {
    columns: [...parsed.columns],
    rows: parsed.rows.map((row) => ({ ...row })),
    rowCount: parsed.rowCount as number,
    truncated: parsed.truncated,
  };
}

function unwrapTextContent(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.content)) {
    return value;
  }
  const textItems = value.content.filter(
    (item): item is { type: "text"; text: string } =>
      isRecord(item) && item.type === "text" && typeof item.text === "string",
  );
  return textItems.length === 1 ? parseJsonValue(textItems[0]?.text) : undefined;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
