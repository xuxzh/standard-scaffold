import { ChevronDown, Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { AiMessage, AiQueryEvidence } from "./ai-chat-contract";

export function MessageList({ messages, evidence }: { messages: AiMessage[]; evidence: AiQueryEvidence[] }) {
  const { t } = useTranslation("common");

  if (!messages.length) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-8 text-center text-sm text-muted-foreground">
        {t("aiChat.empty")}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4" aria-live="polite">
      {messages.map((message) => (
        <article
          key={message.id}
          className={cn(
            "max-w-[90%] rounded-lg px-3 py-2 text-sm",
            message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto border bg-muted/40",
          )}
        >
          {message.role === "assistant" ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              components={{ pre: ({ children }) => <pre className="max-w-full overflow-x-auto">{children}</pre> }}
            >
              {message.content || t("aiChat.generating")}
            </ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </article>
      ))}
      {evidence.length > 0 && <EvidenceList evidence={evidence} />}
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: AiQueryEvidence[] }) {
  const { t } = useTranslation("common");
  return (
    <Collapsible className="border-l-2 border-muted pl-3">
      <CollapsibleTrigger asChild>
        <Button size="sm" variant="ghost">
          <Database data-icon="inline-start" />
          {t("aiChat.evidence")}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 pt-2">
        {evidence.map((item) => (
          <section key={item.id} className="flex flex-col gap-2 text-xs text-muted-foreground">
            <div>{item.companyCode} / {item.factoryCode} · {item.status}</div>
            <div>{t("aiChat.evidenceMeta", { rows: item.rowCount ?? "—", duration: item.durationMs ?? "—" })}</div>
            {(item.timeRangeStart || item.timeRangeEnd) && (
              <div>{t("aiChat.timeRange", { start: item.timeRangeStart ?? "—", end: item.timeRangeEnd ?? "—" })}</div>
            )}
            {item.dataCutoffAt && <div>{t("aiChat.dataCutoff", { value: item.dataCutoffAt })}</div>}
            {item.truncated && <div>{t("aiChat.truncated")}</div>}
            <pre className="max-w-full overflow-x-auto rounded-md bg-muted p-2 text-foreground">{item.sql}</pre>
          </section>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
