import type { AiRunEvent } from "./ai-chat-contract";
import {
  AI_CHAT_API_ROOT,
  AiChatClientError,
  createAiChatHeaders,
  getAiChatTransport,
} from "./ai-chat-client";

const PUBLIC_EVENTS = new Set([
  "message.delta",
  "evidence.updated",
  "run.completed",
  "run.stopped",
  "run.failed",
]);

export class AiStreamProtocolError extends Error {
  readonly code = "AI_STREAM_PROTOCOL_ERROR";

  constructor() {
    super("Invalid AI stream event");
    this.name = "AiStreamProtocolError";
  }
}

export async function subscribeAiRun(
  runId: string,
  options: {
    signal: AbortSignal;
    onEvent: (event: AiRunEvent) => void;
  },
): Promise<void> {
  const response = await getAiChatTransport()(
    `${AI_CHAT_API_ROOT}/runs/${encodeURIComponent(runId)}/events`,
    {
      method: "GET",
      headers: createAiChatHeaders(),
      signal: options.signal,
    },
  );
  if (!response.ok) {
    throw new AiChatClientError(
      "AI stream request failed",
      response.status,
      `HTTP_${response.status}`,
    );
  }
  if (!response.body) {
    throw new AiStreamProtocolError();
  }

  for await (const frame of parseSse(response.body)) {
    if (!PUBLIC_EVENTS.has(frame.event)) {
      continue;
    }
    const event = parsePublicEvent(frame.event, frame.data);
    options.onEvent(event);
  }
}

async function* parseSse(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<{ event: string; data: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const result = await reader.read();
      buffer += decoder.decode(result.value, { stream: !result.done });
      const normalized = buffer.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
      const frames = normalized.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const rawFrame of frames) {
        const frame = toFrame(rawFrame);
        if (frame) {
          yield frame;
        }
      }
      if (result.done) {
        const frame = toFrame(buffer);
        if (frame) {
          yield frame;
        }
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function toFrame(rawFrame: string): { event: string; data: string } | undefined {
  let event = "message";
  const data: string[] = [];
  for (const line of rawFrame.split("\n")) {
    if (!line || line.startsWith(":")) {
      continue;
    }
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const rawValue = separator < 0 ? "" : line.slice(separator + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
    if (field === "event") {
      event = value;
    } else if (field === "data") {
      data.push(value);
    }
  }
  return data.length ? { event, data: data.join("\n") } : undefined;
}

function parsePublicEvent(eventName: string, data: string): AiRunEvent {
  try {
    const value: unknown = JSON.parse(data);
    if (!isRecord(value) || value.type !== eventName || !isString(value.runId)) {
      throw new AiStreamProtocolError();
    }
    if (
      value.type === "message.delta" &&
      isString(value.messageId) &&
      isString(value.delta)
    ) {
      return value as AiRunEvent;
    }
    if (
      value.type === "evidence.updated" &&
      isRecord(value.evidence) &&
      isString(value.evidence.id)
    ) {
      return value as AiRunEvent;
    }
    if (
      (value.type === "run.completed" || value.type === "run.stopped") &&
      isRecord(value.message) &&
      isString(value.message.id)
    ) {
      return value as AiRunEvent;
    }
    if (
      value.type === "run.failed" &&
      isString(value.errorCode) &&
      isString(value.message)
    ) {
      return value as AiRunEvent;
    }
  } catch (error) {
    if (error instanceof AiStreamProtocolError) {
      throw error;
    }
  }
  throw new AiStreamProtocolError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
