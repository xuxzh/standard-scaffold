import { Bot } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AiChatSheet } from "./ai-chat-sheet";

export function AiChatTrigger() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t("aiChat.trigger")}
            size="icon-sm"
            variant="ghost"
            onClick={() => setOpen(true)}
          >
            <Bot />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("aiChat.trigger")}</TooltipContent>
      </Tooltip>
      <AiChatSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
