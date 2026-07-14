import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const sessions = new Set<string>();
let healthy = true;

const server = createServer(async (request, response) => {
  if (request.url === "/__fake__/reset" && request.method === "POST") {
    healthy = true;
    sessions.clear();
    return json(response, 200, { reset: true });
  }
  if (request.url === "/__fake__/health/fail" && request.method === "POST") {
    healthy = false;
    return json(response, 200, { healthy });
  }
  if (request.url === "/health" && request.method === "GET") {
    return json(response, healthy ? 200 : 503, { status: healthy ? "ok" : "down" });
  }
  if (request.url === "/api/sessions" && request.method === "POST") {
    if (!healthy) return json(response, 503, { error: "unavailable" });
    const input = JSON.parse(await readBody(request)) as { id?: unknown };
    if (typeof input.id !== "string") return json(response, 400, { error: "id" });
    sessions.add(input.id);
    return json(response, 201, { id: input.id });
  }

  const match = request.url?.match(/^\/api\/sessions\/([^/]+)\/chat\/stream$/);
  if (match && request.method === "POST") {
    const sessionId = decodeURIComponent(match[1] ?? "");
    if (!sessions.has(sessionId)) return json(response, 404, { error: "session" });
    const input = JSON.parse(await readBody(request)) as { message?: unknown };
    const message = typeof input.message === "string" ? input.message : "";
    return stream(response, message);
  }
  json(response, 404, { error: "not_found" });
});

server.listen(8660, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

function stream(response: ServerResponse, message: string): void {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  if (message.includes("查询失败")) {
    send(response, "run.failed", { message: "MCP query failed" });
    response.end();
    return;
  }
  if (message.includes("中断")) {
    send(response, "assistant.delta", { delta: "partial-safe-answer" });
    response.destroy();
    return;
  }
  if (message.includes("慢速")) {
    send(response, "assistant.delta", { delta: "first-token" });
    const timer = setTimeout(() => {
      send(response, "assistant.delta", { delta: "late-token" });
      send(response, "run.completed", { content: "first-token late-token" });
      response.end();
    }, 2_000);
    response.on("close", () => clearTimeout(timer));
    return;
  }
  const scenario = createScenario(message);
  send(response, "assistant.delta", { delta: scenario.content });
  send(response, "tool.started", {
    toolName: "mcp_mes_data_query_mes_data",
    args: { sql: scenario.sql },
  });
  send(response, "tool.completed", {
    toolName: "mcp_mes_data_query_mes_data",
    preview: JSON.stringify({
      rowCount: scenario.rows.length,
      truncated: scenario.truncated,
    }),
    durationMs: 8,
  });
  send(response, "run.completed", {
    content: scenario.content,
    messages: createTranscript(scenario),
  });
  response.end();
}

type Scenario = {
  sql: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  truncated: boolean;
  content: string;
  presentation?: Record<string, unknown>;
  rejectedPresentation?: Record<string, unknown>;
  malformed?: boolean;
};

function createScenario(message: string): Scenario {
  if (message.includes("单值")) {
    const sql =
      "SELECT SUM(Quantity) AS dailyOutput FROM dbo.ProductionOutput WHERE CompanyCode = @companyCode AND FactoryCode = @factoryCode";
    return {
      sql,
      columns: ["dailyOutput"],
      rows: [{ dailyOutput: 128, unauthorizedColumn: "must-not-reach-browser" }],
      truncated: false,
      content: "**今日产量**：128 件",
      presentation: createPresentation(sql, {
        kpis: [metric("dailyOutput", "Daily output")],
        columns: [metric("dailyOutput", "Daily output")],
      }),
    };
  }
  if (message.includes("分类柱状图")) {
    const sql =
      "SELECT ProductType AS category, COUNT(DISTINCT WorkOrderId) AS completedWorkOrders FROM dbo.WorkOrder WHERE CompanyCode = @companyCode AND FactoryCode = @factoryCode GROUP BY ProductType";
    return {
      sql,
      columns: ["category", "completedWorkOrders"],
      rows: [
        { category: "A", completedWorkOrders: 12 },
        { category: "B", completedWorkOrders: 9 },
        { category: "C", completedWorkOrders: 7 },
      ],
      truncated: false,
      content: "已按允许维度汇总完成工单。",
      presentation: createPresentation(sql, {
        metricIds: ["daily_completed_work_orders"],
        title: "Completed work orders by category",
        columns: [
          dimension("category", "Category", "nominal"),
          metric("completedWorkOrders", "Completed work orders"),
        ],
        chart: {
          mark: "bar",
          x: dimension("category", "Category", "nominal"),
          y: [metric("completedWorkOrders", "Completed work orders")],
        },
      }),
    };
  }

  const sql =
    "SELECT ReportDate AS date, SUM(Quantity) AS dailyOutput FROM dbo.ProductionOutput WHERE CompanyCode = @companyCode AND FactoryCode = @factoryCode GROUP BY ReportDate";
  const rows = [
    { date: "2026-07-08", dailyOutput: 121 },
    { date: "2026-07-09", dailyOutput: 119 },
    { date: "2026-07-10", dailyOutput: 124 },
    { date: "2026-07-11", dailyOutput: 126 },
    { date: "2026-07-12", dailyOutput: 123 },
    { date: "2026-07-13", dailyOutput: 125 },
    { date: "2026-07-14", dailyOutput: 128 },
  ];
  const presentation = createPresentation(sql, {
    kpis: [metric("dailyOutput", "Daily output")],
    columns: [
      dimension("date", "Date", "temporal"),
      metric("dailyOutput", "Daily output"),
    ],
    chart: {
      mark: "line",
      x: dimension("date", "Date", "temporal"),
      y: [metric("dailyOutput", "Daily output")],
    },
  });
  return {
    sql,
    columns: ["date", "dailyOutput"],
    rows,
    truncated: message.includes("截断"),
    content: "**今日产量**：128 件",
    ...(message.includes("展示工具缺失") ? {} : { presentation }),
    ...(message.includes("畸形转录") ? { malformed: true } : {}),
    ...(message.includes("不支持图表")
      ? {
          rejectedPresentation: createPresentation(sql, {
            columns: [
              dimension("date", "Date", "temporal"),
              metric("dailyOutput", "Daily output"),
            ],
            chart: {
              mark: "pie",
              x: dimension("date", "Date", "temporal"),
              y: [metric("dailyOutput", "Daily output")],
            },
          }),
          presentation: createPresentation(sql, {
            kpis: [metric("dailyOutput", "Daily output")],
            columns: [
              dimension("date", "Date", "temporal"),
              metric("dailyOutput", "Daily output"),
            ],
          }),
        }
      : {}),
  };
}

function createPresentation(
  sql: string,
  input: {
    metricIds?: string[];
    title?: string;
    kpis?: Array<Record<string, unknown>>;
    columns: Array<Record<string, unknown>>;
    chart?: Record<string, unknown>;
  },
): Record<string, unknown> {
  return {
    specVersion: 1,
    sourceSql: sql,
    metricIds: input.metricIds ?? ["daily_output"],
    title: input.title ?? "Daily output trend",
    kpis: input.kpis ?? [],
    table: { columns: input.columns },
    ...(input.chart ? { chart: input.chart } : {}),
  };
}

function metric(field: string, label: string): Record<string, unknown> {
  return { field, label, format: "integer" };
}

function dimension(
  field: string,
  label: string,
  type: "temporal" | "nominal",
): Record<string, unknown> {
  return { field, label, type };
}

function createTranscript(scenario: Scenario): object[] {
  const queryCallId = scenario.malformed ? "duplicate-call" : "call-query";
  const messages: object[] = [
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: queryCallId,
          type: "function",
          function: {
            name: "mcp_mes_data_query_mes_data",
            arguments: JSON.stringify({ sql: scenario.sql }),
          },
        },
      ],
    },
    {
      role: "tool",
      tool_call_id: queryCallId,
      content: JSON.stringify({
        columns: scenario.columns,
        rows: scenario.rows,
        rowCount: scenario.rows.length,
        durationMs: 8,
        truncated: scenario.truncated,
      }),
    },
  ];
  if (scenario.rejectedPresentation) {
    messages.push(
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-present-rejected",
            type: "function",
            function: {
              name: "mcp_mes_data_present_mes_result",
              arguments: JSON.stringify(scenario.rejectedPresentation),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call-present-rejected",
        content: JSON.stringify({ accepted: false, error: "unsupported mark" }),
      },
    );
  }
  if (scenario.presentation) {
    const presentationCallId = scenario.malformed
      ? queryCallId
      : "call-present";
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: presentationCallId,
          type: "function",
          function: {
            name: "mcp_mes_data_present_mes_result",
            arguments: JSON.stringify(scenario.presentation),
          },
        },
      ],
    });
    messages.push({
      role: "tool",
      tool_call_id: presentationCallId,
      content: JSON.stringify({
        accepted: true,
        request: scenario.presentation,
      }),
    });
  }
  messages.push({ role: "assistant", content: scenario.content });
  return messages;
}

function send(response: ServerResponse, event: string, data: object): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function json(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
