import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { AiMessage, AiQueryEvidence, StartAiRunResponse } from "./ai-chat-contract";
import { ChatComposer } from "./chat-composer";
import { ConversationList } from "./conversation-list";
import { MessageList } from "./message-list";
import {
  createAiConversation,
  deleteAiConversation,
  getAiHealth,
  listAiConversations,
  listAiMessages,
  startAiRun,
  stopAiRun,
} from "./ai-chat-service";
import { subscribeAiRun } from "./ai-run-stream";
import { AiChatClientError } from "./ai-chat-client";

type ActiveRun = {
  record: StartAiRunResponse;
  message?: AiMessage;
  content: string;
  evidence: AiQueryEvidence[];
  streaming: boolean;
  error: boolean;
};

export function AiChatSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRun | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const autoCreated = useRef(false);
  const conversations = useQuery({ queryKey: ["ai-chat", "conversations"], queryFn: ({ signal }) => listAiConversations(signal), enabled: open });
  const effectiveSelectedId = selectedId ?? conversations.data?.[0]?.id ?? null;
  const health = useQuery({ queryKey: ["ai-chat", "health"], queryFn: ({ signal }) => getAiHealth(signal), enabled: open });
  const messages = useQuery({
    queryKey: ["ai-chat", "messages", effectiveSelectedId],
    queryFn: ({ signal }) => listAiMessages(effectiveSelectedId!, signal),
    enabled: open && Boolean(effectiveSelectedId),
  });
  const create = useMutation({
    mutationFn: () => createAiConversation(),
    onSuccess: (conversation) => {
      setSelectedId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: ["ai-chat", "conversations"] });
    },
  });
  const remove = useMutation({
    mutationFn: (conversationId: string) => deleteAiConversation(conversationId),
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ["ai-chat", "conversations"] });
    },
  });

  useEffect(() => {
    const items = conversations.data ?? [];
    if (open && conversations.isSuccess && !items.length && !autoCreated.current) {
      autoCreated.current = true;
      create.mutate();
    }
  }, [conversations.data, conversations.isSuccess, create, open]);

  useEffect(() => {
    if (!active?.streaming) return;
    const controller = new AbortController();
    void subscribeAiRun(active.record.run.id, {
      signal: controller.signal,
      onEvent: (event) => {
        if (event.type === "message.delta") {
          setActive((current) => current ? { ...current, content: current.content + event.delta } : current);
        } else if (event.type === "evidence.updated") {
          setActive((current) => current ? { ...current, evidence: upsertEvidence(current.evidence, event.evidence) } : current);
        } else if (event.type === "run.completed" || event.type === "run.stopped") {
          setActive((current) => current ? {
            ...current,
            message: event.message,
            content: event.message.content,
            streaming: false,
          } : current);
          void refresh(queryClient, effectiveSelectedId);
        } else if (event.type === "run.failed") {
          setActive((current) => current ? { ...current, streaming: false, error: true } : current);
          void refresh(queryClient, effectiveSelectedId);
        }
      },
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setActive((current) => current ? { ...current, streaming: false, error: true } : current);
        void refresh(queryClient, effectiveSelectedId);
      }
    });
    return () => controller.abort();
  }, [active?.record.run.id, active?.streaming, effectiveSelectedId, queryClient]);

  const visibleMessages = mergeMessages(messages.data ?? [], active);
  const unavailable = health.data?.available === false;

  const send = async (content: string) => {
    if (!effectiveSelectedId) return;
    setRequestError(null);
    setSending(true);
    try {
      const record = await startAiRun(effectiveSelectedId, content);
      setActive({ record, content: "", evidence: [], streaming: true, error: false });
    } catch (error) {
      setRequestError(
        error instanceof AiChatClientError ? error.errorCode : "AI_RUN_FAILED",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-full max-w-full gap-0 p-0 sm:w-[440px] sm:max-w-[min(440px,100vw)]">
        <SheetHeader className="shrink-0 border-b pr-14">
          <SheetTitle>{t("aiChat.title")}</SheetTitle>
          <SheetDescription>{t("aiChat.description")}</SheetDescription>
          <SheetClose asChild>
            <Button aria-label={t("aiChat.close")} className="absolute right-4 top-4" size="icon-sm" variant="ghost"><X /></Button>
          </SheetClose>
        </SheetHeader>
        <ConversationList
          conversations={conversations.data ?? []}
          selectedId={effectiveSelectedId}
          creating={create.isPending}
          onCreate={() => create.mutate()}
          onDelete={(id) => remove.mutate(id)}
          onSelect={(id) => { setSelectedId(id); setActive(null); }}
        />
        {unavailable ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-8 text-center text-sm text-muted-foreground">{t("aiChat.serviceUnavailable")}</div>
        ) : (
          <MessageList messages={visibleMessages} evidence={active?.evidence ?? []} />
        )}
        {active?.error && (
          <div className="flex items-center justify-between gap-2 px-4 pb-2 text-sm text-destructive">
            <span>{t("aiChat.streamInterrupted")}</span>
            <Button size="sm" variant="outline" onClick={() => void send(active.record.userMessage.content)}>{t("aiChat.retry")}</Button>
          </div>
        )}
        {requestError && !active?.error && (
          <div className="px-4 pb-2 text-sm text-destructive">
            {t(requestError === "AI_CONVERSATION_BUSY" ? "aiChat.conversationBusy" : requestError === "AI_SERVICE_UNAVAILABLE" ? "aiChat.serviceUnavailable" : "aiChat.runFailed")}
          </div>
        )}
        <ChatComposer
          streaming={active?.streaming ?? false}
          disabled={!effectiveSelectedId || unavailable || sending}
          onSend={(content) => void send(content)}
          onStop={() => active && void stopAiRun(active.record.run.id).then(() => {
            setActive((current) => current ? { ...current, streaming: false } : current);
            return refresh(queryClient, effectiveSelectedId);
          })}
        />
      </SheetContent>
    </Sheet>
  );
}

function mergeMessages(messages: AiMessage[], active: ActiveRun | null): AiMessage[] {
  if (!active) return messages;
  const byId = new Map(messages.map((message) => [message.id, message]));
  byId.set(active.record.userMessage.id, active.record.userMessage);
  byId.set(active.record.assistantMessage.id, {
    ...(active.message ?? active.record.assistantMessage),
    content: active.content,
    status: active.streaming ? "streaming" : active.error ? "failed" : "completed",
  });
  return [...byId.values()].sort((left, right) => left.sequence - right.sequence);
}

function upsertEvidence(items: AiQueryEvidence[], evidence: AiQueryEvidence) {
  return [...items.filter((item) => item.id !== evidence.id), evidence];
}

async function refresh(queryClient: ReturnType<typeof useQueryClient>, conversationId: string | null) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["ai-chat", "conversations"] }),
    queryClient.invalidateQueries({ queryKey: ["ai-chat", "messages", conversationId] }),
  ]);
}
