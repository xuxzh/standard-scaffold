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
  const sql =
    "SELECT SUM(Quantity) FROM dbo.ProductionOutput WHERE CompanyCode = @companyCode AND FactoryCode = @factoryCode";
  send(response, "assistant.delta", { delta: "**今日产量**" });
  send(response, "tool.started", {
    toolName: "mcp_mes_data_query_mes_data",
    args: { sql },
  });
  send(response, "tool.completed", {
    toolName: "mcp_mes_data_query_mes_data",
    preview: JSON.stringify({ rowCount: 1, truncated: false }),
    durationMs: 8,
  });
  send(response, "assistant.delta", { delta: "：128 件" });
  send(response, "run.completed", { content: "**今日产量**：128 件" });
  response.end();
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
