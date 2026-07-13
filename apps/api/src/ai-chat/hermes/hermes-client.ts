export type HermesStreamEvent =
  | { type: "assistant.delta"; delta: string }
  | { type: "tool.started"; toolName: string; args: unknown }
  | {
      type: "tool.completed";
      toolName: string;
      preview?: string;
      durationMs?: number;
    }
  | { type: "assistant.completed"; content: string }
  | { type: "run.completed"; content: string }
  | { type: "run.failed"; message: string };

export interface HermesClient {
  health(signal?: AbortSignal): Promise<void>;
  createSession(input: {
    id: string;
    title: string;
    systemPrompt: string;
  }): Promise<void>;
  streamSession(input: {
    sessionId: string;
    message: string;
    systemPrompt: string;
    signal: AbortSignal;
  }): AsyncIterable<HermesStreamEvent>;
}

export type HermesClientConfig = {
  baseUrl: string;
  apiKey: string;
  requestTimeoutMs: number;
};

type SseFrame = {
  event: string;
  data: string;
};

export function loadHermesClientConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): HermesClientConfig {
  const baseUrl = requireEnv(env, "HERMES_API_BASE_URL");
  const apiKey = requireEnv(env, "HERMES_API_KEY");
  const requestTimeoutMs = Number(requireEnv(env, "HERMES_REQUEST_TIMEOUT_MS"));
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
    throw new Error("HERMES_REQUEST_TIMEOUT_MS must be a positive integer");
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error("HERMES_API_BASE_URL must be a valid URL");
  }

  return {
    baseUrl: parsedUrl.toString().replace(/\/$/, ""),
    apiKey,
    requestTimeoutMs,
  };
}

export class HttpHermesClient implements HermesClient {
  constructor(private readonly config: HermesClientConfig) {}

  async health(signal?: AbortSignal): Promise<void> {
    const response = await this.request("/health", { method: "GET" }, signal);
    await response.arrayBuffer();
  }

  async createSession(input: {
    id: string;
    title: string;
    systemPrompt: string;
  }): Promise<void> {
    const response = await this.request("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        id: input.id,
        title: input.title,
        system_prompt: input.systemPrompt,
      }),
    });
    await response.arrayBuffer();
  }

  async *streamSession(input: {
    sessionId: string;
    message: string;
    systemPrompt: string;
    signal: AbortSignal;
  }): AsyncIterable<HermesStreamEvent> {
    const requestSignal = createRequestSignal(
      this.config.requestTimeoutMs,
      input.signal,
    );
    try {
      const response = await this.fetchResponse(
        `/api/sessions/${encodeURIComponent(input.sessionId)}/chat/stream`,
        {
          method: "POST",
          body: JSON.stringify({
            message: input.message,
            system_message: input.systemPrompt,
          }),
          signal: requestSignal.signal,
        },
      );
      if (!response.body) {
        throw new Error("Hermes stream protocol error");
      }
      for await (const frame of parseSse(response.body)) {
        const event = parseHermesEvent(frame);
        if (event) {
          yield event;
        }
      }
    } catch (error) {
      throw mapRequestError(error, requestSignal, input.signal);
    } finally {
      requestSignal.cleanup();
    }
  }

  private async request(
    path: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<Response> {
    const requestSignal = createRequestSignal(
      this.config.requestTimeoutMs,
      externalSignal,
    );
    try {
      return await this.fetchResponse(path, {
        ...init,
        signal: requestSignal.signal,
      });
    } catch (error) {
      throw mapRequestError(error, requestSignal, externalSignal);
    } finally {
      requestSignal.cleanup();
    }
  }

  private async fetchResponse(path: string, init: RequestInit): Promise<Response> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${this.config.apiKey}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Hermes request failed with status ${response.status}`);
    }
    return response;
  }
}

function requireEnv(
  env: Readonly<Record<string, string | undefined>>,
  key: string,
): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function createRequestSignal(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromExternal = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  }
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  timeout.unref();

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    },
  };
}

function mapRequestError(
  error: unknown,
  requestSignal: ReturnType<typeof createRequestSignal>,
  externalSignal?: AbortSignal,
): Error {
  if (externalSignal?.aborted) {
    return new DOMException("The operation was aborted", "AbortError");
  }
  if (requestSignal.didTimeOut()) {
    return new Error("Hermes request timed out");
  }
  if (error instanceof Error && error.message.startsWith("Hermes request failed")) {
    return error;
  }
  if (error instanceof Error && error.message === "Hermes stream protocol error") {
    return error;
  }
  return new Error("Hermes request failed");
}

async function* parseSse(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let data: string[] = [];

  const processLine = (line: string): SseFrame | undefined => {
    if (line === "") {
      if (data.length === 0) {
        event = "";
        return undefined;
      }
      const frame = { event, data: data.join("\n") };
      event = "";
      data = [];
      return frame;
    }
    if (line.startsWith(":")) {
      return undefined;
    }
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }
    if (field === "event") {
      event = value;
    } else if (field === "data") {
      data.push(value);
    }
    return undefined;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    while (true) {
      const lineEnding = findLineEnding(buffer);
      if (!lineEnding) {
        break;
      }
      const line = buffer.slice(0, lineEnding.index);
      buffer = buffer.slice(lineEnding.index + lineEnding.length);
      const frame = processLine(line);
      if (frame) {
        yield frame;
      }
    }
    if (done) {
      break;
    }
  }

  if (buffer) {
    const frame = processLine(buffer);
    if (frame) {
      yield frame;
    }
  }
  const finalFrame = processLine("");
  if (finalFrame) {
    yield finalFrame;
  }
}

function findLineEnding(
  buffer: string,
): { index: number; length: number } | undefined {
  for (let index = 0; index < buffer.length; index += 1) {
    const character = buffer[index];
    if (character === "\n") {
      return { index, length: 1 };
    }
    if (character === "\r") {
      if (index === buffer.length - 1) {
        return undefined;
      }
      return {
        index,
        length: buffer[index + 1] === "\n" ? 2 : 1,
      };
    }
  }
  return undefined;
}

function parseHermesEvent(frame: SseFrame): HermesStreamEvent | undefined {
  if (frame.event && !isWhitelistedEvent(frame.event)) {
    return undefined;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(frame.data);
  } catch {
    throw new Error("Hermes stream protocol error");
  }
  if (!isRecord(payload)) {
    throw new Error("Hermes stream protocol error");
  }
  const eventType = frame.event || payload.type;
  if (!isWhitelistedEvent(eventType)) {
    return undefined;
  }

  switch (eventType) {
    case "assistant.delta":
      return { type: eventType, delta: requireString(payload.delta) };
    case "tool.started":
      return {
        type: eventType,
        toolName: requireString(payload.toolName ?? payload.tool_name),
        args: payload.args,
      };
    case "tool.completed": {
      return {
        type: eventType,
        toolName: requireString(payload.toolName ?? payload.tool_name),
        ...(typeof payload.preview === "string"
          ? { preview: payload.preview }
          : {}),
        ...(typeof payload.durationMs === "number"
          ? { durationMs: payload.durationMs }
          : {}),
      };
    }
    case "assistant.completed":
      return { type: eventType, content: requireString(payload.content) };
    case "run.completed":
      return typeof payload.content === "string"
        ? { type: eventType, content: payload.content }
        : undefined;
    case "run.failed":
      return { type: eventType, message: requireString(payload.message) };
  }
}

function isWhitelistedEvent(value: unknown): value is HermesStreamEvent["type"] {
  return (
    value === "assistant.delta" ||
    value === "tool.started" ||
    value === "tool.completed" ||
    value === "assistant.completed" ||
    value === "run.completed" ||
    value === "run.failed"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Hermes stream protocol error");
  }
  return value;
}
