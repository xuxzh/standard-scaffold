import type {
  AiConversation,
  AiHealth,
  AiMessage,
  AiRun,
  StartAiRunResponse,
} from "./ai-chat-contract";
import { getAiChatClient } from "./ai-chat-client";

export function listAiConversations(signal?: AbortSignal): Promise<AiConversation[]> {
  return getAiChatClient().get("/conversations", signal);
}

export function createAiConversation(signal?: AbortSignal): Promise<AiConversation> {
  return getAiChatClient().post("/conversations", undefined, signal);
}

export async function deleteAiConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<void> {
  await getAiChatClient().delete(
    `/conversations/${encodeURIComponent(conversationId)}`,
    signal,
  );
}

export function getAiHealth(signal?: AbortSignal): Promise<AiHealth> {
  return getAiChatClient().get("/health", signal);
}

export function listAiMessages(
  conversationId: string,
  signal?: AbortSignal,
): Promise<AiMessage[]> {
  return getAiChatClient().get(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    signal,
  );
}

export function startAiRun(
  conversationId: string,
  content: string,
  signal?: AbortSignal,
): Promise<StartAiRunResponse> {
  return getAiChatClient().post(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { content },
    signal,
  );
}

export function stopAiRun(runId: string, signal?: AbortSignal): Promise<AiRun> {
  return getAiChatClient().post(
    `/runs/${encodeURIComponent(runId)}/stop`,
    undefined,
    signal,
  );
}
