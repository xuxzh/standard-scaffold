import { Send, Square } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

type ChatComposerProps = {
  streaming: boolean;
  disabled: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
};

export function ChatComposer({ streaming, disabled, onSend, onStop }: ChatComposerProps) {
  const { t } = useTranslation("common");
  const [content, setContent] = useState("");
  const canSend = !disabled && !streaming && Boolean(content.trim());

  const submit = () => {
    const value = content.trim();
    if (!value || !canSend) return;
    setContent("");
    onSend(value);
  };

  return (
    <div className="shrink-0 border-t p-4">
      <InputGroup data-disabled={disabled || streaming || undefined}>
        <InputGroupTextarea
          aria-label={t("aiChat.inputLabel")}
          disabled={disabled || streaming}
          placeholder={t("aiChat.placeholder")}
          rows={2}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-end">
          {streaming ? (
            <InputGroupButton aria-label={t("aiChat.stop")} size="icon-sm" variant="destructive" onClick={onStop}>
              <Square />
            </InputGroupButton>
          ) : (
            <InputGroupButton aria-label={t("aiChat.send")} disabled={!canSend} size="icon-sm" onClick={submit}>
              <Send />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
