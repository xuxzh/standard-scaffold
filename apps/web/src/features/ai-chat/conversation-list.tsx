import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AiConversation } from "./ai-chat-contract";

type ConversationListProps = {
  conversations: AiConversation[];
  selectedId: string | null;
  creating: boolean;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  creating,
  onCreate,
  onDelete,
  onSelect,
}: ConversationListProps) {
  const { t } = useTranslation("common");

  return (
    <section aria-label={t("aiChat.history")} className="flex shrink-0 flex-col gap-2 border-b px-4 pb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t("aiChat.history")}</span>
        <Button
          aria-label={t("aiChat.newConversation")}
          disabled={creating}
          size="icon-xs"
          variant="ghost"
          onClick={onCreate}
        >
          <Plus />
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="flex shrink-0 items-center rounded-md border bg-background">
            <Button
              className={cn("max-w-48 justify-start", selectedId === conversation.id && "bg-accent")}
              size="sm"
              variant="ghost"
              onClick={() => onSelect(conversation.id)}
            >
              <MessageSquare data-icon="inline-start" />
              <span className="truncate">{conversation.title}</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button aria-label={t("aiChat.deleteConversation", { title: conversation.title })} size="icon-xs" variant="ghost">
                  <Trash2 />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("aiChat.deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("aiChat.deleteConfirmDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("confirmDelete.cancel")}</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={() => onDelete(conversation.id)}>
                      {t("confirmDelete.delete")}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </section>
  );
}
