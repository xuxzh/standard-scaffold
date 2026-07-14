import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";

import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n/config";

import type { AiRunEvent } from "./ai-chat-contract";
import { AiChatTrigger } from "./ai-chat-trigger";
import * as service from "./ai-chat-service";
import { subscribeAiRun } from "./ai-run-stream";

const { embed, finalize } = vi.hoisted(() => ({
  embed: vi.fn(),
  finalize: vi.fn(),
}));

vi.mock("vega-embed", () => ({ default: embed }));

vi.mock("./ai-chat-service", () => ({
  listAiConversations: vi.fn(),
  createAiConversation: vi.fn(),
  deleteAiConversation: vi.fn(),
  listAiMessages: vi.fn(),
  startAiRun: vi.fn(),
  stopAiRun: vi.fn(),
  getAiHealth: vi.fn(),
}));
vi.mock("./ai-run-stream", () => ({ subscribeAiRun: vi.fn() }));

const conversation = {
  id: "conversation-1",
  title: "Daily output",
  status: "active" as const,
  contextVersion: "v1",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
};

describe("AiChatSheet", () => {
  beforeEach(() => {
    embed.mockResolvedValue({ view: { finalize } });
    vi.mocked(service.getAiHealth).mockResolvedValue({ available: true });
    vi.mocked(service.listAiConversations).mockResolvedValue([conversation]);
    vi.mocked(service.listAiMessages).mockResolvedValue([]);
    vi.mocked(service.createAiConversation).mockResolvedValue(conversation);
    vi.mocked(service.deleteAiConversation).mockResolvedValue(undefined);
    vi.mocked(service.stopAiRun).mockResolvedValue(run("stopped"));
    vi.mocked(subscribeAiRun).mockResolvedValue(undefined);
  });

  it("auto-creates the first conversation and supports manual creation", async () => {
    vi.mocked(service.listAiConversations).mockResolvedValueOnce([]);
    renderChat();

    fireEvent.click(screen.getByRole("button", { name: "AI 助手" }));
    await waitFor(() => expect(service.createAiConversation).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "新会话" }));
    await waitFor(() => expect(service.createAiConversation).toHaveBeenCalledTimes(2));
  });

  it("streams a placeholder answer and replaces it with the final message", async () => {
    vi.mocked(service.startAiRun).mockResolvedValue(startResponse());
    vi.mocked(subscribeAiRun).mockImplementation(async (_runId, options) => {
      options.onEvent({
        type: "message.delta",
        runId: "run-1",
        messageId: "assistant-1",
        delta: "Partial",
      });
      options.onEvent({
        type: "run.completed",
        runId: "run-1",
        message: message({
          id: "assistant-1",
          role: "assistant",
          content: "Final answer",
          visualization: visualization(),
        }),
      });
    });
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: "AI 助手" }));
    const dialog = await screen.findByRole("dialog", { name: "MES AI 助手" });
    await within(dialog).findByRole("button", { name: "Daily output" });

    fireEvent.change(within(dialog).getByPlaceholderText("询问 MES 数据"), {
      target: { value: "今日产量" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "发送" }));

    expect(await within(dialog).findByText("今日产量")).toBeInTheDocument();
    expect(await within(dialog).findByText("Final answer")).toBeInTheDocument();
    expect((await within(dialog).findAllByText("Daily output")).length).toBeGreaterThan(0);
    expect(within(dialog).getByRole("table", { name: "AI 查询结果表格" })).toBeInTheDocument();
  });

  it("keeps streaming while closed and restores the result when reopened", async () => {
    let emit: ((event: AiRunEvent) => void) | undefined;
    vi.mocked(service.startAiRun).mockResolvedValue(startResponse());
    vi.mocked(subscribeAiRun).mockImplementation(
      (_runId, options) =>
        new Promise<void>((resolve) => {
          emit = (event) => {
            options.onEvent(event);
            resolve();
          };
        }),
    );
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: "AI 助手" }));
    const dialog = await screen.findByRole("dialog", { name: "MES AI 助手" });
    await within(dialog).findByRole("button", { name: "Daily output" });
    fireEvent.change(within(dialog).getByPlaceholderText("询问 MES 数据"), {
      target: { value: "Question" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "发送" }));
    await waitFor(() => expect(subscribeAiRun).toHaveBeenCalled());
    fireEvent.click(within(dialog).getByRole("button", { name: "关闭" }));

    emit?.({
      type: "run.completed",
      runId: "run-1",
      message: message({ id: "assistant-1", role: "assistant", content: "Finished closed" }),
    });
    fireEvent.click(screen.getByRole("button", { name: "AI 助手" }));

    expect(await screen.findByText("Finished closed")).toBeInTheDocument();
  });

  it("shows query evidence in a collapsed section and exposes stop", async () => {
    vi.mocked(service.startAiRun).mockResolvedValue(startResponse());
    vi.mocked(subscribeAiRun).mockImplementation(async (_runId, options) => {
      options.onEvent({
        type: "evidence.updated",
        runId: "run-1",
        evidence: evidence(),
      });
      await new Promise<void>(() => undefined);
    });
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: "AI 助手" }));
    const dialog = await screen.findByRole("dialog", { name: "MES AI 助手" });
    await within(dialog).findByRole("button", { name: "Daily output" });
    fireEvent.change(within(dialog).getByPlaceholderText("询问 MES 数据"), {
      target: { value: "Question" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "发送" }));

    fireEvent.click(await within(dialog).findByRole("button", { name: "查询依据" }));
    expect(within(dialog).getByText("SELECT 1")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "停止" }));
    await waitFor(() => expect(service.stopAiRun).toHaveBeenCalledWith("run-1"));
  });

  it("restores persisted query evidence with historical messages", async () => {
    vi.mocked(service.listAiMessages).mockResolvedValue([
      message({
        id: "assistant-history",
        role: "assistant",
        content: "Persisted answer",
        evidence: [evidence()],
        visualization: visualization(),
      }),
    ]);
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: "AI 助手" }));
    const dialog = await screen.findByRole("dialog", { name: "MES AI 助手" });

    expect(await within(dialog).findByText("Persisted answer")).toBeInTheDocument();
    expect(within(dialog).getByRole("table", { name: "AI 查询结果表格" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "查询依据" }));
    expect(within(dialog).getByText("SELECT 1")).toBeInTheDocument();
  });
});

function renderChat() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <AiChatTrigger />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    conversationId: "conversation-1",
    role: "user" as const,
    content: "Question",
    sequence: 1,
    status: "completed" as const,
    errorCode: null,
    completedAt: "2026-07-13T00:00:00.000Z",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

function run(status: "queued" | "stopped") {
  return {
    id: "run-1",
    conversationId: "conversation-1",
    userMessageId: "user-1",
    assistantMessageId: "assistant-1",
    status,
    startedAt: null,
    endedAt: null,
    errorCode: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
  };
}

function startResponse() {
  return {
    userMessage: message({ content: "今日产量" }),
    assistantMessage: message({ id: "assistant-1", role: "assistant", content: "", sequence: 2, status: "pending" }),
    run: run("queued"),
  };
}

function evidence() {
  return {
    id: "evidence-1",
    runId: "run-1",
    toolName: "mcp_mes_data_query_mes_data",
    sql: "SELECT 1",
    companyCode: "COMPANY-A",
    factoryCode: "FACTORY-A",
    timeRangeStart: null,
    timeRangeEnd: null,
    dataCutoffAt: null,
    status: "completed" as const,
    startedAt: "2026-07-13T00:00:00.000Z",
    endedAt: "2026-07-13T00:00:01.000Z",
    durationMs: 12,
    rowCount: 1,
    truncated: false,
    errorCode: null,
  };
}

function visualization() {
  return {
    specVersion: 1 as const,
    sourceEvidenceId: "evidence-1",
    metricIds: ["daily_output"],
    title: "Daily output trend",
    kpis: [
      { field: "dailyOutput", label: "Daily output", format: "integer" as const },
    ],
    table: {
      columns: [
        { field: "date", label: "Date", type: "temporal" as const },
        { field: "dailyOutput", label: "Daily output", format: "integer" as const },
      ],
    },
    chart: {
      mark: "line" as const,
      x: { field: "date", label: "Date", type: "temporal" as const },
      y: [
        { field: "dailyOutput", label: "Daily output", format: "integer" as const },
      ],
    },
    data: {
      rows: [{ date: "2026-07-14", dailyOutput: 12 }],
      truncated: false,
    },
  };
}
