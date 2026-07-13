export type AiConversation = {
  id: string;
  title: string;
  status: "active" | "archived";
  contextVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sequence: number;
  status: "pending" | "streaming" | "completed" | "stopped" | "failed";
  errorCode: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidence?: AiQueryEvidence[];
};

export type AiRun = {
  id: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  status: "queued" | "running" | "completed" | "stopped" | "failed" | "interrupted";
  startedAt: string | null;
  endedAt: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiQueryEvidence = {
  id: string;
  runId: string;
  toolName: string;
  sql: string;
  companyCode: string;
  factoryCode: string;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  dataCutoffAt: string | null;
  status: "running" | "completed" | "failed";
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  rowCount: number | null;
  truncated: boolean | null;
  errorCode: string | null;
};

export type StartAiRunResponse = {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
  run: AiRun;
};

export type AiRunEvent =
  | { type: "message.delta"; runId: string; messageId: string; delta: string }
  | { type: "evidence.updated"; runId: string; evidence: AiQueryEvidence }
  | { type: "run.completed"; runId: string; message: AiMessage }
  | { type: "run.stopped"; runId: string; message: AiMessage }
  | { type: "run.failed"; runId: string; errorCode: string; message: string };

export type AiHealth = {
  available: boolean;
  version?: string;
  capabilities?: string[];
};
