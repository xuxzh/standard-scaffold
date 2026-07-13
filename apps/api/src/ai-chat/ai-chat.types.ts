export type AiActorScope = {
  companyCode: string;
  factoryCode: string;
  userKey: string;
  userName?: string;
};

export type AiConversationDto = {
  id: string;
  title: string;
  status: "active" | "archived";
  contextVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type AiMessageDto = {
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
};

export type AiRunDto = {
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

export type StartAiRunRecord = {
  userMessage: AiMessageDto;
  assistantMessage: AiMessageDto;
  run: AiRunDto;
  hermesSessionId: string;
};

export type AiQueryEvidenceDto = {
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
